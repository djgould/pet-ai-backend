import { Injectable } from '@nestjs/common';
import * as Upload from 'upload-js-full';

@Injectable()
export class UploadService {
  private uploadManager: Upload.UploadManager;

  constructor() {
    this.uploadManager = new Upload.UploadManager(
      new Upload.Configuration({
        apiKey: 'public_kW15b6k48wHEjGR8criKk5RMZ1Db', // e.g. "public_xxxxx"
      }),
    );
  }

  async upload(params: Omit<Upload.UploadManagerParams, 'accountId'>) {
    return await this.uploadManager.upload({ ...params, accountId: 'kW15b6k' });
  }
}
