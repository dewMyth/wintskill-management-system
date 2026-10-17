import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Profile, Role } from '../generated/prisma/client.js';
import { RolesGuard } from './roles.guard.js';
import { httpContext } from '../../test/http-context.js';

function guardFor(roles: Role[] | undefined) {
  const reflector = new Reflector();
  vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(roles);
  return new RolesGuard(reflector);
}

const user = (role: Role) => ({ role }) as Profile;

describe('RolesGuard', () => {
  it('allows routes without @Roles', () => {
    expect(
      guardFor(undefined).canActivate(httpContext({ user: user('STUDENT') })),
    ).toBe(true);
  });

  it('allows a matching role', () => {
    expect(
      guardFor(['ADMIN', 'TEACHER']).canActivate(
        httpContext({ user: user('TEACHER') }),
      ),
    ).toBe(true);
  });

  it('rejects another role with 403', () => {
    expect(() =>
      guardFor(['ADMIN']).canActivate(httpContext({ user: user('STUDENT') })),
    ).toThrow(ForbiddenException);
  });
});
