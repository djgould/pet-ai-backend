import { MiddlewareConsumer, Module, RequestMethod } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { OrdersController } from './orders/orders.controller';
import { PrismaService } from './prisma.service';
import { OrdersService } from './orders/orders.service';
import { TrainingImagesService } from './training_images/training_images.service';
import { TrainingService } from './training/training.service';
import { ScheduleModule } from '@nestjs/schedule';
import { UploadService } from './upload/upload.service';
import { InferenceService } from './inference/inference.service';
import { ReplicateService } from './replicate/replicate.service';
import { ClerkExpressWithAuth, LooseAuthProp } from '@clerk/clerk-sdk-node';
import { UserService } from './user/user.service';
import { LoggerModule } from 'nestjs-pino';
import { S3Service } from './s3/s3.service';
import { HealthController } from './health/health.controller';

declare global {
  namespace Express {
    interface Request extends LooseAuthProp {}
  }
}

@Module({
  imports: [
    ScheduleModule.forRoot(),
    LoggerModule.forRoot({
      pinoHttp: {
        transport: {
          target: 'pino-syslog',
          options: {
            enablePipelining: false,
            destination: 1,
          },
        },
      },
    }),
  ],
  controllers: [AppController, OrdersController, HealthController],
  providers: [
    AppService,
    PrismaService,
    OrdersService,
    TrainingImagesService,
    TrainingService,
    UploadService,
    InferenceService,
    ReplicateService,
    UserService,
    S3Service,
  ],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(ClerkExpressWithAuth())
      .forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}
