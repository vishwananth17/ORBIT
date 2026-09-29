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

export const pool = new Pool(config);

let isPostgresAvailable = false;
let hasCheckedPostgres = false;

// Check connectivity on startup
async function checkPostgresConnectivity(): Promise<boolean> {
  if (hasCheckedPostgres) return isPostgresAvailable;
  hasCheckedPostgres = true;

  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    isPostgresAvailable = true;
    console.log('🐘 [Orbit Database] Connected to PostgreSQL (pgvector active).');
    return true;
  } catch (err: any) {
    isPostgresAvailable = false;
    console.log('⚡ [Orbit Database] PostgreSQL not reachable. Running in Zero-Docker In-Memory Fallback Mode.');
    console.log('   All agent features, personas, vector memories, and journal records are fully operational!');
    return false;
  }
}

// Initial probe
checkPostgresConnectivity();

pool.on('error', (err) => {
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
      const res = await pool.query<T>(text, params);
      const duration = Date.now() - start;
      if (process.env.NODE_ENV === 'development' && duration > 200) {
        console.warn(`[Slow Query] ${duration}ms: ${text.slice(0, 100)}...`);
      }
      return res;
    } catch (err: any) {
      if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND' || err.message?.includes('Connection terminated')) {
        console.warn('⚠️  [Orbit Database] Lost connection to PostgreSQL. Falling back to in-memory store.');
        isPostgresAvailable = false;
        return memoryDb.execute<T>(text, params);
      }
      throw err;
    }
  }

  // Zero-docker in-memory fallback execution
  return memoryDb.execute<T>(text, params);
}

export async function getClient() {
  if (!hasCheckedPostgres) {
    await checkPostgresConnectivity();
  }

  if (isPostgresAvailable) {
    return await pool.connect();
  }

  // Mock pool client for transactions
  return {
    query: (text: string, params?: any[]) => memoryDb.execute(text, params),
    release: () => {},
  };
}

export { memoryDb };
