import { Test, TestingModule } from '@nestjs/testing';
import { TrainingImagesService } from './training_images.service';

describe('TrainingImagesService', () => {
  let service: TrainingImagesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TrainingImagesService],
    }).compile();

    service = module.get<TrainingImagesService>(TrainingImagesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
