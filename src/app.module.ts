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

declare global {
  namespace Express {
    interface Request extends LooseAuthProp {}
  }
}

@Module({
  imports: [ScheduleModule.forRoot()],
  controllers: [AppController, OrdersController],
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
  ],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(ClerkExpressWithAuth())
      .forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}
