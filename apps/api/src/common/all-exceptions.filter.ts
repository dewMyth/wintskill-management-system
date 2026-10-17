import {
  Catch,
  HttpException,
  Logger,
  type ArgumentsHost,
  type ExceptionFilter,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Prisma } from '../generated/prisma/client.js';

export interface ErrorBody {
  statusCode: number;
  message: string | string[];
  code?: string;
}

/** Every error leaves the API as `{ statusCode, message, code?, requestId }`. Never a stack trace. */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const http = host.switchToHttp();
    const body = toErrorBody(exception);
    if (body.statusCode >= 500) this.logger.error(exception);
    http
      .getResponse<Response>()
      .status(body.statusCode)
      .json({ ...body, requestId: http.getRequest<Request>().id });
  }
}

export function toErrorBody(exception: unknown): ErrorBody {
  if (exception instanceof HttpException) {
    const res = exception.getResponse();
    if (typeof res === 'string')
      return { statusCode: exception.getStatus(), message: res };
    const { message, code } = res as Partial<ErrorBody>;
    return {
      statusCode: exception.getStatus(),
      message: message ?? exception.message,
      code,
    };
  }
  if (exception instanceof Prisma.PrismaClientKnownRequestError) {
    if (exception.code === 'P2002') {
      return {
        statusCode: 409,
        message: 'A record with these details already exists',
      };
    }
    if (exception.code === 'P2025')
      return { statusCode: 404, message: 'Not found' };
  }
  return { statusCode: 500, message: 'Internal server error' };
}
