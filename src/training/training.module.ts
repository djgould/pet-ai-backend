import { BullModule, getQueueToken } from '@nestjs/bullmq';
import { forwardRef, Inject, MiddlewareConsumer, Module } from '@nestjs/common';
import { AppModule } from 'src/app.module';
import { InferenceModule } from 'src/inference/inference.module';
import { TrainingProcessor } from './training.processor';
import { TrainingService } from './training.service';
import { Queue } from 'bullmq';
import { queuePool } from 'src/bull/bull.service';

@Module({
  providers: [TrainingService, TrainingProcessor],
  exports: [TrainingService],
  imports: [
    BullModule.registerQueue({
      name: 'training',
    }),
    forwardRef(() => AppModule),
    forwardRef(() => InferenceModule),
  ],
})
export class TrainingModule {
  @Inject(getQueueToken('training'))
  private readonly queue: Queue;

  configure(_: MiddlewareConsumer) {
    queuePool.add(this.queue);
  }
}
