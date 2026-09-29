// ============================================================================
// Voice & Quick Capture Route Handlers
// ============================================================================

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { transcribeAudio } from '../voice/stt';
import { synthesizeSpeech } from '../voice/tts';
import { routeQuickCapture } from '../voice/quickCaptureRouter';

export async function voiceRoutes(fastify: FastifyInstance) {
  // 1. POST /api/voice/transcribe - Speech-to-Text
  fastify.post('/transcribe', async (request: FastifyRequest<{
    Body: {
      audio_base64?: string;
      mime_type?: string;
      language?: string;
    };
  }>, reply: FastifyReply) => {
    const userId = request.user?.id;
    if (!userId) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    try {
      let audioBuffer: Buffer | undefined;
      let mimeType = request.body?.mime_type || 'audio/m4a';

      // Check if multipart file was sent
      if (request.isMultipart && request.isMultipart()) {
        const data = await request.file();
        if (data) {
          audioBuffer = await data.toBuffer();
          mimeType = data.mimetype;
        }
      }

      if (!audioBuffer && !request.body?.audio_base64) {
        return reply.status(400).send({ error: 'audio_base64 or multipart audio file required' });
      }

      const result = await transcribeAudio({
        audioBuffer,
        audioBase64: request.body?.audio_base64,
        mimeType,
        language: request.body?.language,
      });

      return reply.send(result);
    } catch (err: any) {
      request.log.error(err, 'Audio transcription error');
      return reply.status(500).send({ error: err.message });
    }
  });

  // 2. POST /api/voice/synthesize - Text-to-Speech
  fastify.post('/synthesize', async (request: FastifyRequest<{
    Body: {
      text: string;
      voice?: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';
      speed?: number;
    };
  }>, reply: FastifyReply) => {
    const userId = request.user?.id;
    if (!userId) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    const { text, voice, speed } = request.body || {};
    if (!text) {
      return reply.status(400).send({ error: 'Text is required for voice synthesis' });
    }

    try {
      const result = await synthesizeSpeech({
        text,
        voice,
        speed,
      });

      return reply.send(result);
    } catch (err: any) {
      request.log.error(err, 'Speech synthesis error');
      return reply.status(500).send({ error: err.message });
    }
  });

  // 3. POST /api/voice/quick-capture - Voice / Text Brain Dump Router
  fastify.post('/quick-capture', async (request: FastifyRequest<{
    Body: {
      input?: string;
      audio_base64?: string;
    };
  }>, reply: FastifyReply) => {
    const userId = request.user?.id;
    if (!userId) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    try {
      let rawText = (request.body?.input || '').trim();

      // If audio was provided without pre-transcription, transcribe first
      if (!rawText && request.body?.audio_base64) {
        const transResult = await transcribeAudio({
          audioBase64: request.body.audio_base64,
        });
        rawText = transResult.text;
      }

      if (!rawText) {
        return reply.status(400).send({ error: 'Either input text or audio_base64 is required' });
      }

      const captureResult = await routeQuickCapture(userId, rawText);
      return reply.send({ result: captureResult });
    } catch (err: any) {
      request.log.error(err, 'Quick capture error');
      return reply.status(500).send({ error: err.message });
    }
  });
}
