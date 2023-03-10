import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { UsersService } from 'src/users/users.service';
import { OrdersService } from './orders.service';

@Controller('orders')
export class OrdersController {
  constructor(
    private ordersService: OrdersService,
    private usersService: UsersService,
  ) {}

  @Post()
  @UseInterceptors(FilesInterceptor('files'))
  async createPendingOrder(
    @UploadedFiles() trainingImageFiles: Express.Multer.File[],
    @Param('orderId') orderId: string,
  ) {
    await this.ordersService.createPendingOrder(order);
    return this.ordersService.addTrainingImagesToOrder(
      orderId,
      trainingImageFiles,
    );
  }

  @Post(':orderId/payment')
  payAndStartTraining(@Param('orderId') orderId: string) {
    return this.ordersService.payAndStartTraining(orderId);
  }

  @Get()
  getOrders(@Req() req: Request) {
    const user = this.usersService.currentUser(req);
    return this.ordersService.getOrdersForUser(user);
  }
}
