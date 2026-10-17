import { Body, Controller, Get, Headers, HttpCode, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Profile } from '../generated/prisma/client.js';
import { AccountsService } from '../accounts/accounts.service.js';
import { AuthService } from './auth.service.js';
import { ChangePasswordDto } from './change-password.dto.js';
import { AllowPendingPasswordChange, CurrentUser } from './decorators.js';

@Controller('me')
@AllowPendingPasswordChange()
export class MeController {
  constructor(
    private readonly auth: AuthService,
    private readonly accounts: AccountsService,
  ) {}

  /** The signed-in profile, with a short-lived link to its photo. */
  @Get()
  async me(@CurrentUser() user: Profile) {
    return {
      ...user,
      avatarUrl: await this.accounts.photoUrl(user.avatarPath),
    };
  }

  @Post('password')
  @HttpCode(204)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  changePassword(
    @CurrentUser() user: Profile,
    @Headers('authorization') authorization: string,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.auth.changePassword(
      user,
      authorization.slice('Bearer '.length),
      dto,
    );
  }
}
