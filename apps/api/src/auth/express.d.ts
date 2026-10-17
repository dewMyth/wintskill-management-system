import type { Profile } from '../generated/prisma/client.js';

declare global {
  namespace Express {
    interface Request {
      user?: Profile;
    }
  }
}
