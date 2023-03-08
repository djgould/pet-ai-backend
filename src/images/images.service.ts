import { Injectable } from '@nestjs/common';

@Injectable()
export class ImagesService {
  constructor(private prisma: PrismaService) {}

  async createImage(data) {
    return await this.prisma.image.create({ data });
  }
}
