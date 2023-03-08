import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { OrdersController } from './orders/orders.controller';
import { PrismaService } from './prisma.service';
import { OrdersService } from './orders/orders.service';
import { ImagesService } from './images/images.service';
import { TrainingImagesService } from './training_images/training_images.service';
import { TrainingService } from './training/training.service';

@Module({
  imports: [],
  controllers: [AppController, OrdersController],
  providers: [AppService, PrismaService, OrdersService, ImagesService, TrainingImagesService, TrainingService],
})
export class AppModule {}
