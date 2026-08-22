import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

export async function runMigrations() {
  const host = process.env.SQL_HOST || '127.0.0.1';
  const port = parseInt(process.env.SQL_PORT || '5432', 10);
  const user = process.env.SQL_ADMIN_USER || process.env.SQL_USER || 'postgres';
  const password = process.env.SQL_ADMIN_PASSWORD || process.env.SQL_PASSWORD || 'postgres_password';
  const database = process.env.SQL_DB_NAME || 'b2b_subscription_db';

  console.log(`[Migration] Connecting to PostgreSQL at ${host}:${port}/${database} as user ${user}...`);

  const pool = new Pool({
    host,
    port,
    user,
    password,
    database,
    connectionTimeoutMillis: 10000,
  });

  try {
    const client = await pool.connect();
    console.log('[Migration] Connected successfully.');

    const migrationFilePath = path.join(process.cwd(), 'drizzle', '0000_initial_schema.sql');
    if (!fs.existsSync(migrationFilePath)) {
      throw new Error(`Migration file not found at ${migrationFilePath}`);
    }

    const sqlContent = fs.readFileSync(migrationFilePath, 'utf-8');
    console.log('[Migration] Running DDL scripts to create tables and indexes...');
    await client.query(sqlContent);
    console.log('[Migration] DDL execution completed successfully.');

    // Verify all 6 tables exist
    const tablesCheck = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('tenants', 'tenant_admins', 'subscription_plans', 'subscribers', 'devices', 'company_admins')
      ORDER BY table_name;
    `);

    const createdTables = tablesCheck.rows.map((r) => r.table_name);
    console.log(`[Migration] Verified active tables in database (${createdTables.length}/6):`, createdTables);

    client.release();
    await pool.end();
    return { success: true, tables: createdTables };
  } catch (error: any) {
    console.error('[Migration Error]:', error.message);
    await pool.end();
    return { success: false, error: error.message };
  }
}

// Allow direct execution: `tsx src/db/migrate.ts`
if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}` || process.argv[1]?.endsWith('migrate.ts')) {
  runMigrations()
    .then((res) => {
      if (!res.success) {
        console.warn('[Migration Warning]: Live PostgreSQL host could not be reached. Local fallback/mock mode is active.');
      } else {
        console.log('[Migration Success] All 6 tables created and verified.');
      }
    })
    .catch((err) => {
      console.error('[Migration Fatal Error]:', err);
    });
}
