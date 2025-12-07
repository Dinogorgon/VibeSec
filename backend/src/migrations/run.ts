import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import dotenv from 'dotenv';
import pg from 'pg';

// Load .env.local first (if exists), then .env
const envLocalPath = join(process.cwd(), '.env.local');
const envPath = join(process.cwd(), '.env');

if (existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath });
} else if (existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  dotenv.config(); // Fallback to default .env
}

const { Pool } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runMigrations() {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('Error: DATABASE_URL environment variable is not set.');
    console.error('Please create a .env.local or .env file with DATABASE_URL configured.');
    console.error('You can copy .env.example to .env.local and update the values.');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: databaseUrl,
  });

  try {
    const migrationFile = readFileSync(
      join(__dirname, '../../migrations/001_initial.sql'),
      'utf-8'
    );

    await pool.query(migrationFile);
    console.log('Migration completed successfully');
  } catch (error: any) {
    if (error.code === 'ECONNREFUSED') {
      console.error('Error: Could not connect to PostgreSQL database.');
      console.error('Please make sure PostgreSQL is running and DATABASE_URL is correct.');
      console.error('DATABASE_URL format: postgresql://user:password@localhost:5432/database');
    } else {
      console.error('Migration failed:', error.message);
    }
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigrations();

