import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { toErrorBody } from './all-exceptions.filter.js';

const prismaError = (code: string) =>
  new Prisma.PrismaClientKnownRequestError('db error', {
    code,
    clientVersion: '7',
  });

describe('toErrorBody', () => {
  it('keeps the status and message of HTTP exceptions', () => {
    expect(toErrorBody(new NotFoundException('Course not found'))).toEqual({
      statusCode: 404,
      message: 'Course not found',
      code: undefined,
    });
  });

  it('keeps validation message lists', () => {
    expect(
      toErrorBody(new BadRequestException(['name must be a string'])).message,
    ).toEqual(['name must be a string']);
  });

  it('keeps a custom error code', () => {
    const body = toErrorBody(
      new ForbiddenException({
        code: 'PASSWORD_CHANGE_REQUIRED',
        message: 'Change it',
      }),
    );
    expect(body).toEqual({
      statusCode: 403,
      message: 'Change it',
      code: 'PASSWORD_CHANGE_REQUIRED',
    });
  });

  it('maps unique constraint violations to 409', () => {
    expect(toErrorBody(prismaError('P2002')).statusCode).toBe(409);
  });

  it('maps missing records to 404', () => {
    expect(toErrorBody(prismaError('P2025')).statusCode).toBe(404);
  });

  it('hides details of unexpected errors', () => {
    expect(
      toErrorBody(new Error('connection string postgres://secret')),
    ).toEqual({
      statusCode: 500,
      message: 'Internal server error',
    });
  });
});
