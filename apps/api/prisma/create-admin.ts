/**
 * Creates one admin login, e.g. the first account on a fresh production
 * database. Prints a temporary password that must be changed at first sign-in.
 *
 *   pnpm --filter api db:create-admin <username> "<full name>" [phone]
 */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { generateTemporaryPassword } from '../src/accounts/temporary-password.js';
import {
  looksLikeRegistrationNo,
  STAFF_USERNAME,
} from '../src/accounts/usernames.js';
import { internalEmail } from '../src/auth/internal-email.js';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { createPrismaAdapter } from '../src/prisma/adapter.js';

const [username, fullName, phone] = process.argv.slice(2);
if (!username || !fullName?.trim()) {
  console.error('Usage: db:create-admin <username> "<full name>" [phone]');
  process.exit(1);
}
if (!STAFF_USERNAME.test(username) || looksLikeRegistrationNo(username)) {
  console.error(
    'username must be 3–30 lower-case letters, digits, dots, dashes or underscores, starting with a letter, and must not look like a registration number',
  );
  process.exit(1);
}

const prisma = new PrismaClient({
  adapter: createPrismaAdapter(process.env.DATABASE_URL!),
});
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

try {
  if (await prisma.profile.findUnique({ where: { username } }))
    throw new Error(`Username ${username} is already taken`);

  const temporaryPassword = generateTemporaryPassword();
  const { data, error } = await supabase.auth.admin.createUser({
    email: internalEmail(username),
    password: temporaryPassword,
    email_confirm: true,
  });
  if (error) throw error;

  try {
    await prisma.profile.create({
      data: {
        id: data.user.id,
        username,
        role: 'ADMIN',
        fullName: fullName.trim(),
        phone: phone?.trim() || null,
        mustChangePassword: true,
      },
    });
  } catch (err) {
    // Don't leave a login without a profile behind.
    await supabase.auth.admin.deleteUser(data.user.id);
    throw err;
  }

  console.log(
    `Admin ${username} created. Temporary password: ${temporaryPassword}`,
  );
  console.log('It must be changed at first sign-in.');
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
