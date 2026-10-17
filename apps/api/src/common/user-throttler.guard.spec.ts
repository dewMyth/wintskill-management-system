import type { Request } from 'express';
import type { Profile } from '../generated/prisma/client.js';
import { UserThrottlerGuard } from './user-throttler.guard.js';

class TestGuard extends UserThrottlerGuard {
  tracker(req: Partial<Request>) {
    return this.getTracker(req as Request);
  }
}

describe('UserThrottlerGuard', () => {
  const guard = Object.create(TestGuard.prototype) as TestGuard;

  it('counts signed-in requests per user, so a shared IP does not throttle everyone', async () => {
    await expect(
      guard.tracker({ user: { id: 'u1' } as Profile, ip: '1.2.3.4' }),
    ).resolves.toBe('user:u1');
    await expect(
      guard.tracker({ user: { id: 'u2' } as Profile, ip: '1.2.3.4' }),
    ).resolves.toBe('user:u2');
  });

  it('counts anonymous requests per IP', async () => {
    await expect(guard.tracker({ ip: '1.2.3.4' })).resolves.toBe('ip:1.2.3.4');
  });
});
