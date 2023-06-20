import { NestFactory, HttpAdapterHost } from '@nestjs/core';
import { AppModule } from './app.module';
import { PrismaService } from './prisma.service';
import * as multer from 'multer';
import { ValidationPipe } from '@nestjs/common';
import { createLogger, Logger } from 'winston';
import * as winston from 'winston';
import {
  WinstonModule,
  utilities as nestWinstonModuleUtilities,
} from 'nest-winston';
import { WinstonTransport as AxiomTransport } from '@axiomhq/axiom-node';
import * as Sentry from '@sentry/node';
import { SentryFilter } from './sentry.filter';
import { getBullBoardQueues } from './bull/bull.service';
import { ExpressAdapter } from '@bull-board/express';
import { createBullBoard } from '@bull-board/api';
import { BaseAdapter } from '@bull-board/api/dist/src/queueAdapters/base';

function initializeBullBoard(app: any) {
  const serverAdapter = new ExpressAdapter();

  serverAdapter.setBasePath('/admin/queues');
  app.use('/admin/queues', serverAdapter.getRouter());

  const { addQueue } = createBullBoard({
    queues: [],
    serverAdapter,
  });

  return { addQueue };
}

async function bootstrap() {
  const instance = createLogger({
    format: winston.format.json(),
    level: 'info',
    defaultMeta: { service: 'core', env: process.env.ENV },
    transports: [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.ms(),
          nestWinstonModuleUtilities.format.nestLike('MyApp', {
            colors: true,
            prettyPrint: true,
          }),
        ),
      }),
      new AxiomTransport(),
    ],
  });

  const app = await NestFactory.create(AppModule, {
    rawBody: true,
    bufferLogs: true,
    logger: WinstonModule.createLogger({
      instance,
    }),
  });

  Sentry.init({
    dsn: process.env.SENTRY_DNS,
  });

  const { httpAdapter } = app.get(HttpAdapterHost);
  app.useGlobalFilters(new SentryFilter(httpAdapter));

  app.useGlobalPipes(new ValidationPipe());
  const { addQueue } = initializeBullBoard(app);

  app.enableCors({
    exposedHeaders: ['Content-Range'],
  });
  await app.listen(process.env.PORT || 3000);

  const queues = getBullBoardQueues();
  queues.forEach((queue: BaseAdapter) => {
    addQueue(queue);
  });

  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
      cb(null, file.originalname);
    },
  });
  app.use(multer({ storage }).array('files'));

  const prismaService = app.get(PrismaService);
  await prismaService.enableShutdownHooks(app);
}
bootstrap();
