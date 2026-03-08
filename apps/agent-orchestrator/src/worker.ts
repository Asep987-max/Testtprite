import * as amqp from 'amqplib';

const RABBITMQ_URL = process.env.RABBITMQ_URL;
const EXCHANGE_NAME = 'testprite.events';

async function startWorker() {
  console.log('Starting Agent Orchestrator Worker...');

  if (!RABBITMQ_URL) {
    console.error('RABBITMQ_URL is not defined in environment variables');
    process.exit(1);
  }

  try {
    const connection = await amqp.connect(RABBITMQ_URL);
    const channel = await connection.createChannel();

    await channel.assertExchange(EXCHANGE_NAME, 'topic', { durable: true });

    // Queue for Authoring Agents
    const authoringQueue = await channel.assertQueue('agent.authoring.queue', { durable: true });
    await channel.bindQueue(authoringQueue.queue, EXCHANGE_NAME, 'test.authoring.*');

    // Queue for Analysis Agents
    const analysisQueue = await channel.assertQueue('agent.analysis.queue', { durable: true });
    await channel.bindQueue(analysisQueue.queue, EXCHANGE_NAME, 'test.analysis.*');

    // Queue for Healing Agents
    const healingQueue = await channel.assertQueue('agent.healing.queue', { durable: true });
    await channel.bindQueue(healingQueue.queue, EXCHANGE_NAME, 'test.healing.*');

    // Start consuming for Authoring
    console.log('Waiting for messages in authoring queue...');
    channel.consume(authoringQueue.queue, (msg) => {
      if (msg) {
        console.log(`[Authoring Agent] Received: ${msg.content.toString()}`);
        // TODO: Call LLM and generate Playwright test
        channel.ack(msg);
      }
    });

    // Start consuming for Analysis
    console.log('Waiting for messages in analysis queue...');
    channel.consume(analysisQueue.queue, (msg) => {
      if (msg) {
        console.log(`[Analysis Agent] Received: ${msg.content.toString()}`);
        // TODO: Run failure analysis
        channel.ack(msg);
      }
    });

    // Start consuming for Healing
    console.log('Waiting for messages in healing queue...');
    channel.consume(healingQueue.queue, (msg) => {
      if (msg) {
        console.log(`[Healing Agent] Received: ${msg.content.toString()}`);
        // TODO: Propose and apply self-healing fixes
        channel.ack(msg);
      }
    });

  } catch (error) {
    console.error('Failed to start worker', error);
    process.exit(1);
  }
}

startWorker();
