import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as Upload from 'upload-js-full';

export interface UploadResponse {
  result: {
    id: string;
    filename: string;
    uploaded: string;
    requireSignedURLs: boolean;
    variants: string[];
  };
  result_info: null;
  success: boolean;
  errors: any[];
  messages: any[];
}

@Injectable()
export class UploadService {
  private uploadManager: Upload.UploadManager;

  constructor(private configService: ConfigService) {
    this.uploadManager = new Upload.UploadManager(
      new Upload.Configuration({
        apiKey: this.configService.get('UPLOAD_IO_PUBLIC_KEY'), // e.g. "public_xxxxx"
      }),
    );
  }

  async upload(file: Blob, filename: string) {
    const formData = new FormData();
    formData.append('file', file, filename);

    return (
      await axios.post<UploadResponse>(
        'https://api.cloudflare.com/client/v4/accounts/856b2a301c6397af09f8179086ead013/images/v1',
        formData,
        {
          headers: {
            Authorization: `Bearer ${this.configService.get(
              'CLOUDFLARE_API_KEY',
            )}`,
            'Content-Type': 'multipart/form-data',
          },
        },
      )
    ).data;
  }
}
