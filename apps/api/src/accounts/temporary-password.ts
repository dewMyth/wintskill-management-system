import { randomInt } from 'node:crypto';

// No look-alike characters (0/O, 1/l/I) so it can be read out or written down.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';

/** 12 random characters with at least one upper-case letter, lower-case letter and digit. */
export function generateTemporaryPassword(length = 12): string {
  for (;;) {
    const password = Array.from(
      { length },
      () => ALPHABET[randomInt(ALPHABET.length)],
    ).join('');
    if (/[A-Z]/.test(password) && /[a-z]/.test(password) && /\d/.test(password))
      return password;
  }
}
