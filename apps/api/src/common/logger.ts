import { randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Params } from 'nestjs-pino';
import type { Env } from '../config/env.js';

/**
 * Request logs carry only these fields: no headers (tokens, cookies) and no bodies (passwords).
 */
export const logSerializers = {
  req: (req: IncomingMessage & { id: string }) => ({
    id: req.id,
    method: req.method,
    url: req.url,
  }),
  res: (res: ServerResponse) => ({ statusCode: res.statusCode }),
};

export function loggerParams(nodeEnv: Env['NODE_ENV']): Params {
  return {
    pinoHttp: {
      level: { production: 'info', development: 'debug', test: 'silent' }[
        nodeEnv
      ],
      serializers: logSerializers,
      genReqId: (_req, res) => {
        const id = randomUUID();
        res.setHeader('x-request-id', id);
        return id;
      },
      transport:
        nodeEnv === 'development'
          ? { target: 'pino-pretty', options: { singleLine: true } }
          : undefined,
    },
  };
}
