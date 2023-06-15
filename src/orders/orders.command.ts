import { Command, Positional, Option } from 'nestjs-command';
import { Injectable } from '@nestjs/common';
import { OrdersService } from './orders.service';

@Injectable()
export class OrdersCommand {
  constructor(private readonly orderService: OrdersService) {}

  @Command({
    command: 'upload:results <orderId>',
    describe: 'create a user',
  })
  async create(
    @Positional({
      name: 'orderId',
      describe: 'the order id',
      type: 'string',
    })
    orderId: string,
  ) {
    return this.orderService.uploadResultImages(orderId);
  }
}
