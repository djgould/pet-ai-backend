import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OrdersService } from 'src/orders/orders.service';
import { PrismaService } from 'src/prisma.service';
import { TrainingService } from 'src/training/training.service';
import Stripe from 'stripe';

@Injectable()
export class StripeService {
  private readonly logger = new Logger(StripeService.name);
  private stripe: Stripe;
  private endpointSecret: string;
  constructor(
    private prisma: PrismaService,
    private trainingService: TrainingService,
    private configService: ConfigService,
  ) {
    this.stripe = new Stripe(configService.get('STRIPE_SECRET_KEY'), {
      apiVersion: '2022-11-15',
    });
    this.endpointSecret = configService.get('STRIPE_WEBHOOK_ENDPOINT_SECRET');
  }

  async fulfillOrder(
    clientReferenceId: string,
    lineItems: Stripe.ApiList<Stripe.LineItem>,
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id: clientReferenceId },
    });

    if (!order) {
      throw new Error(`No order found for id: ${clientReferenceId}`);
    }

    await this.trainingService.startTraining(order.id);
  }

  async handleSessionCompleted(event: Stripe.Event) {
    this.logger.log(event, 'Handling Stripe session completed event');
    const sessionWithLineItems = await this.stripe.checkout.sessions.retrieve(
      (event.data.object as { id: string }).id,
      {
        expand: ['line_items'],
      },
    );

    const lineItems = sessionWithLineItems.line_items;
    // Fulfill the purchase...
    await this.fulfillOrder(
      sessionWithLineItems.client_reference_id,
      lineItems,
    );
  }

  async createSession(orderId: string) {
    return await this.stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Charlie AI Photo Package',
              images: ['https://i.imgur.com/EHyR2nP.png'],
            },
            unit_amount: 1000,
          },
          quantity: 1,
        },
      ],
      client_reference_id: orderId,
      mode: 'payment',
      success_url: this.configService.get('STRIPE_CHECKOUT_RETURN_URL'),
      cancel_url: this.configService.get('STRIPE_CHECKOUT_CANCEL_URL'),
    });
  }

  constructEvent(body: any, sig: string) {
    return this.stripe.webhooks.constructEvent(body, sig, this.endpointSecret);
  }
}
