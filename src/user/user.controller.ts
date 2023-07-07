import { Controller, Get } from '@nestjs/common';
import { User } from '@prisma/client';
import { CurrentUser } from './user.decorator';

@Controller('user')
export class UserController {
  @Get('/me')
  async getMe(@CurrentUser() user: User) {
    return user;
  }
}
