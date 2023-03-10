import { Injectable } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import axios from 'axios';
import { InferenceService } from 'src/inference/inference.service';
import { OrdersService } from 'src/orders/orders.service';
import { PrismaService } from 'src/prisma.service';
import { ReplicateService } from 'src/replicate/replicate.service';
import { UploadService } from 'src/upload/upload.service';
import { UploadManager } from 'upload-js-full';

@Injectable()
export class TrainingService {
  constructor(
    private prisma: PrismaService,
    private schedulerRegistry: SchedulerRegistry,
    private uploadService: UploadService,
    private inferenceService: InferenceService,
    private replicateService: ReplicateService,
  ) {}

  async startTraining(orderId) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        trainingImages: true,
      },
    });

    const response = await this.replicateService.createPrediction({
      version:
        '641855b7fa641ef22cb5e1db8c529b29f4b62f1d48d4c86ada1db54dc7a89e56',
      input: {
        // The prompt you use to describe your training images, in the format:
        // `a [identifier] [class noun]`, where the `[identifier]` should be a
        // rare token. Relatively short sequences with 1-3 letters work the
        // best (e.g. `sks`, `xjy`). `[class noun]` is a coarse class
        // descriptor of the subject (e.g. cat, dog, watch, etc.). For example,
        // your `instance_prompt` can be: `a sks dog`, or with some extra
        // description `a photo of a sks dog`. The trained model will learn to
        // bind a unique identifier with your specific subject in the
        // `instance_data`.
        // 'instance_prompt': ...,
        instance_prompt: 'A photo of sks dog',

        // The prompt or description of the coarse class of your training
        // images, in the format of `a [class noun]`, optionally with some
        // extra description. `class_prompt` is used to alleviate overfitting
        // to your customised images (the trained model should still keep the
        // learnt prior so that it can still generate different dogs when the
        // `[identifier]` is not in the prompt). Corresponding to the examples
        // of the `instant_prompt` above, the `class_prompt` can be `a dog` or
        // `a photo of a dog`.
        // 'class_prompt': ...,
        class_prompt: 'A photo of a dog',

        // A ZIP file containing your training images (JPG, PNG, etc. size not
        // restricted). These images contain your 'subject' that you want the
        // trained model to embed in the output domain for later generating
        // customized scenes beyond the training images. For best results, use
        // images without noise or unrelated objects in the background.
        // 'instance_data': open("path/to/file", "rb"),
        instance_data: order.trainingImagesZipUrl,

        // An optional ZIP file containing the training data of class images.
        // This corresponds to `class_prompt` above, also with the purpose of
        // keeping the model generalizable. By default, the pretrained stable-
        // diffusion model will generate N images (determined by the
        // `num_class_images` you set) based on the `class_prompt` provided.
        // But to save time or to have your preferred specific set of
        // `class_data`, you can also provide them in a ZIP file.
        // 'class_data': open("path/to/file", "rb"),
        class_data:
          'https://deving-pet-ai.s3.amazonaws.com/class_images_dog.zip',

        // Minimal class images for prior preservation loss. If not enough
        // images are provided in class_data, additional images will be sampled
        // with class_prompt.
        num_class_images: 800,

        // The prompt used to generate sample outputs to save.
        // 'save_sample_prompt': ...,
        save_sample_prompt: 'A photo of sks dog',

        // The negative prompt used to generate sample outputs to save.
        // 'save_sample_negative_prompt': ...,
        save_sample_negative_prompt: '',

        // The number of samples to save.
        n_save_sample: 4,

        // CFG for save sample.
        save_guidance_scale: 7.5,

        // The number of inference steps for save sample.
        save_infer_steps: 50,

        // Flag to pad tokens to length 77.
        pad_tokens: false,

        // Flag to add prior preservation loss.
        with_prior_preservation: true,

        // Weight of prior preservation loss.
        prior_loss_weight: 0.5,

        // A seed for reproducible training
        seed: 1337,

        // Whether to center crop images before resizing to resolution
        center_crop: false,

        // Whether to train the text encoder
        train_text_encoder: false,

        // Batch size (per device) for the training dataloader.
        train_batch_size: 2,

        // Batch size (per device) for sampling images.
        sample_batch_size: 4,

        // Num Train Epochs
        num_train_epochs: 1,

        // Total number of training steps to perform.  If provided, overrides
        // num_train_epochs.
        max_train_steps: 1000,

        // Number of updates steps to accumulate before performing a
        // backward/update pass.
        gradient_accumulation_steps: 2,

        // Whether or not to use gradient checkpointing to save memory at the
        // expense of slower backward pass.
        gradient_checkpointing: true,

        // Initial learning rate (after the potential warmup period) to use.
        learning_rate: 2e-6,

        // Scale the learning rate by the number of GPUs, gradient accumulation
        // steps, and batch size.
        scale_lr: false,

        // The scheduler type to use
        lr_scheduler: 'constant',

        // Number of steps for the warmup in the lr scheduler.
        lr_warmup_steps: 0,

        // Whether or not to use 8-bit Adam from bitsandbytes.
        use_8bit_adam: true,

        // The beta1 parameter for the Adam optimizer.
        adam_beta1: 0.9,

        // The beta2 parameter for the Adam optimizer.
        adam_beta2: 0.999,

        // Weight decay to use
        adam_weight_decay: 0.01,

        // Epsilon value for the Adam optimizer
        adam_epsilon: 1e-8,

        // Max gradient norm.
        max_grad_norm: 1,
      },
    });

    await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: OrdersService.STATUSES.TRAINING,
        replicateTrainingId: response.data.id,
        replicateStatus: response.data.status,
      },
    });

    this.trackTrainingProgress(orderId);
  }

  async trackTrainingProgress(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    const callback = async () => {
      const response = await this.replicateService.getPrediction(
        order.replicateTrainingId,
      );

      const { status } = response.data;

      if (
        status === 'succeeded' ||
        status === 'failed' ||
        status === 'canceled'
      ) {
        this.schedulerRegistry.deleteInterval(
          this.getTrainingIntervalName(orderId),
        );
        if (status === 'failed' || status === 'canceled') {
          await this.prisma.order.update({
            where: { id: orderId },
            data: {
              status: OrdersService.STATUSES.FAILED,
              replicateStatus: response.data.status,
            },
          });
        } else {
          this.saveModel(orderId, response.data.output[0]);
          this.inferenceService.startInference(orderId);
        }
      }
    };

    const interval = setInterval(callback, 60 * 1000);

    this.schedulerRegistry.addInterval(
      this.getTrainingIntervalName(orderId),
      interval,
    );
  }

  /**
   * Downloads model from replicate and uploads to upload.io using upload-js
   * @param orderId
   * @param modelUrl
   */
  private async saveModel(orderId: string, modelUrl: string) {
    const file = this.uploadService.upload({
      originalFileName: `${orderId}-trained-model.zip`,
      // this is probably the wrong way to do this
      data: (await axios.get(modelUrl, { responseType: 'blob' })).data.stream(),
    });

    await this.prisma.order.update({
      where: { id: orderId },
      data: {
        trainedModelUrl: (await file).fileUrl,
      },
    });
  }

  private getTrainingIntervalName(orderId: string) {
    return `${orderId}-training`;
  }
}
