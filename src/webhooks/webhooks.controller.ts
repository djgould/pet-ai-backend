import { Body, Controller, Post } from '@nestjs/common';
import { WebhookEvent } from '@clerk/clerk-sdk-node';
import axios from 'axios';
import { TrackingService } from 'src/tracking/tracking.service';

@Controller('webhooks')
export class WebhooksController {
  constructor(private trackingService: TrackingService) {}

  @Post('/clerk')
  async handleClerkWebhook(@Body('evt') evt: WebhookEvent) {
    switch (evt.type) {
      case 'user.created': // this is typed
        await this.trackingService.track({
          project: 'charlie-ai',
          channel: 'user-register',
          event: 'user registered',
          description: `email: ${evt.data.email_addresses[0].email_address}`,
          icon: '🎉',
          notify: true,
        });
    }
    return;
  }
}
