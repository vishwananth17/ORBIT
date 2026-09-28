import { FastifyRequest, FastifyReply } from 'fastify';
import * as jwt from 'jsonwebtoken';
import { config } from '../config';
import { ensureUserExists } from '../db';

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: string;
}

declare module 'fastify' {
  interface FastifyRequest {
    user: AuthenticatedUser;
  }
}

const DEV_USER_ID = '00000000-0000-0000-0000-000000000001';

export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  const authHeader = request.headers.authorization;

  // Development bypass / default fallback when testing locally
  if (config.NODE_ENV === 'development' && (!authHeader || authHeader === 'Bearer dev-token')) {
    const devUser: AuthenticatedUser = {
      id: DEV_USER_ID,
      email: 'dev@orbit.ai',
      role: 'authenticated',
    };
    try {
      await ensureUserExists(devUser.id, devUser.email, 'Dev User');
    } catch {
      // If DB is offline during offline tests, still populate request.user
    }
    request.user = devUser;
    return;
  }

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return reply.status(401).send({
      statusCode: 401,
      error: 'Unauthorized',
      message: 'Missing or malformed Authorization header',
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    // Decode and verify JWT
    // Supabase sign tokens with SUPABASE_JWT_SECRET
    const decoded = jwt.verify(token, config.SUPABASE_JWT_SECRET, { algorithms: ['HS256'] }) as any;

    const user: AuthenticatedUser = {
      id: decoded.sub,
      email: decoded.email || `${decoded.sub}@user.orbit.ai`,
      role: decoded.role || 'authenticated',
    };

    // Ensure user record exists in database
    await ensureUserExists(user.id, user.email, decoded.user_metadata?.full_name || 'Orbit User');

    request.user = user;
  } catch (err: any) {
    request.log.warn({ err: err.message }, 'JWT verification failed');
    return reply.status(401).send({
      statusCode: 401,
      error: 'Unauthorized',
      message: 'Invalid or expired authentication token',
    });
  }
}
