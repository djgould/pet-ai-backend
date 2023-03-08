import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { PrismaService } from './prisma.service';
import multer from 'multer'

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(3000);

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
  await prismaService.enableShutdownHooks(app)
}
bootstrap();
