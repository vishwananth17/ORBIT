import { FastifyRequest, FastifyReply } from 'fastify';
import { createClient } from '@supabase/supabase-js';
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
  if (config.DEMO_MODE && config.NODE_ENV === 'development' && (!authHeader || authHeader === 'Bearer dev-token')) {
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
    // Validate against the auth provider, including revoked/expired sessions.
    const supabase = createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY,
      { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) throw new Error('Invalid authentication session');
    const decoded = data.user;
    const user: AuthenticatedUser = {
      id: decoded.id, email: decoded.email || '', role: 'authenticated',
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
