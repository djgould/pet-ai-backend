import {
  Body,
  Controller,
  Get,
  Logger,
  Param,
  Post,
  Query,
  Req,
  Res,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { CurrentUser } from 'src/user/user.decorator';
import { Order, User } from '@prisma/client';
import { OrdersService } from './orders.service';
import { AuthGuard } from 'src/auth/auth.guard';
import axios from 'axios';
import { memoryStorage } from 'multer';
import { range } from 'rxjs';
import { UserService } from 'src/user/user.service';
import { TrainingService } from 'src/training/training.service';
import { InferenceService } from 'src/inference/inference.service';
import * as JSZip from 'jszip';
import { EmailService } from 'src/email/email.service';

export type WithETA<T> = T & { eta: number };

function withEta(order: Order): WithETA<Order> {
  // calculate eta by subtracting the elapsed time from 1900 seconds
  const eta = order.trainingStartedAt
    ? 1900 - Math.floor((Date.now() - order.trainingStartedAt.getTime()) / 1000)
    : 0;

  if (eta < 0) {
    return { ...order, eta: 0 };
  }

  return { ...order, eta };
}

@Controller('orders')
@UseGuards(AuthGuard)
export class OrdersController {
  private readonly logger = new Logger(OrdersController.name);

  constructor(
    private ordersService: OrdersService,
    private userService: UserService,
    private trainingService: TrainingService,
    private inferenceService: InferenceService,
    private emailService: EmailService,
  ) {}

  @Post(':id/download-selected')
  async downloadSelected(@Body('ids') ids: string[], @Param('id') id: string) {
    const order = await this.ordersService.getOrderById(id);
    const images = await this.ordersService.getResultImagesForOrder(id);

    const selectedImages = images.filter((image) => ids.includes(image.id));

    const zip = new JSZip();
    await Promise.all(
      selectedImages.map(async (resultImage, i) => {
        // download image from resultImage.url using axios and add to zip
        const response = await axios.get(resultImage.url, {
          responseType: 'arraybuffer',
        });
        zip.file(`image-${i}.jpeg`, response.data);
        console.log(`image-${i}.jpeg added to zip`);
      }),
    ).catch(this.logger.error);

    const zipFile = await zip.generateAsync({ type: 'nodebuffer' });

    return zipFile;
  }

  @Post(':id/free')
  async free(
    @Req() req: Express.Request,
    @CurrentUser() user: User,
    @Param('id') id: string,
  ) {
    await this.trainingService.startTraining(id);
    await this.emailService.sendFreeTierStarted(id);
  }

  @Post(':id/restart')
  async restartTraining(
    @Req() req: Express.Request,
    @CurrentUser() user: User,
    @Param('id') id: string,
  ) {
    const clerkUser = await this.userService.getClerkUserFromId(user.id);
    if (clerkUser.publicMetadata.role !== 'admin') {
      throw new Error('Unauthorized');
    }

    await this.trainingService.startTraining(id);
  }

  @Post(':id/restart-inference')
  async restartInference(
    @Req() req: Express.Request,
    @CurrentUser() user: User,
    @Param('id') id: string,
  ) {
    const clerkUser = await this.userService.getClerkUserFromId(user.id);
    if (clerkUser.publicMetadata.role !== 'admin') {
      throw new Error('Unauthorized');
    }

    await this.inferenceService.startInference(id);
  }

  @Post()
  @UseInterceptors(FilesInterceptor('files'))
  async createPendingOrder(
    @Req() req: Express.Request,
    @UploadedFiles() trainingImageFiles: Express.Multer.File[],
    @CurrentUser() user: User,
    @Body('urls') urls: string[],
  ) {
    const downloadedFiles: Express.Multer.File[] = await Promise.all(
      urls.map(async (url, i) => {
        const response = await axios.get(url, { responseType: 'arraybuffer' });

        const fileData = new Uint8Array(response.data);
        const fileBuffer = Buffer.from(fileData);
        const filename = url.split('/').pop();

        const file: Express.Multer.File = {
          fieldname: 'file',
          originalname: `a photo of <s1> dog_${i}.jpeg`,
          encoding: '7bit',
          mimetype: response.headers['content-type'],
          size: fileData.byteLength,
          destination: '',
          filename: `a photo of <s1> dog_${i}.jpeg`,
          path: '',
          buffer: fileBuffer,
          stream: null,
        };

        return file;
      }),
    );

    const order = await this.ordersService.createPendingOrder(user);
    return this.ordersService.addTrainingImagesToOrder(
      order.id,
      trainingImageFiles ? trainingImageFiles : downloadedFiles,
    );
  }

  @Get()
  async getOrders(
    @Req() req: Express.Request,
    @Res() res: any,
    @CurrentUser() user: User,
    @Query('range') range: string,
  ) {
    const clerkUser = await this.userService.getClerkUserFromId(user.id);
    if (clerkUser.publicMetadata.role === 'admin') {
      const orders = await this.ordersService.getAllOrders(range);
      const rangeStart = 0; // This should be calculated based on your pagination logic
      const rangeEnd = orders.length > 0 ? orders.length - 1 : 0;

      res.set(
        'Content-Range',
        `items ${rangeStart}-${rangeEnd}/${orders.length}`,
      );

      return res.json(orders.map(withEta));
    }

    const orders = await this.ordersService.getOrdersByUserId(user.id, range);
    const rangeStart = 0; // This should be calculated based on your pagination logic
    const rangeEnd = orders.length > 0 ? orders.length - 1 : 0;

    // Add Content-Range header
    res.set(
      'Content-Range',
      `items ${rangeStart}-${rangeEnd}/${orders.length}`,
    );

    return res.json(orders.map(withEta));
  }

  @Get(':id')
  async getOrder(@Req() req: Express.Request, @Param('id') id: string) {
    const order = await this.ordersService.getOrderById(id);
    return withEta(order);
  }
}
