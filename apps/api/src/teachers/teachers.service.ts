import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { AccountsService } from '../accounts/accounts.service.js';
import { looksLikeRegistrationNo } from '../accounts/usernames.js';
import type { Profile } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { CreateTeacherDto, UpdateTeacherDto } from './teachers.dto.js';

const toTeacher = (p: Profile, avatarUrl: string | null) => ({
  id: p.id,
  username: p.username,
  fullName: p.fullName,
  phone: p.phone,
  email: p.email,
  isActive: p.isActive,
  mustChangePassword: p.mustChangePassword,
  avatarUrl,
});

@Injectable()
export class TeachersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accounts: AccountsService,
  ) {}

  async list() {
    const teachers = await this.prisma.profile.findMany({
      where: { role: 'TEACHER' },
      orderBy: [{ isActive: 'desc' }, { fullName: 'asc' }],
    });
    const urls = await this.accounts.photoUrls(
      teachers.map((t) => t.avatarPath),
    );
    return teachers.map((t) =>
      toTeacher(t, t.avatarPath ? (urls.get(t.avatarPath) ?? null) : null),
    );
  }

  /** Creates the login and profile; returns the temporary password once. */
  async create(dto: CreateTeacherDto) {
    if (looksLikeRegistrationNo(dto.username)) {
      throw new BadRequestException(
        'This username looks like a student registration number. Choose another.',
      );
    }
    if (
      await this.prisma.profile.findUnique({
        where: { username: dto.username },
      })
    ) {
      throw new ConflictException(`Username ${dto.username} is already taken`);
    }
    const { userId, temporaryPassword } = await this.accounts.createLogin(
      dto.username,
    );
    try {
      const profile = await this.prisma.profile.create({
        data: {
          id: userId,
          role: 'TEACHER',
          username: dto.username,
          fullName: dto.fullName,
          phone: dto.phone,
          email: dto.email,
        },
      });
      return {
        teacher: toTeacher(profile, null),
        username: dto.username,
        temporaryPassword,
      };
    } catch (error) {
      await this.accounts.deleteLogin(userId);
      throw error;
    }
  }

  async update(id: string, dto: UpdateTeacherDto) {
    const profile = await this.prisma.profile.update({
      where: { id, role: 'TEACHER' },
      data: { fullName: dto.fullName, phone: dto.phone, email: dto.email },
    });
    return toTeacher(profile, await this.accounts.photoUrl(profile.avatarPath));
  }
}
