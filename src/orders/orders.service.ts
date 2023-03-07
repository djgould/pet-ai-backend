import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';

@Injectable()
export class OrdersService {
  constructor(private prisma: PrismaService) {}

  async createPendingOrder(data) {
    return await this.prisma.order.create({ data: {...data, status: 'PENDING' } });
  }
}
