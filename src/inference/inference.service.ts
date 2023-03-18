import { Injectable, Logger } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
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
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

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
export class InferenceService {
  private readonly logger = new Logger(InferenceService.name);

  constructor(
    @InjectQueue('inference') private inferenceQueue: Queue,
    private prisma: PrismaService,
    private uploadService: UploadService,
    private replicateService: ReplicateService,
  ) {}

  async startInference(orderId: string) {
    this.logger.log(`Starting inference for order ${orderId}`);

    const order = await this.prisma.order.update({
      where: { id: orderId },
      data: { status: OrderStatus.INFERING },
    });

    for (const prompt of PROMPTS) {
      const request = {
        version:
          '41ac9acb0c9e08ed246f11ee3be65bd78f536f8162d69d41fd0eab9d1d1c709d',
        input: {
          model_url: order.trainedModelUrl,
          prompt: prompt.prompt,
          negative_prompt: prompt.negative_prompt,
          width: 512,
          height: 512,
          prompt_strength: 0.8,
          num_outputs: 10,
          num_inference_steps: 50,
          guidance_scale: 7.5,
        },
      };

      const response = await this.replicateService.createPrediction(request);

      await this.prisma.inferenceJob.create({
        data: {
          replicateId: response.data.id,
          status: response.data.status,
          prompt: request.input.prompt,
          negativePrompt: request.input.negative_prompt,
          version: request.version,
          width: request.input.width,
          height: request.input.height,
          numOutputs: request.input.num_outputs,
          numInferenceSteps: request.input.num_inference_steps,
          guidanceScale: request.input.guidance_scale,
          order: {
            connect: {
              id: orderId,
            },
          },
        },
      });
    }
  }

  checkInferenceStatus(orderId: string) {
    this.inferenceQueue.add('checkInferenceStatus', {
      orderId,
    });
  }

  async handleSuccess(
    orderId: string,
    inferenceJobId: string,
    response: AxiosResponse<ReplicateGetPrediction>,
  ) {
    await this.prisma.inferenceJob.update({
      where: { id: inferenceJobId },
      data: {
        status: response.data.status,
      },
    });

    const files = await Promise.all(
      this.downloadResultImages(response.data.output as string[]),
    );
    await Promise.all(
      files.map((file) => {
        this.createResultImage(orderId, file.fileUrl);
      }),
    );

    const jobs = await this.getAllInferenceJobForOrder(orderId);
    if (jobs.length === 0) {
      this.logger.log(
        `No inference jobs found for order ${orderId}. Order failed.`,
      );
      return this.prisma.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.FAILED },
      });
    }

    const statuses = jobs.map((job) => job.status);

    if (statuses.every((status) => status === 'succeeded')) {
      this.logger.log(`All inference jobs succeeded for order ${orderId}`);

      return this.prisma.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.COMPLETED },
      });
    }
  }

  async handleFailure(
    orderId: string,
    inferenceJobId: string,
    response: AxiosResponse<ReplicateGetPrediction>,
  ) {
    await this.prisma.inferenceJob.update({
      where: { id: inferenceJobId },
      data: {
        status: response.data.status,
      },
    });

    return this.prisma.order.update({
      where: { id: orderId },
      data: { status: OrderStatus.FAILED },
    });
  }

  async getAllInferenceJobForOrder(orderId: string) {
    return await this.prisma.inferenceJob.findMany({
      where: {
        order: {
          id: orderId,
        },
      },
    });
  }

  private downloadResultImages(urls: string[]): Promise<FileDetails>[] {
    return urls.map(async (url) => {
      const response = await axios.get(url, { responseType: 'arraybuffer' });

      const file = await this.uploadService.upload({
        originalFileName: 'image.jpeg',
        data: response.data,
        path: {
          // See path variables: https://upload.io/docs/path-variables
          folderPath: '/uploads/{UTC_YEAR}/{UTC_MONTH}/{UTC_DAY}',
          fileName: `{UNIQUE_DIGITS_8}{ORIGINAL_FILE_EXT}`,
        },
      });

      return file;
    });
  }

  private async createResultImage(orderId: string, url: string) {
    return this.prisma.resultImage.create({
      data: {
        url: url,
        order: {
          connect: {
            id: orderId,
          },
        },
      },
    });
  }

  private getInferenceIntervalName(inferenceJobId: string) {
    return `inference-${inferenceJobId}`;
  }
}
