import { Controller, Post, Body, Param, HttpCode, HttpStatus, Req, UseGuards } from '@nestjs/common';
import { MessagingService } from './messaging.service';
import { AuthGuard } from './auth.middleware';

@Controller('api/v1/projects')
@UseGuards(AuthGuard)
export class TestsController {
  constructor(private readonly messagingService: MessagingService) {}

  @Post(':id/tests')
  @HttpCode(HttpStatus.ACCEPTED)
  async createTest(
    @Param('id') projectId: string,
    @Body() testPayload: any,
    @Req() request: any
  ) {
    // In a real app, authorId would come from the JWT via AuthGuard
    const authorId = request.user?.id || '00000000-0000-0000-0000-000000000000';

    const eventPayload = {
      projectId,
      authorId,
      ...testPayload,
      timestamp: new Date().toISOString(),
    };

    // Publish to Agent Orchestration Layer
    await this.messagingService.publish('test.authoring.requested', eventPayload);

    return {
      message: 'Test creation request received and queued for processing.',
      status: 'pending',
      jobId: 'generated-uuid-for-tracking', // In reality, generate and return a tracking ID
    };
  }
}
