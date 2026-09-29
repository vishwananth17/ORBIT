import * as fs from 'fs';
import * as path from 'path';
import { pool } from './client';

export async function runMigrations() {
  console.log('[Orbit Database] Running migrations...');
  const migrationsDir = path.join(__dirname, '../migrations');
  
  if (!fs.existsSync(migrationsDir)) {
    console.error('[Orbit Database] Migrations directory not found:', migrationsDir);
    process.exit(1);
  }

  const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();

  for (const file of files) {
    console.log(`[Orbit Database] Applying migration: ${file}`);
    const filePath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(filePath, 'utf-8');

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('COMMIT');
      console.log(`[Orbit Database] Successfully applied: ${file}`);
    } catch (err: any) {
      await client.query('ROLLBACK');
      console.error(`[Orbit Database] Migration error in ${file}:`, err.message);
      throw err;
    } finally {
      client.release();
    }
  }

  console.log('[Orbit Database] All migrations completed successfully.');
}

if (require.main === module) {
  runMigrations()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
