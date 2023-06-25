import { Injectable, Logger } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import axios, { AxiosResponse } from 'axios';
import { ValueOf } from 'ts-essentials';
import { OrdersService } from 'src/orders/orders.service';
import { PrismaService } from 'src/prisma.service';
import { UploadResponse, UploadService } from 'src/upload/upload.service';
import { stat } from 'fs';
import { ReplicateService } from 'src/replicate/replicate.service';
import { ReplicateGetPrediction } from 'src/replicate/replicate.interface';
import { FileDetails } from 'upload-js-full';
import { OrderStatus } from '@prisma/client';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

const PROMPTS = [
  {
    prompt:
      'a digital portrait of <s1> dog dressed as a jedi, holding a lightsaber, trending on artstation, in the style of omar rubio',
  },
  {
    prompt:
      'a digital portrait <s1> dog dressed as a king, wearing a crown and a red robe, gray gradient background, 4k, trending on artstation, in the style of Jean Auguste Dominique Ingres',
  },
  {
    prompt:
      'a digital portrait of <s1> dog dressed as an astronaut, wearing a space helmet, space background with planet',
  },
  {
    prompt:
      'a digital portrait of <s1> dog dressed as a cowboy, wearing a cowboy hat, blurry Mojave Desert background',
  },
  {
    prompt:
      'a digital portrait of <s1> dog dressed as a santa, wearing a santa hat, gray glowing background',
  },
  {
    prompt:
      'a digital portrait of <s1> dog dressed as a pirate, wearing a pirate hat, trending on artstation, caribbean background',
    negative_prompt: 'extra limbs, bad anatomy, high detail, photograph',
  },
  {
    prompt:
      'a digital portrait of <s1> dog dressed as a gangster, wearing a hat, trending on artstation, inside a smoky candle lit pub',
  },
  {
    prompt:
      'a digital portrait of <s1> dog wearing a suit and tie, on a green field by the beach, in new england summer, trending on artstation',
  },
  {
    prompt:
      'a digital portrait of <s1> dog dressed as a superhero, flying with city skyline in background, trending on artstation',
  },
  {
    prompt:
      'an impressionist painting of <s1> dog, sunset with dramatic lighting, in the style of claude monet, colorful oil painting',
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
    private ordersService: OrdersService,
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
          '2c3a6e914a191bfe06939116d132ce3c6d277c9b8d83ee65e2251bea36a03a1a',
        input: {
          model_url: order.trainedModelUrl,
          prompt: prompt.prompt,
          negative_prompt: prompt.negative_prompt,
          width: 512,
          height: 512,
          prompt_strength: 0.8,
          num_outputs: 10,
          num_inference_steps: 50,
          guidance_scale: 11,
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
        this.createResultImage(orderId, file.result.variants[0]);
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

      return this.ordersService.handleCompletedOrder(orderId);
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

  private downloadResultImages(urls: string[]): Promise<UploadResponse>[] {
    return urls.map(async (url) => {
      const response = await axios.get<ArrayBuffer>(url, {
        responseType: 'arraybuffer',
      });

      const file = await this.uploadService.upload(
        new Blob([response.data], { type: 'image/jpeg' }),
        'image.jpeg',
      );

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
