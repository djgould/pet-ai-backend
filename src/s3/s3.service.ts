import { Injectable } from '@nestjs/common';
import { S3 } from 'aws-sdk';
import { PutObjectRequest } from 'aws-sdk/clients/s3';

@Injectable()
export class S3Service {
  private readonly s3: S3;

  constructor() {
    this.s3 = new S3();
  }

  async getObject(bucket: string, key: string): Promise<Buffer> {
    const response = await this.s3
      .getObject({ Bucket: bucket, Key: key })
      .promise();
    return response.Body as Buffer;
  }

  async putObject({
    originalFileName,
    data,
    path,
  }: {
    originalFileName: string;
    data: Buffer;
    path: {
      folderPath: string;
      fileName: string;
    };
  }): Promise<string> {
    const uniqueDigits = new Date().getTime().toString().slice(-8); // Generate a unique 8-digit number based on the current timestamp
    const fileExt = originalFileName.split('.').pop(); // Get the file extension from the original file name
    const uniqueFileName = path.fileName
      .replace('{UNIQUE_DIGITS_8}', uniqueDigits)
      .replace('{ORIGINAL_FILE_EXT}', fileExt); // Replace the path variables in the file name with actual values

    const request: PutObjectRequest = {
      Bucket: 'deving-pet-ai',
      Key: `${path.folderPath}/${uniqueFileName}`,
      Body: data,
    };

    await this.s3.putObject(request).promise();

    const url = `https://${request.Bucket}.s3.amazonaws.com/${request.Key}`;
    return url;
  }

  async deleteObject(bucket: string, key: string): Promise<void> {
    await this.s3.deleteObject({ Bucket: bucket, Key: key }).promise();
  }
}
