import { Body, Controller, Post } from '@nestjs/common';
import { OrdersService } from './orders.service';

@Controller('orders')
export class OrdersController {
  constructor(private ordersService: OrdersService) {}

  @Post()
  createPendingOrder(@Body() order: any) {
    return this.ordersService.createPendingOrder(order);
  }
}
