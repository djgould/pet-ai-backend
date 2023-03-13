import { Logger, Module } from '@nestjs/common';
import { LoggerModule as PinoLoggerModule } from 'nestjs-pino';

@Module({
  providers: [Logger],
  exports: [Logger],
})
export class LoggerModule extends PinoLoggerModule {}
