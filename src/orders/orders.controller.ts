import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { CurrentUser } from 'src/user/user.decorator';
import { Order, User } from '@prisma/client';
import { OrdersService } from './orders.service';
import { AuthGuard } from 'src/auth/auth.guard';
import axios from 'axios';
import { memoryStorage } from 'multer';

export type WithETA<T> = T & { eta: number };

function withEta(order: Order): WithETA<Order> {
  // calculate eta by subtracting the elapsed time from 1900 seconds
  const eta =
    1900 - Math.floor((Date.now() - order.createdAt.getTime()) / 1000);

  if (eta < 0) {
    return { ...order, eta: 0 };
  }

  return { ...order, eta };
}

@Controller('orders')
@UseGuards(AuthGuard)
export class OrdersController {
  constructor(private ordersService: OrdersService) {}

  @Post()
  @UseInterceptors(FilesInterceptor('files'))
  async createPendingOrder(
    @Req() req: Express.Request,
    @UploadedFiles() trainingImageFiles: Express.Multer.File[],
    @CurrentUser() user: User,
    @Body('urls') urls: string[],
  ) {
    const downloadedFiles: Express.Multer.File[] = await Promise.all(
      urls.map(async (url, i) => {
        const response = await axios.get(url, { responseType: 'arraybuffer' });

        const fileData = new Uint8Array(response.data);
        const fileBuffer = Buffer.from(fileData);
        const filename = url.split('/').pop();

        const file: Express.Multer.File = {
          fieldname: 'file',
          originalname: `a photo of <s1> dog_${i}.jpeg`,
          encoding: '7bit',
          mimetype: response.headers['content-type'],
          size: fileData.byteLength,
          destination: '',
          filename: `a photo of <s1> dog_${i}.jpeg`,
          path: '',
          buffer: fileBuffer,
          stream: null,
        };

        return file;
      }),
    );

    const order = await this.ordersService.createPendingOrder(user);
    return this.ordersService.addTrainingImagesToOrder(
      order.id,
      trainingImageFiles ? trainingImageFiles : downloadedFiles,
    );
  }

  @Get()
  async getOrders(@Req() req: Express.Request, @CurrentUser() user: User) {
    const orders = await this.ordersService.getOrdersByUserId(user.id);
    return orders.map(withEta);
  }

  @Get(':id')
  async getOrder(@Req() req: Express.Request, @Param('id') id: string) {
    const order = await this.ordersService.getOrderById(id);
    return withEta(order);
  }
}
