import {
  Body,
  Controller,
  Get,
  Header,
  Headers,
  HttpException,
  HttpStatus,
  Logger,
  Post,
  RawBodyRequest,
  Redirect,
  Req,
  Res,
} from '@nestjs/common';
import { StripeService } from './stripe.service';

@Controller('stripe')
export class StripeController {
  private readonly logger = new Logger(StripeController.name);
  constructor(private stripeService: StripeService) {}

  @Post('/create-checkout-session')
  async createCheckoutSession(
    @Body('order_id') order_id: string,
    @Body('return_url') returnUrl: string,
    @Body('cancel_url') cancelUrl: string,
  ) {
    const session = await this.stripeService.createSession(
      order_id,
      returnUrl,
      cancelUrl,
    );

    return session;
  }

  @Post('/webhook')
  async handleStripeWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') sig: string,
  ) {
    this.logger.log(req.rawBody, 'Received Stripe webhook');
    let event;

    try {
      event = this.stripeService.constructEvent(req.rawBody, sig);
      this.logger.log(event, 'Constructed Stripe event');
    } catch (err) {
      this.logger.error(err, 'Error constructing Stripe event');
      throw new HttpException(
        `Webhook Error: ${err.message}`,
        HttpStatus.BAD_REQUEST,
      );
    }

    // Handle the checkout.session.completed event
    if (event.type === 'checkout.session.completed') {
      this.stripeService.handleSessionCompleted(event);
    }

    return { ok: true };
  }
}
