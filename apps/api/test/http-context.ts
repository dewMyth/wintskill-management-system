import type { ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

/** Minimal ExecutionContext for guard tests. */
export function httpContext(req: Partial<Request>): ExecutionContext {
  return {
    getHandler: () => () => undefined,
    getClass: () => class {},
    switchToHttp: () => ({ getRequest: () => req }),
  } as unknown as ExecutionContext;
}
