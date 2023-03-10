import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { User } from '@prisma/client';
import { Observable } from 'rxjs';
import { PrismaService } from 'src/prisma.service';

declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Express.Request>();
    if (request.auth) {
      request.user = await this.prisma.user.findUnique({
        where: { id: request.auth.userId },
      });
      return true;
    }

    return false;
  }
}
