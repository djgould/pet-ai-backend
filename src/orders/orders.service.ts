import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { TrainingService } from 'src/training/training.service';
import { TrainingImagesService } from 'src/training_images/training_images.service';
import { OrderStatus, User } from '@prisma/client';
import { InferenceService } from 'src/inference/inference.service';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    @InjectQueue('orders') private ordersQueue: Queue,
    private prisma: PrismaService,
    private trainingImageService: TrainingImagesService,
    private trainingService: TrainingService,
    private inferenceService: InferenceService,
  ) {
    ordersQueue.add(
      'checkTrainingStatus',
      {},
      { repeat: { every: 60 * 1000 } },
    );
  }

  async createPendingOrder(user: User) {
    return await this.prisma.order.create({
      data: { status: OrderStatus.PENDING, user: { connect: { id: user.id } } },
    });
  }

  async addTrainingImagesToOrder(
    orderId: string,
    trainingImageFiles: Express.Multer.File[],
  ) {
    const trainingImages = await Promise.all(
      trainingImageFiles.map(
        async (trainingImage) =>
          await this.trainingImageService.createTrainingImage(trainingImage),
      ),
    );
    const zipUrl = await this.trainingImageService.uploadTrainingImagesZip(
      orderId,
      trainingImageFiles,
    );
    return await this.prisma.order.update({
      where: { id: orderId },
      data: {
        trainingImagesZipUrl: zipUrl,
        trainingImages: {
          connect: trainingImages.map((trainingImage) => ({
            id: trainingImage.id,
          })),
        },
      },
    });
  }

  async getOrdersByUserId(userId: string) {
    return await this.prisma.order.findMany({
      where: { userId },
      include: {
        trainingImages: true,
        resultImages: true,
        inferenceJobs: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getOrderById(orderId: string) {
    return await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        trainingImages: true,
        resultImages: true,
        inferenceJobs: true,
      },
    });
  }
}
