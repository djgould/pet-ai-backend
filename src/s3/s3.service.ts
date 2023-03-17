import { Injectable } from '@nestjs/common';
import {
  PutObjectCommandInput,
  PutObjectCommandOutput,
  S3,
} from '@aws-sdk/client-s3';
import { PutObjectRequest } from '@aws-sdk/client-s3';
import { PassThrough } from 'stream';
import { AxiosResponse } from 'axios';

@Injectable()
export class S3Service {
  private readonly s3: S3;

  constructor() {
    this.s3 = new S3({ region: 'us-east-1' });
  }

  async getObject(bucket: string, key: string): Promise<Uint8Array> {
    const response = await this.s3.getObject({ Bucket: bucket, Key: key });
    return response.Body.transformToByteArray();
  }

  async putObject({
    originalFileName,
    data,
    path,
    fileResponse,
  }: {
    originalFileName: string;
    data: PassThrough;
    path: {
      folderPath: string;
      fileName: string;
    };
    fileResponse: AxiosResponse;
  }): Promise<PutObjectCommandOutput> {
    const uniqueDigits = new Date().getTime().toString().slice(-8); // Generate a unique 8-digit number based on the current timestamp
    const fileExt = originalFileName.split('.').pop(); // Get the file extension from the original file name
    const uniqueFileName = path.fileName
      .replace('{UNIQUE_DIGITS_8}', uniqueDigits)
      .replace('{ORIGINAL_FILE_EXT}', fileExt); // Replace the path variables in the file name with actual values

    const request: PutObjectCommandInput = {
      Bucket: 'deving-pet-ai',
      Key: `${path.folderPath}/${uniqueFileName}`,
      Body: data,
      ContentType: fileResponse.headers['content-type'],
      ContentLength: fileResponse.headers['content-length'],
    };

    return this.s3.putObject(request);
  }

  async deleteObject(bucket: string, key: string): Promise<void> {
    await this.s3.deleteObject({ Bucket: bucket, Key: key });
  }
}
