import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { User } from '@prisma/client';
import { Observable } from 'rxjs';
import { PrismaService } from 'src/prisma.service';
import { UserService } from 'src/user/user.service';

declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private userService: UserService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Express.Request>();

    if (!request.auth?.userId) {
      throw new UnauthorizedException();
    }

    const user = await this.userService.findOrCreateUser(request.auth.userId);
    request.user = user;
    return true;
  }
}
