import { Controller, Get, UseGuards } from '@nestjs/common';
import { User } from '@prisma/client';
import { AuthGuard } from 'src/auth/auth.guard';
import { CurrentUser } from './user.decorator';

@Controller('user')
@UseGuards(AuthGuard)
export class UserController {
  @Get('/me')
  async getMe(@CurrentUser() user: User) {
    return user;
  }
}
