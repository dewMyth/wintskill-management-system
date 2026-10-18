/**
 * Creates the academy's courses and modules (prisma/courses.ts). Safe to run
 * in production and to re-run: a course whose code already exists is skipped,
 * so edits the admin made in the app are never overwritten.
 */
import 'dotenv/config';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { createPrismaAdapter } from '../src/prisma/adapter.js';
import { courses } from './courses.js';

const prisma = new PrismaClient({
  adapter: createPrismaAdapter(process.env.DATABASE_URL!),
});

for (const { modules, ...course } of courses) {
  if (await prisma.course.findUnique({ where: { code: course.code } })) {
    console.log(`${course.code} already exists, skipped`);
    continue;
  }
  await prisma.course.create({
    data: {
      ...course,
      modules: {
        create: modules.map((m, sortOrder) => ({ ...m, sortOrder })),
      },
    },
  });
  console.log(`${course.code} created with ${modules.length} modules`);
}

await prisma.$disconnect();
