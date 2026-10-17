import { PrismaPg } from '@prisma/adapter-pg';

/** Postgres adapter that honours `?schema=` in the connection string. */
export function createPrismaAdapter(databaseUrl: string) {
  const schema = new URL(databaseUrl).searchParams.get('schema') ?? 'public';
  // Fail instead of waiting forever when every pooled connection is busy.
  return new PrismaPg(
    { connectionString: databaseUrl, connectionTimeoutMillis: 10_000 },
    { schema },
  );
}
