import { Module } from '@nestjs/common';
import { TestsController } from './tests.controller';
import { MessagingService } from './messaging.service';

@Module({
  imports: [],
  controllers: [TestsController],
  providers: [MessagingService],
})
export class AppModule {}
