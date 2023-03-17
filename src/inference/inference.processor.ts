import { Injectable, Logger } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import axios, { AxiosResponse } from 'axios';
import { ValueOf } from 'ts-essentials';
import { OrdersService } from 'src/orders/orders.service';
import { PrismaService } from 'src/prisma.service';
import { UploadService } from 'src/upload/upload.service';
import { stat } from 'fs';
import { ReplicateService } from 'src/replicate/replicate.service';
import { ReplicateGetPrediction } from 'src/replicate/replicate.interface';
import { FileDetails } from 'upload-js-full';
import { OrderStatus } from '@prisma/client';
import { InferenceService } from './inference.service';
import { Job } from 'bullmq';

const PROMPTS = [
  {
    prompt: 'a photo of an astronaut riding a horse on mars',
    negative_prompt: 'bad anatomy',
  },
  {
    prompt: 'a photo of an astronaut riding a horse on mars',
    negative_prompt: 'bad anatomy',
  },
  {
    prompt: 'a photo of an astronaut riding a horse on mars',
    negative_prompt: 'bad anatomy',
  },
  {
    prompt: 'a photo of an astronaut riding a horse on mars',
    negative_prompt: 'bad anatomy',
  },
  {
    prompt: 'a photo of an astronaut riding a horse on mars',
    negative_prompt: 'bad anatomy',
  },
  {
    prompt: 'a photo of an astronaut riding a horse on mars',
    negative_prompt: 'bad anatomy',
  },
];

@Injectable()
@Processor('inference')
export class InferenceProcessor extends WorkerHost {
  private readonly logger = new Logger(InferenceProcessor.name);

  constructor(
    private replicateService: ReplicateService,
    private inferenceService: InferenceService,
    private prisma: PrismaService,
  ) {
    super();
  }

  async process(job: Job<{ orderId: string }, any, 'checkInferenceStatus'>) {
    switch (job.name) {
      case 'checkInferenceStatus':
        return this.checkInferenceStatus(job);
      default:
        throw new Error(`Unknown job name: ${job.name}`);
    }
  }

  private async checkInferenceStatus(
    job: Job<{ orderId: string }, any, 'checkInferenceStatus'>,
  ) {
    const { orderId } = job.data;
    const inferenceJobs = await this.prisma.inferenceJob.findMany({
      where: { orderId },
    });

    if (inferenceJobs.length === 0) {
      this.logger.log(
        `No inference jobs for order ${orderId}. Marking order as failed.`,
      );
      return await this.prisma.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.FAILED },
      });
    }

    inferenceJobs.forEach(async (job) => {
      const predictionId = job.replicateId;
      this.logger.log(
        `Checking InferenceJob ${job.id} status for order: ${orderId}, prediction: ${predictionId}:`,
      );

      const response = await this.replicateService.getPrediction(predictionId);

      if (response.data.status === 'succeeded') {
        this.logger.log(
          `InferenceJob ${predictionId} succeeded for order ${orderId}`,
        );
        return this.inferenceService.handleSuccess(orderId, job.id, response);
      } else if (
        response.data.status === 'failed' ||
        response.data.status === 'canceled'
      ) {
        this.logger.error(`InferenceJob ${job.id} failed for Order ${orderId}`);
        return this.inferenceService.handleFailure(orderId, job.id, response);
      }
    });
  }
}
