// ============================================================================
// Orbit Database Client with Zero-Docker In-Memory Fallback
// ============================================================================

import { Pool, PoolConfig, QueryResult, QueryResultRow } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { memoryDb } from './memoryDb';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config();

const config: PoolConfig = {
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/orbit_db',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000, // Fast 2s timeout for seamless local fallback
};

export const rawPool = new Pool(config);

let isPostgresAvailable = false;
let hasCheckedPostgres = false;

// Check connectivity on startup
async function checkPostgresConnectivity(): Promise<boolean> {
  if (hasCheckedPostgres) return isPostgresAvailable;
  hasCheckedPostgres = true;

  try {
    const client = await rawPool.connect();
    await client.query('SELECT 1');
    client.release();
    isPostgresAvailable = true;
    console.log('🐘 [Orbit Database] Connected to PostgreSQL (pgvector active).');
    return true;
  } catch (err: any) {
    isPostgresAvailable = false;
    console.warn('[Orbit Database] PostgreSQL unavailable. Only explicit demo/test mode permits temporary in-memory data.');
    return false;
  }
}

// Initial probe
checkPostgresConnectivity();

rawPool.on('error', (err) => {
  if (isPostgresAvailable) {
    console.warn('[Orbit Database Pool Error]:', err.message);
  }
});

export async function query<T extends QueryResultRow = any>(
  text: string,
  params?: any[]
): Promise<QueryResult<T>> {
  if (!hasCheckedPostgres) {
    await checkPostgresConnectivity();
  }

  if (isPostgresAvailable) {
    try {
      const start = Date.now();
      const res = await rawPool.query<T>(text, params);
      const duration = Date.now() - start;
      if (process.env.NODE_ENV === 'development' && duration > 200) {
        console.warn(`[Slow Query] ${duration}ms: ${text.slice(0, 100)}...`);
      }
      return res;
    } catch (err: any) {
      if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND' || err.message?.includes('Connection terminated')) {
        console.warn('⚠️  [Orbit Database] Lost connection to PostgreSQL. Falling back to in-memory store.');
        isPostgresAvailable = false;
        throw new Error('Persistent database connection lost. Operation failed.');
      }
      throw err;
    }
  }

  if (process.env.DEMO_MODE !== 'true' && process.env.NODE_ENV !== 'test') {
    throw new Error('Persistent database unavailable. Nothing was saved.');
  }
  // Explicit demo/test mode only
  return memoryDb.execute<T>(text, params);
}

export async function getClient() {
  if (!hasCheckedPostgres) {
    await checkPostgresConnectivity();
  }

  if (isPostgresAvailable) {
    try {
      return await rawPool.connect();
    } catch {
      isPostgresAvailable = false;
    }
  }

  if (process.env.DEMO_MODE !== 'true' && process.env.NODE_ENV !== 'test') {
    throw new Error('Persistent database unavailable');
  }
  // Mock pool client for transactions
  return {
    query: <T extends QueryResultRow = any>(text: string, params?: any[]) => memoryDb.execute<T>(text, params),
    release: () => {},
  };
}

// Universal Pool proxy ensuring pool.query() routes through query() fallback
export const pool = {
  query: <T extends QueryResultRow = any>(text: string, params?: any[]) => query<T>(text, params),
  connect: () => getClient(),
  end: () => rawPool.end().catch(() => {}),
  on: (event: any, handler: any) => (rawPool as any).on(event, handler),
} as unknown as Pool;

export { memoryDb };
