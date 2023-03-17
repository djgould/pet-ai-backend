import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { AppConfig } from 'src/app.config';
import {
  ReplicateCreatePrediction,
  ReplicateGetPrediction,
} from './replicate.interface';

@Injectable()
export class ReplicateService {
  private readonly replicateClient: AxiosInstance;

  constructor(private configService: ConfigService<AppConfig>) {
    this.replicateClient = axios.create({
      baseURL: 'https://api.replicate.com/v1',
      headers: {
        Authorization: `Token ${this.configService.get('REPLICATE_API_KEY')}`,
      },
    });
  }

  getPrediction(predictionId: string) {
    return this.replicateClient.get<ReplicateGetPrediction>(
      `/predictions/${predictionId}`,
      {
        headers: {
          Authorization: `Token ${this.configService.get('REPLICATE_API_KEY')}`,
        },
      },
    );
  }

  async createPrediction(request: { [key: string]: any }) {
    return this.replicateClient.post<ReplicateCreatePrediction>(
      'https://api.replicate.com/v1/predictions',
      request,
    );
  }

  getClient() {
    return this.replicateClient;
  }
}
