import { forwardRef, Module } from '@nestjs/common';
import { AppModule } from 'src/app.module';
import { EmailService } from './email.service';

@Module({
  imports: [forwardRef(() => AppModule)],
  exports: [EmailService],
  providers: [EmailService],
})
export class EmailModule {}
