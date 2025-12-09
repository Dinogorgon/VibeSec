import { Queue, Worker } from 'bullmq';
import { Redis } from 'ioredis';
import { config } from '../config/env.js';
import { scanRepository } from './scanner.js';
import { getWsClients } from '../websocket/scanUpdates.js';

// BullMQ requires maxRetriesPerRequest to be null for blocking commands
const redis = new Redis(config.redisUrl, {
  maxRetriesPerRequest: null,
  retryStrategy: (times: number) => {
    // Exponential backoff: 50ms, 100ms, 200ms, 400ms, 800ms, max 3000ms
    const delay = Math.min(50 * Math.pow(2, times - 1), 3000);
    console.log(`Redis retry attempt ${times}, waiting ${delay}ms`);
    return delay;
  },
  reconnectOnError: (err: Error) => {
    const errorMessage = err.message.toLowerCase();
    // Reconnect on connection errors
    if (errorMessage.includes('econnreset') || 
        errorMessage.includes('econnrefused') ||
        errorMessage.includes('read econnreset')) {
      console.warn('Redis connection error (will reconnect):', err.message);
      return true;
    }
    return false;
  },
});

// Redis event handlers for better debugging
redis.on('connect', () => {
  console.log('Redis: Connected');
});

redis.on('ready', () => {
  console.log('Redis: Ready');
});

redis.on('error', (err: Error) => {
  const errorCode = (err as any).code;
  const errorMessage = err.message.toLowerCase();
  
  // Suppress ECONNRESET - these are recoverable and handled by reconnectOnError
  if (errorCode === 'ECONNRESET' || errorMessage.includes('econnreset') ||
      errorMessage.includes('read econnreset')) {
    // Only log in development
    if (config.nodeEnv === 'development') {
      console.warn('Redis connection reset (recoverable):', err.message);
    }
    return; // Don't log as error, reconnectOnError will handle it
  }
  
  // Log other errors
  console.error('Redis error:', err);
});

redis.on('close', () => {
  console.log('Redis: Connection closed');
});

redis.on('reconnecting', () => {
  console.log('Redis: Reconnecting...');
});

export const scanQueue = new Queue('scans', {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  },
});

export function startScanWorker(): void {
  const worker = new Worker(
    'scans',
    async (job) => {
      const { repoUrl, userId, githubToken, scanId } = job.data;
      
      console.log(`Processing scan job ${job.id} for scan ${scanId}`);
      
      const wsClients = getWsClients();
      await scanRepository(repoUrl, userId, githubToken, scanId, wsClients);
      
      return { success: true };
    },
    {
      connection: redis,
      concurrency: 5, // Process up to 5 scans concurrently
    }
  );

  worker.on('completed', (job) => {
    console.log(`Scan job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    console.error(`Scan job ${job?.id} failed:`, err);
  });
}

