import { Injectable } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import {
  ReplicateCreatePrediction,
  ReplicateGetPrediction,
} from './replicate.interface';

@Injectable()
export class ReplicateService {
  private readonly replicateClient: AxiosInstance;

  constructor() {
    this.replicateClient = axios.create({
      baseURL: 'https://api.replicate.com/v1',
      headers: {
        Authorization: `Token ${process.env.REPLICATE_API_KEY}`,
      },
    });
  }

  async getPrediction(predictionId: string) {
    return this.replicateClient.get<ReplicateGetPrediction>(
      `/predictions/${predictionId}`,
      {
        headers: {
          Authorization: `Token ${process.env.REPLICATE_API_KEY}`,
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
}
