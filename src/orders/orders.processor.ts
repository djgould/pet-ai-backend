import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { TrainingService } from 'src/training/training.service';
import { TrainingImagesService } from 'src/training_images/training_images.service';
import { OrderStatus, User } from '@prisma/client';
import { InferenceService } from 'src/inference/inference.service';
import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { Job, Queue } from 'bullmq';

@Processor('orders')
export class OrdersProcessor extends WorkerHost {
  private readonly logger = new Logger(OrdersProcessor.name);

  constructor(
    private prisma: PrismaService,
    private trainingService: TrainingService,
    private inferenceService: InferenceService,
  ) {
    super();
  }

  async process(job: Job) {
    switch (job.name) {
      case 'checkTrainingStatus':
        return this.checkTrainingStatus();
      default:
        throw new Error(`Unknown job name: ${job.name}`);
    }
  }

  private async checkTrainingStatus() {
    const trainingOrders = await this.prisma.order.findMany({
      where: { status: OrderStatus.TRAINING },
      include: { trainingImages: true },
    });

    const inferingOrders = await this.prisma.order.findMany({
      where: { status: OrderStatus.INFERING },
      include: { trainingImages: true },
    });

    this.logger.log(
      trainingOrders,
      `Orders in training: ${trainingOrders.length}`,
    );

    this.logger.log(
      inferingOrders,
      `Orders in infering: ${inferingOrders.length}`,
    );

    trainingOrders.forEach((order) => {
      this.trainingService.checkTrainingStatus(order.id);
    });

    inferingOrders.forEach((order) => {
      this.inferenceService.checkInferenceStatus(order.id);
    });
  }
}
