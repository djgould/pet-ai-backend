import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import * as sharp from 'sharp';
import * as JSZip from 'jszip';
import { UploadService } from 'src/upload/upload.service';
import { S3Service } from 'src/s3/s3.service';
import { PutObjectCommandInput } from '@aws-sdk/client-s3';

@Injectable()
export class TrainingImagesService {
  constructor(
    private prisma: PrismaService,
    private uploadService: UploadService,
    private s3Service: S3Service,
  ) {}

  async createTrainingImage(trainingImageFile: Express.Multer.File) {
    const file = await this.uploadService.upload(
      new Blob([trainingImageFile.buffer]),
      trainingImageFile.originalname,
    );

    const metadata = await sharp(trainingImageFile.buffer).metadata();

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
    trainingImages.forEach((trainingImage) => {
      zip.file(trainingImage.originalname, trainingImage.buffer);
    });

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
