import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { config } from './config';
import { authenticate } from './middleware/auth';
import { chatRoutes } from './routes/chat';
import { conversationRoutes } from './routes/conversations';
import { userRoutes } from './routes/user';
import { memoryRoutes } from './routes/memory';
import { taskRoutes } from './routes/tasks';
import { actionRoutes } from './routes/actions';
import { integrationRoutes, googleCallbackRoutes } from './routes/integrations';
import multipart from '@fastify/multipart';
import { briefsRoutes } from './routes/briefs';
import { notificationsRoutes } from './routes/notifications';
import { voiceRoutes } from './routes/voice';
import { agentsRoutes } from './routes/agents';
import { journalRoutes } from './routes/journal';
import { startProactiveScheduler, stopProactiveScheduler } from './proactivity/scheduler';
import { pool } from './db';

const server = Fastify({
  logger: {
    level: config.LOG_LEVEL,
  },
});

async function main() {
  // 1. Security Plugins
  await server.register(cors, {
    origin: config.FRONTEND_URL, // Explicit web origin; native clients do not need CORS
    credentials: true,
  });

  await server.register(helmet, {
    contentSecurityPolicy: false, // Mobile API backend
  });

  await server.register(rateLimit, {
    max: 120,
    timeWindow: '1 minute',
  });

  await server.register(multipart, {
    limits: {
      fileSize: 25 * 1024 * 1024,
    },
  });

  // 2. Health Check
  server.get('/health', async () => {
    return {
      status: 'ok',
      service: 'orbit-backend',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    };
  });

  await server.register(googleCallbackRoutes, { prefix: '/oauth' });

  // 3. Register Protected API Routes
  await server.register(
    async (api) => {
      // Apply Supabase authentication hook to all /api routes
      api.addHook('preHandler', authenticate);

      await api.register(chatRoutes, { prefix: '/chat' });
      await api.register(conversationRoutes, { prefix: '/conversations' });
      await api.register(userRoutes, { prefix: '/user' });
      await api.register(memoryRoutes, { prefix: '/memories' });
      await api.register(taskRoutes, { prefix: '/tasks' });
      await api.register(actionRoutes, { prefix: '/actions' });
      await api.register(integrationRoutes, { prefix: '/integrations' });
      await api.register(briefsRoutes, { prefix: '/briefs' });
      await api.register(notificationsRoutes, { prefix: '/notifications' });
      await api.register(voiceRoutes, { prefix: '/voice' });
      await api.register(agentsRoutes, { prefix: '/agents' });
      await api.register(journalRoutes, { prefix: '/journal' });
    },
    { prefix: '/api' }
  );

  // 4. Start Proactive Background Scheduler (BullMQ + Cron)
  startProactiveScheduler();

  // 5. Graceful Shutdown
  const signals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM'];
  for (const signal of signals) {
    process.on(signal, async () => {
      server.log.info(`Received ${signal}, shutting down gracefully...`);
      await stopProactiveScheduler();
      await server.close();
      await pool.end();
      process.exit(0);
    });
  }

  // 5. Start Server
  try {
    const address = await server.listen({
      port: config.PORT,
      host: config.HOST,
    });
    console.log(`\n🚀 [Orbit Backend] Server running at ${address}`);
    console.log(`📡 [Health Check] ${address}/health`);
    console.log(`💬 [Chat Stream] ${address}/api/chat/stream`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}

main();
