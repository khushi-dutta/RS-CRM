import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';
import { Queue } from 'bullmq';

export const prisma = new PrismaClient();

// Add global middleware to sync changes up to frontend instantaneously
prisma.$use(async (params, next) => {
  const result = await next(params);
  
  if (['update', 'upsert', 'delete'].includes(params.action)) {
    if (params.model === 'Customer' || params.model === 'Lead') {
      try {
        const { broadcastEntityUpdate } = require('./socket');
        const entityId = result?.id;
        if (entityId) {
          // Fire-and-forget sync
          broadcastEntityUpdate(params.model.toUpperCase(), entityId);
        }
      } catch (e) {
        // Do not crash the app tracking socket broadcast 
      }
    }
  }

  return result;
});

type QueueLike = {
  add: (name: string, data: unknown, opts?: any) => Promise<any>;
};

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const redisEnabled = process.env.DISABLE_REDIS !== 'true';

export let redis: Redis | null = null;
export let redisAvailable = false;

if (redisEnabled) {
  const client = new Redis(REDIS_URL, {
    lazyConnect: true,
    maxRetriesPerRequest: null,
    retryStrategy: () => null,
  });

  client.on('ready', () => {
    redisAvailable = true;
  });

  client.on('error', () => {
    redisAvailable = false;
  });

  client.connect().catch(() => {
    redisAvailable = false;
  });

  redis = client;
}

const noopQueue: QueueLike = {
  async add(_name: string, _data: unknown, _opts?: any) {
    return null;
  },
};

export const emailQueue: QueueLike = redis ? new Queue('email-campaigns', { connection: redis }) : noopQueue;
export const whatsappQueue: QueueLike = redis ? new Queue('whatsapp-campaigns', { connection: redis }) : noopQueue;
