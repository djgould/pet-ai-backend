import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { TrainingService } from 'src/training/training.service';
import { CreateTrainingImage } from 'src/training_images/create-training-image.interface';
import { TrainingImagesService } from 'src/training_images/training_images.service';

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private trainingImageService: TrainingImagesService,
    private trainingService: TrainingService,
  ) {}

  async createPendingOrder(data) {
    return await this.prisma.order.create({
      data: { ...data, status: 'PENDING' },
    });
  }

  async addTrainingImagesToOrder(
    orderId,
    trainingImageFiles: Express.Multer.File[],
  ) {
    const trainingImages = await Promise.all(
      trainingImageFiles.map(
        async (trainingImage) =>
          await this.trainingImageService.createTrainingImage(trainingImage),
      ),
    );
    const zip = await this.trainingImageService.uploadTrainingImagesZip(
      orderId,
      trainingImageFiles,
    );
    return await this.prisma.order.update({
      where: { id: orderId },
      data: {
        trainingImagesZipUrl: zip.fileUrl,
        trainingImages: {
          connect: trainingImages.map((trainingImage) => ({
            id: trainingImage.id,
          })),
        },
      },
    });
  }

  async payAndStartTraining(orderId) {
    return await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'TRAINING',
      },
    });
  }
}
