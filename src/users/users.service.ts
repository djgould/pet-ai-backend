import { Injectable } from '@nestjs/common';

@Injectable()
export class UsersService {
  constructor() {}

  async currentUser(req) {
    return { email: 'djgould0628@gmail.com' };
  }
}
