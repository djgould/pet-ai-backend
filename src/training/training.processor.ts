import { Process, Processor } from '@nestjs/bull';
import { Injectable, Logger } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { OrderStatus } from '@prisma/client';
import axios from 'axios';
import { Job } from 'bull';
import { InferenceService } from 'src/inference/inference.service';
import { PrismaService } from 'src/prisma.service';
import { ReplicateService } from 'src/replicate/replicate.service';
import { S3Service } from 'src/s3/s3.service';
import { TrainingService } from './training.service';

@Injectable()
@Processor('training')
export class TrainingProcessor {
  private readonly logger = new Logger(TrainingProcessor.name);
  constructor(
    private prisma: PrismaService,
    private inferenceService: InferenceService,
    private replicateService: ReplicateService,
    private trainingService: TrainingService,
  ) {}

  /**
   * Called once a minute on all orders with status = TRAINING
   */
  @Process('trackProgress')
  async trackProgress(job: Job<{ orderId: string }>) {
    const { orderId } = job.data;

    this.logger.log(`Checking training progress for order ${orderId}...`);

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    this.logger.log(`Order ${orderId} status: ${order.status}`);

    const response = await this.replicateService.getPrediction(
      order.replicateTrainingId,
    );

    this.logger.log(response.data, `Replicate response for order ${orderId}`);

    const { status } = response.data;

    if (status === 'failed' || status === 'canceled') {
      this.logger.error(`Training failed for order ${orderId}`);

      await this.prisma.order.update({
        where: { id: orderId },
        data: {
          status: OrderStatus.FAILED,
          replicateTrainingStatus: response.data.status,
        },
      });
    } else if (status === 'succeeded' && !response.data.output) {
      this.logger.error(
        `Training succeeded for order ${orderId} but no output was found`,
      );
      return this.prisma.order.update({
        where: { id: orderId },
        data: {
          status: OrderStatus.FAILED,
        },
      });
    } else if (status === 'succeeded') {
      this.logger.log(`Training succeeded for order ${orderId}`);
      await this.prisma.order.update({
        where: { id: orderId },
        data: {
          status: OrderStatus.UPLOADING_MODEL,
          replicateModelUrl: response.data.output.toString(),
        },
      });
      await this.trainingService.saveModel(
        orderId,
        response.data.output as string,
      );
      this.inferenceService.startInference(orderId);
    } else {
      this.logger.log(
        `Training still in progress for order ${orderId}. Status: ${status}`,
      );
    }
  }
}
