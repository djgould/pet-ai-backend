import { TrainingImage } from '@prisma/client';

export type CreateTrainingImage = Omit<
  TrainingImage,
  'id' | 'orderId' | 'createdAt' | 'updatedAt'
>;
