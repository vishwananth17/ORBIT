// ============================================================================
// Text-to-Speech (TTS) Service - OpenAI TTS API
// Synthesizes voice audio for Orbit briefings and agent voice feedback
// ============================================================================

import { VoiceSynthesisResult } from '@orbit/shared';

export interface SynthesizeSpeechOptions {
  text: string;
  voice?: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';
  speed?: number;
}

export async function synthesizeSpeech(options: SynthesizeSpeechOptions): Promise<VoiceSynthesisResult> {
  const { text, voice = 'nova', speed = 1.0 } = options;

  if (!text || !text.trim()) {
    throw new Error('Text must not be empty');
  }

  const apiKey = process.env.OPENAI_API_KEY;
  const isMock = !apiKey || apiKey.includes('mock') || apiKey === 'dev-key';

  if (!isMock) {
    try {
      const response = await fetch('https://api.openai.com/v1/audio/speech', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'tts-1',
          input: text,
          voice,
          speed,
          response_format: 'mp3',
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenAI TTS error (${response.status}): ${errorText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const base64Audio = Buffer.from(arrayBuffer).toString('base64');

      return {
        audio_base64: base64Audio,
        format: 'mp3',
      };
    } catch (err: any) {
      console.warn(`[TTS] TTS synthesis error, using fallback:`, err.message);
    }
  }

  // Fallback: minimal valid MP3 frame payload encoded in base64
  console.log(`[TTS] Generating fallback simulated speech for: "${text.slice(0, 30)}..."`);
  // Standard MPEG-1 Layer 3 sync header sequence (silent MP3 chunk)
  const dummyMp3Header = Buffer.from([
    0xff, 0xfb, 0x90, 0x64, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  ]);

  return {
    audio_base64: dummyMp3Header.toString('base64'),
    format: 'mp3',
  };
}
