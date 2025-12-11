import { Queue } from 'bullmq';
import IORedis from 'ioredis';

const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379');

export const audioQueue = new Queue('audio-processing', { connection });

export async function addAudioJob(sessionId: string, fileKey: string) {
  await audioQueue.add('process-audio', {
    type: 'FILE_UPLOAD',
    sessionId,
    fileKey,
  });
}

export async function addUrlJob(sessionId: string, url: string) {
  await audioQueue.add('process-audio', {
    type: 'URL',
    sessionId,
    url,
  });
}
