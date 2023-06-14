import clerkClient, { User } from '@clerk/clerk-sdk-node';
import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  async findOrCreateUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { uid: userId },
    });

    if (user) {
      return user;
    }

    return await this.prisma.user.create({
      data: {
        uid: userId,
      },
    });
  }

  async getClerkUserFromId(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    return clerkClient.users.getUser(user.uid);
  }
}
