import { Injectable } from '@nestjs/common';
import {
  PutObjectCommandInput,
  PutObjectCommandOutput,
  S3,
} from '@aws-sdk/client-s3';
import { PutObjectRequest } from '@aws-sdk/client-s3';
import { PassThrough } from 'stream';
import { AxiosResponse } from 'axios';
import { ConfigService } from '@nestjs/config';
import { AppConfig } from 'src/app.config';

@Injectable()
export class S3Service {
  private readonly s3: S3;

  constructor(private configService: ConfigService<AppConfig>) {
    this.s3 = new S3({
      region: 'us-east-1',
      credentials: {
        accessKeyId: this.configService.get('AWS_ACCESS_KEY'),
        secretAccessKey: this.configService.get('AWS_SECRET_ACCESS_KEY'),
      },
    });
  }

  async getObject(bucket: string, key: string): Promise<Uint8Array> {
    const response = await this.s3.getObject({ Bucket: bucket, Key: key });
    return response.Body.transformToByteArray();
  }

  async putObject(
    request: PutObjectCommandInput,
  ): Promise<PutObjectCommandOutput> {
    return this.s3.putObject(request);
  }

  async deleteObject(bucket: string, key: string): Promise<void> {
    await this.s3.deleteObject({ Bucket: bucket, Key: key });
  }
}
