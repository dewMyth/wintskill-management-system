import { randomUUID } from 'node:crypto';
import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { internalEmail } from '../auth/internal-email.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { SUPABASE, type Supabase } from '../supabase/supabase.module.js';
import { generateTemporaryPassword } from './temporary-password.js';

const AVATARS = 'avatars';
const PHOTO_URL_SECONDS = 60 * 60;
const extensions: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

/** Supabase Auth logins, temporary passwords and profile photos. */
@Injectable()
export class AccountsService {
  constructor(
    @Inject(SUPABASE) private readonly supabase: Supabase,
    private readonly prisma: PrismaService,
  ) {}

  /** Creates a login with a temporary password. The caller creates the profile. */
  async createLogin(username: string) {
    const temporaryPassword = generateTemporaryPassword();
    const { data, error } = await this.supabase.auth.admin.createUser({
      email: internalEmail(username),
      password: temporaryPassword,
      email_confirm: true,
    });
    if (error?.code === 'email_exists')
      throw new ConflictException(`Username ${username} is already taken`);
    if (error) throw error;
    return { userId: data.user.id, temporaryPassword };
  }

  async deleteLogin(userId: string) {
    await this.supabase.auth.admin.deleteUser(userId);
  }

  /** Issues a new temporary password; the user must replace it at next sign-in. */
  async resetPassword(profileId: string) {
    const profile = await this.prisma.profile.findUniqueOrThrow({
      where: { id: profileId },
    });
    const temporaryPassword = generateTemporaryPassword();
    const { error } = await this.supabase.auth.admin.updateUserById(profileId, {
      password: temporaryPassword,
    });
    if (error) throw error;
    await this.prisma.profile.update({
      where: { id: profileId },
      data: { mustChangePassword: true },
    });
    return { username: profile.username, temporaryPassword };
  }

  async setActive(profileId: string, isActive: boolean) {
    const {
      id,
      username,
      isActive: active,
    } = await this.prisma.profile.update({
      where: { id: profileId },
      data: { isActive },
    });
    return { id, username, isActive: active };
  }

  /** Stores a new photo (already validated as JPEG/PNG/WebP) and removes the old one. */
  async setPhoto(
    profileId: string,
    file: { buffer: Buffer; mimetype: string },
  ) {
    const profile = await this.prisma.profile.findUniqueOrThrow({
      where: { id: profileId },
    });
    const path = `${profileId}/${randomUUID()}.${extensions[file.mimetype]}`;
    const { error } = await this.supabase.storage
      .from(AVATARS)
      .upload(path, file.buffer, { contentType: file.mimetype });
    if (error) throw error;
    await this.prisma.profile.update({
      where: { id: profileId },
      data: { avatarPath: path },
    });
    if (profile.avatarPath)
      await this.supabase.storage.from(AVATARS).remove([profile.avatarPath]);
    return { avatarUrl: await this.photoUrl(path) };
  }

  /** Short-lived URL for a private photo. */
  async photoUrl(path: string | null) {
    if (!path) return null;
    const { data, error } = await this.supabase.storage
      .from(AVATARS)
      .createSignedUrl(path, PHOTO_URL_SECONDS);
    if (error) throw error;
    return data.signedUrl;
  }

  /** Signed URLs for many photos in one call, keyed by path. */
  async photoUrls(paths: (string | null)[]) {
    const wanted = paths.filter((p): p is string => !!p);
    if (!wanted.length) return new Map<string, string>();
    const { data, error } = await this.supabase.storage
      .from(AVATARS)
      .createSignedUrls(wanted, PHOTO_URL_SECONDS);
    if (error) throw error;
    return new Map(
      data.flatMap((d) =>
        d.path && d.signedUrl ? [[d.path, d.signedUrl] as const] : [],
      ),
    );
  }
}
