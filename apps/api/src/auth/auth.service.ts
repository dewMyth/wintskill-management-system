import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env.js';
import type { Profile } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  createServerClient,
  SUPABASE,
  type Supabase,
} from '../supabase/supabase.module.js';
import type { ChangePasswordDto } from './change-password.dto.js';
import { internalEmail } from './internal-email.js';

@Injectable()
export class AuthService {
  constructor(
    @Inject(SUPABASE) private readonly supabase: Supabase,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  /** Checks the current password, sets the new one and signs out the user's other sessions. */
  async changePassword(
    user: Profile,
    accessToken: string,
    dto: ChangePasswordDto,
  ) {
    // A separate client so the throwaway sign-in session never touches the shared admin client.
    const { error: signInError } = await createServerClient(
      this.config,
    ).auth.signInWithPassword({
      email: internalEmail(user.username),
      password: dto.currentPassword,
    });
    if (signInError)
      throw new BadRequestException('Current password is incorrect');

    const { error } = await this.supabase.auth.admin.updateUserById(user.id, {
      password: dto.newPassword,
    });
    if (error) throw new BadRequestException(error.message);

    await this.prisma.profile.update({
      where: { id: user.id },
      data: { mustChangePassword: false },
    });
    await this.supabase.auth.admin.signOut(accessToken, 'others');
  }
}
