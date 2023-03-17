import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsOptional,
  IsUrl,
  IsInt,
  validate,
} from 'class-validator';
import { plainToClass, Type } from 'class-transformer';

export class AppConfig {
  @IsNotEmpty()
  @IsUrl({
    protocols: ['mysql'],
  })
  DATABASE_URL: string;

  @IsNotEmpty()
  @IsString()
  CLERK_SECRET_KEY: string;

  @IsNotEmpty()
  @IsString()
  REPLICATE_API_KEY: string;

  @IsOptional()
  @IsString()
  TRAINING_IMAGE_VERSION: string;

  @IsNotEmpty()
  @IsString()
  QUEUE_REDIS_HOST: string;

  @IsNotEmpty()
  @IsInt()
  @Type(() => Number)
  QUEUE_REDIS_PORT: number;

  @IsNotEmpty()
  @IsString()
  AWS_ACCESS_KEY: string;

  @IsNotEmpty()
  @IsString()
  AWS_SECRET_ACCESS_KEY: string;
}

export async function validateConfig(config: Record<string, any>) {
  const appConfig = plainToClass(AppConfig, config);
  const errors = await validate(appConfig);

  if (errors.length > 0) {
    throw new Error(errors.toString());
  }
}
