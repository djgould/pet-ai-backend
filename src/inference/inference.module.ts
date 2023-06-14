import { BullModule, getQueueToken } from '@nestjs/bullmq';
import { forwardRef, Inject, MiddlewareConsumer, Module } from '@nestjs/common';
import { Queue } from 'bullmq';
import { AppModule } from 'src/app.module';
import { queuePool } from 'src/bull/bull.service';
import { OrdersModule } from 'src/orders/orders.module';
import { InferenceProcessor } from './inference.processor';
import { InferenceService } from './inference.service';

@Module({
  providers: [InferenceService, InferenceProcessor],
  exports: [InferenceService],
  imports: [
    forwardRef(() => AppModule),
    BullModule.registerQueue({
      name: 'inference',
    }),
    OrdersModule,
  ],
})
export class InferenceModule {
  @Inject(getQueueToken('inference'))
  private readonly queue: Queue;

  configure(_: MiddlewareConsumer) {
    queuePool.add(this.queue);
  }
}
