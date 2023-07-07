import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import { PrismaService } from 'src/prisma.service';
import { UserService } from 'src/user/user.service';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  resend: Resend;
  constructor(
    private config: ConfigService,
    private userService: UserService,
    private prisma: PrismaService,
  ) {
    this.resend = new Resend(config.get('RESEND_API_KEY'));
  }

  async sendOrderFinishedEmail(orderId: string) {
    try {
      const order = await this.prisma.order.findUnique({
        where: { id: orderId },
      });
      const user = await this.userService.getClerkUserFromId(order.userId);
      const response = await this.resend.emails.send({
        from: 'devin@charlieai.app',
        to: user.emailAddresses.map((email) => email.emailAddress),
        subject: 'Your order is ready!',
        text: `Your order is ready! Visit ${process.env.FRONTEND_URL}/orders/${order.id} to view your results.`,
      });

      return response;
    } catch (e) {
      this.logger.error(`Error sending email: ${e.message}`, e.stack);
    }
  }

  async sendPaymentReceivedEmail(orderId: string) {
    try {
      const order = await this.prisma.order.findUnique({
        where: { id: orderId },
      });
      const user = await this.userService.getClerkUserFromId(order.userId);
      const response = await this.resend.emails.send({
        from: 'devin@charlieai.app',
        to: user.emailAddresses.map((email) => email.emailAddress),
        subject: 'Your order has in progress!',
        text: `We are working on generating your images! THey should be ready in ~70 minutes. Visit ${process.env.FRONTEND_URL}/orders/${order.id} to view your the status!`,
      });

      return response;
    } catch (e) {
      this.logger.error(`Error sending email: ${e.message}`, e.stack);
    }
  }

  async sendFreeTierStarted(orderId: string) {
    try {
      const order = await this.prisma.order.findUnique({
        where: { id: orderId },
      });
      const user = await this.userService.getClerkUserFromId(order.userId);
      const response = await this.resend.emails.send({
        from: 'devin@charlieai.app',
        to: user.emailAddresses.map((email) => email.emailAddress),
        subject: 'Your order is in progress!',
        text: `We are working on generating your free images! THey should be ready in ~70 minutes. Visit ${process.env.FRONTEND_URL}/orders/${order.id} to view your the status!`,
      });

      return response;
    } catch (e) {
      this.logger.error(`Error sending email: ${e.message}`, e.stack);
    }
  }

  async sendOrderStartedEmail(orderId: string) {
    try {
      const order = await this.prisma.order.findUnique({
        where: { id: orderId },
      });
      const user = await this.userService.getClerkUserFromId(order.userId);
      const response = await this.resend.emails.send({
        from: 'devin@charlieai.app',
        to: user.emailAddresses.map((email) => email.emailAddress),
        subject: 'Your order is in progress!',
        text: `We are working on generating your images! THey should be ready in ~70 minutes. Visit ${process.env.FRONTEND_URL}/orders/${order.id} to view your the status!`,
      });

      return response;
    } catch (e) {
      this.logger.error(`Error sending email: ${e.message}`, e.stack);
    }
  }
}
