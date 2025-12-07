import { Queue, Worker } from 'bullmq';
import { Redis } from 'ioredis';
import { config } from '../config/env.js';
import { scanRepository } from './scanner.js';
import { getWsClients } from '../websocket/scanUpdates.js';

// BullMQ requires maxRetriesPerRequest to be null for blocking commands
const redis = new Redis(config.redisUrl, {
  maxRetriesPerRequest: null,
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

