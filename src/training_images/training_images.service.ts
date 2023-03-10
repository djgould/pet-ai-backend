import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import sharp from 'sharp';
import JSZip from 'jszip';
import { UploadService } from 'src/upload/upload.service';

@Injectable()
export class TrainingImagesService {
  constructor(
    private prisma: PrismaService,
    private uploadService: UploadService,
  ) {}

  async createTrainingImage(trainingImageFile: Express.Multer.File) {
    // upload files to upload.io
    const file = await this.uploadService.upload({
      ...trainingImageFile,
      data: trainingImageFile.buffer,
      path: {
        // See path variables: https://upload.io/docs/path-variables

        folderPath: '/uploads/{UTC_YEAR}/{UTC_MONTH}/{UTC_DAY}',
        fileName: '{UNIQUE_DIGITS_8}{ORIGINAL_FILE_EXT}',
      },
    });

    const metadata = await sharp(trainingImageFile.buffer).metadata();

    // create image in database
    return await this.prisma.trainingImage.create({
      data: {
        url: file.fileUrl,
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
