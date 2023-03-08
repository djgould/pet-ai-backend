import {
  Body,
  Controller,
  Param,
  Post,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { TrainingImagesService } from 'src/training_images/training_images.service';
import { OrdersService } from './orders.service';

@Controller('orders')
export class OrdersController {
  constructor(
    private ordersService: OrdersService,
    private trainingImageService: TrainingImagesService,
  ) {}

  @Post()
  createPendingOrder(@Body() order: any) {
    return this.ordersService.createPendingOrder(order);
  }

  @Post(':orderId/training-images')
  @UseInterceptors(FilesInterceptor('files', 5))
  addTrainingImagesToOrder(
    @UploadedFiles() trainingImageFiles: Express.Multer.File[],
    @Param('orderId') orderId: string,
  ) {
    return this.ordersService.addTrainingImagesToOrder(
      orderId,
      trainingImageFiles,
    );
  }

  @Post(':orderId/payment')
  payAndStartTraining(@Param('orderId') orderId: string) {
    return this.ordersService.payAndStartTraining(orderId);
  }
}
