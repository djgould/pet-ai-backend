import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosError, AxiosInstance } from 'axios';
import { AppConfig } from 'src/app.config';
import {
  ReplicateCreatePrediction,
  ReplicateGetPrediction,
} from './replicate.interface';

@Injectable()
export class ReplicateService {
  private readonly replicateClient: AxiosInstance;
  private readonly logger = new Logger(ReplicateService.name);

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
    try {
      const response =
        await this.replicateClient.post<ReplicateCreatePrediction>(
          'https://api.replicate.com/v1/predictions',
          request,
        );
      return response;
    } catch (error) {
      if (error instanceof AxiosError) {
        this.logger.error(error.response, 'Replicate error');
      } else {
        this.logger.error(error);
      }

      throw error;
    }
  }

  getClient() {
    return this.replicateClient;
  }
}
