import { Injectable } from '@nestjs/common';

@Injectable()
export class UsersService {
  constructor() {}

  async currentUser(req: Express.Request) {
    return { email: 'djgould0628@gmail.com' };
  }
}
