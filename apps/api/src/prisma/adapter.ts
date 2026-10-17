import { PrismaPg } from '@prisma/adapter-pg';

/** Postgres adapter that honours `?schema=` in the connection string. */
export function createPrismaAdapter(databaseUrl: string) {
  const schema = new URL(databaseUrl).searchParams.get('schema') ?? 'public';
  return new PrismaPg({ connectionString: databaseUrl }, { schema });
}
