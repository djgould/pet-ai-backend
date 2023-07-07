import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class TrackingService {
  private logger = new Logger(TrackingService.name);
  constructor() {}

  async track(evt: {
    project: string;
    channel: string;
    event: string;
    description: string;
    icon: string;
    notify: boolean;
  }) {
    try {
      axios.post('https://api.logsnag.com/v1/log', evt, {
        headers: {
          Authorization: `Bearer ${process.env.LOGSNAG_TOKEN}`,
        },
      });
    } catch (e) {
      this.logger.error(e?.message, e?.stack);
    }
  }
}
