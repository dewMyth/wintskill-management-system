import {
  createParamDecorator,
  SetMetadata,
  type ExecutionContext,
} from '@nestjs/common';
import type { Request } from 'express';
import type { Profile, Role } from '../generated/prisma/client.js';

export const IS_PUBLIC = 'isPublic';
/** Skips authentication. */
export const Public = () => SetMetadata(IS_PUBLIC, true);

export const ALLOW_PENDING_PASSWORD = 'allowPendingPassword';
/** Reachable while the user still has to replace their temporary password. */
export const AllowPendingPasswordChange = () =>
  SetMetadata(ALLOW_PENDING_PASSWORD, true);

export const ROLES = 'roles';
export const Roles = (...roles: Role[]) => SetMetadata(ROLES, roles);

export const CurrentUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): Profile =>
    ctx.switchToHttp().getRequest<Request>().user!,
);
