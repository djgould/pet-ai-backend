import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { TrainingService } from 'src/training/training.service';
import { TrainingImagesService } from 'src/training_images/training_images.service';
import { OrderStatus, User } from '@prisma/client';
import { InferenceService } from 'src/inference/inference.service';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Emails } from 'resend/build/src/emails/emails';
import { EmailService } from 'src/email/email.service';
import { UserService } from 'src/user/user.service';
import * as JSZip from 'jszip';
import axios from 'axios';
import { S3Service } from 'src/s3/s3.service';
import { PutObjectCommandInput } from '@aws-sdk/client-s3';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    @InjectQueue('orders') private ordersQueue: Queue,
    private prisma: PrismaService,
    private trainingImageService: TrainingImagesService,
    private emailsService: EmailService,
    private s3Service: S3Service,
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

  async getAllOrders(range?: string) {
    if (range) {
      const rangeValues = JSON.parse(range);

      const start = rangeValues[0]; // 0
      const end = rangeValues[1]; // 9

      return await this.prisma.order.findMany({
        include: {
          trainingImages: true,
          resultImages: true,
          inferenceJobs: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: start,
        take: end - start + 1,
      });
    }

    return await this.prisma.order.findMany({
      include: {
        trainingImages: true,
        resultImages: true,
        inferenceJobs: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getOrdersByUserId(userId: string, range?: string) {
    if (range) {
      const rangeValues = JSON.parse(range);

      const start = rangeValues[0]; // 0
      const end = rangeValues[1]; // 9

      return await this.prisma.order.findMany({
        where: { userId },
        include: {
          trainingImages: true,
          resultImages: true,
          inferenceJobs: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: start,
        take: end - start + 1,
      });
    }

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

  async handleCompletedOrder(orderId: string) {
    const order = await this.prisma.order.update({
      where: { id: orderId },
      data: { status: OrderStatus.COMPLETED },
    });

    this.emailsService.sendOrderFinishedEmail(orderId);
    this.uploadResultImages(orderId).catch(console.error);
    this.uploadWatermarkedResultImages(orderId).catch(console.error);

    return order;
  }

  async uploadResultImages(orderId: string) {
    const resultImages = await this.prisma.resultImage.findMany({
      where: { orderId },
    });

    // zip up result images and upload to s3 using s3 service
    const zip = new JSZip();
    await Promise.all(
      resultImages.map(async (resultImage, i) => {
        // download image from resultImage.url using axios and add to zip
        const response = await axios.get(resultImage.url, {
          responseType: 'arraybuffer',
        });
        zip.file(`image-${i}.jpeg`, response.data);
        console.log(`image-${i}.jpeg added to zip`);
      }),
    );

    const blob = await zip.generateAsync({ type: 'uint8array' });

    const request: PutObjectCommandInput = {
      Bucket: 'deving-pet-ai',
      Key: `/result_images/${orderId}-result-images.zip`,
      Body: blob,
      ContentType: 'application/zip',
      ContentLength: blob.byteLength,
    };

    await this.s3Service.putObject(request);
    return this.s3Service.putObjectCommandInputToUrl(request);
  }

  async uploadWatermarkedResultImages(orderId: string) {
    const resultImages = await this.prisma.resultImage.findMany({
      where: { orderId },
    });

    // zip up result images and upload to s3 using s3 service
    const zip = new JSZip();
    await Promise.all(
      resultImages.map(async (resultImage, i) => {
        // download image from resultImage.url using axios and add to zip
        const response = await axios.get(resultImage.watermarkedUrl, {
          responseType: 'arraybuffer',
        });
        zip.file(`image-${i}.jpeg`, response.data);
        console.log(`image-${i}.jpeg added to zip`);
      }),
    );

    const blob = await zip.generateAsync({ type: 'uint8array' });

    const request: PutObjectCommandInput = {
      Bucket: 'deving-pet-ai',
      Key: `/result_images/${orderId}-watermarked-result-images.zip`,
      Body: blob,
      ContentType: 'application/zip',
      ContentLength: blob.byteLength,
    };

    await this.s3Service.putObject(request);
    return this.s3Service.putObjectCommandInputToUrl(request);
  }
}
