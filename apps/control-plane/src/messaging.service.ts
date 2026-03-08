import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import amqp from 'amqplib';

@Injectable()
export class MessagingService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MessagingService.name);
  private connection: amqp.ChannelModel | null = null;
  private channel: amqp.Channel | null = null;
  private readonly exchange = 'testprite.events';

  async onModuleInit() {
    await this.connect();
  }

  async onModuleDestroy() {
    if (this.channel) await this.channel.close();
    if (this.connection) await this.connection.close();
  }

  private async connect() {
    try {
      const rabbitmqUrl = process.env.RABBITMQ_URL;
      if (!rabbitmqUrl) {
        throw new Error('RABBITMQ_URL is not defined in environment variables');
      }
      const conn = await amqp.connect(rabbitmqUrl);
      this.connection = conn;
      const ch = await conn.createChannel();
      this.channel = ch;

      // Ensure the exchange exists
      await ch.assertExchange(this.exchange, 'topic', { durable: true });
      this.logger.log('Connected to RabbitMQ and established exchange.');
    } catch (error) {
      this.logger.error('Failed to connect to RabbitMQ', error);
      // In a real application, implement retry logic here.
    }
  }

  async publish(routingKey: string, payload: any) {
    if (!this.channel) {
      this.logger.warn('Cannot publish message, channel is not open.');
      return;
    }

    try {
      const messageBuffer = Buffer.from(JSON.stringify(payload));
      this.channel.publish(this.exchange, routingKey, messageBuffer, { persistent: true });
      this.logger.log(`Published event with routing key: ${routingKey}`);
    } catch (error) {
      this.logger.error(`Error publishing message to routing key: ${routingKey}`, error);
      throw error;
    }
  }
}
