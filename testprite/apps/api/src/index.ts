import express from 'express';
import cors from 'cors';
import { prisma } from './lib/prisma';
import { Queue } from 'bullmq';

const app = express();
app.use(cors());
app.use(express.json());

const redisConnection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  maxRetriesPerRequest: null,
};
const testQueue = new Queue('test-generation', { connection: redisConnection });

app.post('/api/v1/projects/:id/tests', async (req, res) => {
  try {
    const projectId = req.params.id;
    const { name, source, nl_description, settings } = req.body;

    if (!name || !source) {
      return res.status(400).json({ error: 'Missing required fields: name, source' });
    }

    // Since auth and strict projects are omitted for MVP, we mock the author
    // and optionally create the project if it doesn't exist for the UI to work smoothly
    let project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) {
        // Fallback for MVP: create a dummy project so the frontend flow works unconditionally
        const dummyUser = await prisma.user.create({
            data: { email: `mock-${Date.now()}@testprite.com`, name: 'Mock User' }
        });
        project = await prisma.project.create({
            data: { id: projectId, name: 'Default Project', ownerId: dummyUser.id }
        });
    }

    const authorId = project.ownerId;

    // Create the test record
    const test = await prisma.test.create({
      data: {
        projectId,
        name,
        authorId,
        source: {
          type: source,
          description: nl_description,
          settings,
          status: 'pending_generation'
        }
      }
    });

    // If source is 'nl' (natural language), queue it for the authoring agent
    if (source === 'nl') {
      await testQueue.add('generate-test', {
        testId: test.id,
        nl_description,
        settings
      });
      console.log(`[Queue Mock] Added test ${test.id} to generation queue.`);
    }

    return res.status(201).json(test);
  } catch (error) {
    console.error('Error creating test:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`API server running on port ${PORT}`);
});
