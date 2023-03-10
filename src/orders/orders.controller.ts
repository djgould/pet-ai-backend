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
import { CurrentUser } from 'src/user/user.decorator';
import { User } from '@prisma/client';
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
    @Req() req: Express.Request,
    @UploadedFiles() trainingImageFiles: Express.Multer.File[],
    @CurrentUser() user: User,
  ) {
    const order = await this.ordersService.createPendingOrder(user);
    return this.ordersService.addTrainingImagesToOrder(
      order.id,
      trainingImageFiles,
    );
  }

  @Post(':orderId/payment')
  payAndStartTraining(@Param('orderId') orderId: string) {
    return this.ordersService.payAndStartTraining(orderId);
  }

  @Get()
  async getOrders(@Req() req: Express.Request, @CurrentUser() user: User) {
    return this.ordersService.getOrdersByUserId(user.id);
  }
}
