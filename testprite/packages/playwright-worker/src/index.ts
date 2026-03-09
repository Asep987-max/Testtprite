import { Worker, Job, Queue } from 'bullmq';
import { exec } from 'child_process';
import util from 'util';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const execAsync = util.promisify(exec);

// Fix BullMQ redis requirement
const redisConnection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  maxRetriesPerRequest: null,
};

// Queue to send analysis requests to orchestrator
const analysisQueue = new Queue('test-analysis', { connection: redisConnection });

const worker = new Worker(
  'test-execution',
  async (job: Job) => {
    const { testId, code, settings } = job.data;
    console.log(`[Execution Fleet] Starting execution for test ${testId}`);

    // Create a temporary file to run the test
    const testDir = path.join(__dirname, '..', 'tmp', testId);
    const testFile = path.join(testDir, 'generated.spec.ts');

    try {
      if (!fs.existsSync(testDir)) {
        fs.mkdirSync(testDir, { recursive: true });
      }

      fs.writeFileSync(testFile, code);

      console.log(`[Execution Fleet] Running Playwright script at ${testFile}`);

      // Execute the test using Playwright
      // For MVP, we run it headlessly
      const { stdout, stderr } = await execAsync(`npx playwright test ${testFile} --reporter=json`);

      console.log(`[Execution Fleet] Execution finished for test ${testId}`);

      return { success: true, testId, logs: stdout };
    } catch (error: any) {
      console.error(`[Execution Fleet] Execution failed for test ${testId}`);

      // On failure, we trigger the Analysis Agent via another queue
      await analysisQueue.add('analyze-failure', {
        testId,
        errorLog: error.message || String(error)
      });

      throw error;
    } finally {
      // Cleanup the temporary file
      if (fs.existsSync(testDir)) {
        fs.rmSync(testDir, { recursive: true, force: true });
      }
    }
  },
  { connection: redisConnection }
);

worker.on('completed', job => {
  console.log(`Job ${job.id} has completed!`);
});

worker.on('failed', (job, err) => {
  console.error(`Job ${job?.id} has failed with ${err.message}`);
});

console.log('Playwright worker started. Listening for "test-execution" jobs...');
