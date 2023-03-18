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
    const request: PutObjectCommandInput = {
      Bucket: 'deving-pet-ai',
      Key: `/training_images/${trainingImageFile.originalname}`,
      Body: trainingImageFile.buffer,
      ContentType: trainingImageFile.mimetype,
      ContentLength: trainingImageFile.size,
    };

    await this.s3Service.putObject(request);

    const metadata = await sharp(trainingImageFile.buffer).metadata();

    // create image in database
    return await this.prisma.trainingImage.create({
      data: {
        url: this.s3Service.putObjectCommandInputToUrl(request),
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
  ) {
    const zip = new JSZip();
    trainingImages.forEach((trainingImage) => {
      zip.file(trainingImage.originalname, trainingImage.buffer);
    });

    const blob = await zip.generateAsync({ type: 'blob' });
    const file = await this.uploadService.upload({
      originalFileName: `${orderId}-training-images.zip`,
      data: blob,
      path: {
        // See path variables: https://upload.io/docs/path-variables
        folderPath: '/uploads/{UTC_YEAR}/{UTC_MONTH}/{UTC_DAY}',
        fileName: `{UNIQUE_DIGITS_8}{ORIGINAL_FILE_EXT}`,
      },
    });
    return file;
  }
}
