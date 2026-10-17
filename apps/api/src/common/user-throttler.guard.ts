import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { Request } from 'express';

/**
 * Rate limits per signed-in user, and per IP only for anonymous requests. Everyone on the
 * academy's Wi-Fi shares one public IP, so a per-IP limit would throttle a whole class.
 */
@Injectable()
export class UserThrottlerGuard extends ThrottlerGuard {
  protected getTracker(req: Request): Promise<string> {
    return Promise.resolve(req.user ? `user:${req.user.id}` : `ip:${req.ip}`);
  }
}
