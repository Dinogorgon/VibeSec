import pg from 'pg';
import { config } from './env.js';

const { Pool } = pg;

export const pool = new Pool({
  connectionString: config.databaseUrl,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000, // Increased timeout for IPv6/DNS resolution
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
});

pool.on('error', (err: Error) => {
  const errorCode = (err as any).code;
  const errorMessage = err.message;
  
  // ECONNRESET and ECONNREFUSED are recoverable - connection pool will handle reconnection
  if (errorCode === 'ECONNRESET' || errorCode === 'ECONNREFUSED') {
    // Suppress these - they're handled by the pool
    // Only log in development for debugging
    if (config.nodeEnv === 'development') {
      console.warn('Database connection error (recoverable):', errorCode);
    }
    return; // Don't exit process, let pool handle reconnection
  }
  
  // Critical errors that might require process restart
  if (errorCode === 'ENOTFOUND' || errorCode === 'ETIMEDOUT') {
    console.error('Database connection error (critical):', errorCode, errorMessage);
    // Still don't exit immediately - let the app try to recover
    // Only exit if this happens repeatedly
  } else {
    console.error('Unexpected database error:', err);
  }
});

export async function query(text: string, params?: any[], retries = 3): Promise<any> {
  const start = Date.now();
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await pool.query(text, params);
      const duration = Date.now() - start;
      if (config.nodeEnv === 'development') {
        console.log('Executed query', { text, duration, rows: res.rowCount });
      }
      return res;
    } catch (error: any) {
      lastError = error;
      const errorCode = error?.code;
      
      // Retry on connection errors
      if (errorCode === 'ECONNRESET' || errorCode === 'ECONNREFUSED') {
        if (attempt < retries) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000); // Exponential backoff, max 5s
          console.warn(`Database query retry ${attempt}/${retries} after ${delay}ms:`, errorCode);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
      }
      
      // Don't retry on other errors
      break;
    }
  }
  
  console.error('Database query error (final):', lastError);
  throw lastError;
}

