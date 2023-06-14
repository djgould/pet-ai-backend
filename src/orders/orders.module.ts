import { BullModule, getQueueToken } from '@nestjs/bullmq';
import { forwardRef, Inject, MiddlewareConsumer, Module } from '@nestjs/common';
import { Queue } from 'bullmq';
import { AppModule } from 'src/app.module';
import { queuePool } from 'src/bull/bull.service';
import { EmailModule } from 'src/email/email.module';
import { InferenceModule } from 'src/inference/inference.module';
import { TrainingModule } from 'src/training/training.module';
import { OrdersController } from './orders.controller';
import { OrdersProcessor } from './orders.processor';
import { OrdersService } from './orders.service';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'orders',
    }),
    forwardRef(() => AppModule),
    forwardRef(() => InferenceModule),
    TrainingModule,
    EmailModule,
  ],
  controllers: [OrdersController],
  providers: [OrdersService, OrdersProcessor],
  exports: [OrdersService],
})
export class OrdersModule {
  @Inject(getQueueToken('orders'))
  private readonly queue: Queue;

  configure(_: MiddlewareConsumer) {
    queuePool.add(this.queue);
  }
}
