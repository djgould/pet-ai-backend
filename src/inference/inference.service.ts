import { Injectable } from '@nestjs/common';
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
  constructor(
    private prisma: PrismaService,
    private schedulerRegistry: SchedulerRegistry,
    private uploadService: UploadService,
    private replicateService: ReplicateService,
  ) {}

  async startInference(orderId: string) {
    await this.prisma.order.update({
      where: { id: orderId },
      data: { status: OrdersService.STATUSES.INFERING },
    });

    for (const prompt of PROMPTS) {
      const request = {
        version:
          '641855b7fa641ef22cb5e1db8c529b29f4b62f1d48d4c86ada1db54dc7a89e56',
        prompt: prompt.prompt,
        negative_prompt: prompt.negative_prompt,
        width: 512,
        height: 512,
        prompt_strength: 0.8,
        num_outputs: 10,
        num_inference_steps: 50,
        guidance_scale: 7.5,
      };

      const response = await this.replicateService.createPrediction(request);

      await this.prisma.inferenceJob.create({
        data: {
          replicateId: response.data.id,
          status: response.data.status,
          prompt: request.prompt,
          negativePrompt: request.negative_prompt,
          version: request.version,
          width: request.width,
          height: request.height,
          numOutputs: request.num_outputs,
          numInferenceSteps: request.num_inference_steps,
          guidanceScale: request.guidance_scale,
          order: {
            connect: {
              id: orderId,
            },
          },
        },
      });

      this.trackInferenceJob(orderId, response.data.id);
    }

    return;
  }

  private async trackInferenceJob(orderId: string, inferenceJobId: string) {
    const callback = async () => {
      try {
        const response = await this.replicateService.getPrediction(
          inferenceJobId,
        );

        if (
          response.data.status === 'succeeded' ||
          response.data.status === 'failed' ||
          response.data.status === 'canceled'
        ) {
          if (response.data.status === 'succeeded') {
            await this.handleSuccess(orderId, inferenceJobId, response);
          } else {
            await this.handleFailure(orderId, inferenceJobId, response);
          }

          this.schedulerRegistry.deleteInterval(
            this.getInferenceIntervalName(inferenceJobId),
          );
        }
      } catch (error) {
        console.log(error);
        this.schedulerRegistry.deleteInterval(
          this.getInferenceIntervalName(inferenceJobId),
        );
      }
    };

    const interval = setInterval(callback, 60 * 1000);
    this.schedulerRegistry.addInterval(
      this.getInferenceIntervalName(inferenceJobId),
      interval,
    );
  }

  private async handleSuccess(
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
      this.downloadResultImages(response.data.output),
    );
    await Promise.all(
      files.map((file) => {
        this.createResultImage(orderId, file.fileUrl);
      }),
    );

    const jobs = await this.getAllInferenceJobForOrder(orderId);
    const statuses = jobs.map((job) => job.status);

    if (statuses.every((status) => status === 'succeeded')) {
      await this.prisma.order.update({
        where: { id: orderId },
        data: { status: OrdersService.STATUSES.COMPLETED },
      });
    }
  }

  private async handleFailure(
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

    await this.prisma.order.update({
      where: { id: orderId },
      data: { status: OrdersService.STATUSES.FAILED },
    });
  }

  private async getAllInferenceJobForOrder(orderId: string) {
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
      const response = await axios.get(url, { responseType: 'blob' });

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
