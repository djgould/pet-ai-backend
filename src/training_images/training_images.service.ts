import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import Upload from 'upload-js-full';
import sharp from 'sharp';
import JSZip from 'jszip';

const uploadManager = new Upload.UploadManager(
  new Upload.Configuration({
    apiKey: 'public_kW15b6k48wHEjGR8criKk5RMZ1Db', // e.g. "public_xxxxx"
  }),
);

@Injectable()
export class TrainingImagesService {
  constructor(private prisma: PrismaService) {}

  async createTrainingImage(trainingImageFile: Express.Multer.File) {
    // upload files to upload.io
    const file = await uploadManager.upload({
      ...trainingImageFile,
      accountId: 'kW15b6k',
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
    const file = await uploadManager.upload({
      accountId: 'kW15b6k',
      data: blob,
      path: {
        // See path variables: https://upload.io/docs/path-variables
        folderPath: '/uploads/{UTC_YEAR}/{UTC_MONTH}/{UTC_DAY}',
        fileName: `${orderId}-{UNIQUE_DIGITS_8}{ORIGINAL_FILE_EXT}`,
      },
    });

    return file;
  }
}
