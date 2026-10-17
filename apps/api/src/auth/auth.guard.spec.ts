import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import type { Profile } from '../generated/prisma/client.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import { AuthGuard } from './auth.guard.js';
import { ALLOW_PENDING_PASSWORD, IS_PUBLIC } from './decorators.js';
import type { JwtVerifier } from './jwt-verifier.js';
import { httpContext } from '../../test/http-context.js';

const profile = {
  id: 'user-1',
  role: 'STUDENT',
  isActive: true,
  mustChangePassword: false,
} as Profile;

function setup(
  opts: {
    metadata?: Record<string, boolean>;
    profile?: Profile | null;
    tokenValid?: boolean;
  } = {},
) {
  const reflector = new Reflector();
  vi.spyOn(reflector, 'getAllAndOverride').mockImplementation(
    (key) => opts.metadata?.[key as string],
  );
  const verifier = {
    verify: vi.fn(async () => {
      if (opts.tokenValid === false) throw new Error('bad token');
      return 'user-1';
    }),
  } as unknown as JwtVerifier;
  const prisma = {
    profile: {
      findUnique: vi.fn(async () =>
        opts.profile === undefined ? profile : opts.profile,
      ),
    },
  } as unknown as PrismaService;
  return new AuthGuard(reflector, verifier, prisma);
}

const bearer = (): Partial<Request> => ({
  headers: { authorization: 'Bearer token' },
});

describe('AuthGuard', () => {
  it('lets public routes through without a token', async () => {
    await expect(
      setup({ metadata: { [IS_PUBLIC]: true } }).canActivate(
        httpContext({ headers: {} }),
      ),
    ).resolves.toBe(true);
  });

  it.each([
    ['no header', {}],
    ['a non-bearer scheme', { authorization: 'Basic abc' }],
    ['an empty bearer', { authorization: 'Bearer ' }],
  ])('rejects %s with 401', async (_, headers) => {
    await expect(setup().canActivate(httpContext({ headers }))).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('rejects an invalid or expired token with 401', async () => {
    await expect(
      setup({ tokenValid: false }).canActivate(httpContext(bearer())),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('rejects a token without a profile with 401', async () => {
    await expect(
      setup({ profile: null }).canActivate(httpContext(bearer())),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('rejects an inactive user with 401', async () => {
    await expect(
      setup({ profile: { ...profile, isActive: false } }).canActivate(
        httpContext(bearer()),
      ),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('blocks a user with a pending password change with 403 PASSWORD_CHANGE_REQUIRED', async () => {
    const guard = setup({ profile: { ...profile, mustChangePassword: true } });
    const error = await guard
      .canActivate(httpContext(bearer()))
      .catch((e: ForbiddenException) => e);
    expect(error).toBeInstanceOf(ForbiddenException);
    expect((error as ForbiddenException).getResponse()).toMatchObject({
      code: 'PASSWORD_CHANGE_REQUIRED',
    });
  });

  it('allows a pending password change on routes that permit it', async () => {
    const guard = setup({
      profile: { ...profile, mustChangePassword: true },
      metadata: { [ALLOW_PENDING_PASSWORD]: true },
    });
    await expect(guard.canActivate(httpContext(bearer()))).resolves.toBe(true);
  });

  it('attaches the profile to the request', async () => {
    const req = bearer();
    await expect(setup().canActivate(httpContext(req))).resolves.toBe(true);
    expect(req.user).toBe(profile);
  });
});
