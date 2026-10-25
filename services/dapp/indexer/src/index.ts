console.log('🚀 indexer worker started');

interface Job {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  priority?: number;
  timestamp?: string;
}

const CONFIG = {
  pollIntervalMs: parseInt(process.env.WORKER_POLL_INTERVAL || '5000'),
  maxRetries: parseInt(process.env.WORKER_MAX_RETRIES || '3'),
  batchSize: parseInt(process.env.WORKER_BATCH_SIZE || '10'),
};

async function processJob(job: Job): Promise<void> {
  console.log('[Worker] Processing job:', job.id, 'type:', job.type);

  // Add job processing logic here using job.payload

  await new Promise(resolve => setTimeout(resolve, 1000));
  console.log('[Worker] Job completed:', job.id);
}

let demoJobSent = false;

async function fetchJobs(): Promise<Job[]> {
  // Connect to your queue (Redis, RabbitMQ, etc.) and fetch jobs.
  // Until you do, hand out one demo job on the first poll so the loop runs end to end; remove this with the queue.
  if (demoJobSent) return [];
  demoJobSent = true;
  return [{ id: 'demo-1', type: 'demo', payload: {} }];
}

async function main() {
  console.log('[Worker] Configuration:', CONFIG);

  while (true) {
    try {
      const jobs = await fetchJobs();

      if (jobs.length === 0) {
        await new Promise(resolve => setTimeout(resolve, CONFIG.pollIntervalMs));
        continue;
      }

      console.log(`[Worker] Fetched ${jobs.length} jobs`);

      for (const job of jobs) {
        try {
          await processJob(job);
        } catch (error: unknown) {
          console.error('[Worker] Job failed:', error);
        }
      }
    } catch (error: unknown) {
      console.error('[Worker] Error in main loop:', error);
      // Wait before retrying to avoid tight error loops
      await new Promise(resolve => setTimeout(resolve, CONFIG.pollIntervalMs));
    }
  }
}

process.on('SIGTERM', () => {
  console.log('[Worker] SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('[Worker] SIGINT received, shutting down gracefully...');
  process.exit(0);
});

main().catch((err) => {
  console.error('[Worker] Fatal error:', err);
  process.exit(1);
});
