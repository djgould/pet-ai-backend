import { Test, TestingModule } from '@nestjs/testing';
import { ReplicateService } from './replicate.service';

describe('ReplicateService', () => {
  let service: ReplicateService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ReplicateService],
    }).compile();

    service = module.get<ReplicateService>(ReplicateService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
