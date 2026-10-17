import { ConflictException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';

/** Turns a unique-constraint violation into a 409 with a message the user understands. */
export async function withUniqueMessage<T>(
  work: Promise<T>,
  message: string,
): Promise<T> {
  try {
    return await work;
  } catch (e) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === 'P2002'
    ) {
      throw new ConflictException(message);
    }
    throw e;
  }
}
