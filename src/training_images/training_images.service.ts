import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import * as sharp from 'sharp';
import * as JSZip from 'jszip';
import { UploadService } from 'src/upload/upload.service';
import { S3Service } from 'src/s3/s3.service';
import { PutObjectCommandInput } from '@aws-sdk/client-s3';

@Injectable()
export class TrainingImagesService {
  private readonly logger = new Logger(TrainingImagesService.name);

  constructor(
    private prisma: PrismaService,
    private uploadService: UploadService,
    private s3Service: S3Service,
  ) {}

  async createTrainingImage(trainingImageFile: Express.Multer.File) {
    const resized = await sharp(trainingImageFile.buffer).resize(768, 768);

    const file = await this.uploadService.upload(
      new Blob([await resized.toBuffer()]),
      trainingImageFile.originalname,
    );

    const metadata = await resized.metadata();

    // create image in database
    return await this.prisma.trainingImage.create({
      data: {
        url: file.result?.variants[0],
        name: trainingImageFile.originalname,
        width: metadata.width,
        height: metadata.height,
        size: trainingImageFile.size,
        type: trainingImageFile.mimetype,
      },
    });
  }

  async uploadTrainingImagesZip(
    orderId: string,
    trainingImages: Express.Multer.File[],
  ): Promise<string> {
    const zip = new JSZip();
    await Promise.all(
      trainingImages.map(async (trainingImage) => {
        const resized = await sharp(trainingImage.buffer).resize(768, 768);

        zip.file(trainingImage.originalname, resized.toBuffer());
      }),
    ).catch(this.logger.error);

    const blob = await zip.generateAsync({ type: 'uint8array' });

    const request: PutObjectCommandInput = {
      Bucket: 'deving-pet-ai',
      Key: `/training_images/${orderId}-training-images.zip`,
      Body: blob,
      ContentType: 'application/zip',
      ContentLength: blob.byteLength,
    };
    this.s3Service.putObject(request);
    return this.s3Service.putObjectCommandInputToUrl(request);
  }
}
