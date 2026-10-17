import { logSerializers } from './logger.js';

describe('logSerializers', () => {
  it('logs only id, method and url of a request', () => {
    const req = {
      id: 'r1',
      method: 'POST',
      url: '/api/v1/me/password',
      headers: { authorization: 'Bearer secret-token', cookie: 'sid=secret' },
      body: { currentPassword: 'secret', newPassword: 'secret' },
    };
    const logged = JSON.stringify(logSerializers.req(req as never));
    expect(JSON.parse(logged)).toEqual({
      id: 'r1',
      method: 'POST',
      url: '/api/v1/me/password',
    });
    expect(logged).not.toContain('secret');
  });

  it('logs only the status code of a response', () => {
    const res = {
      statusCode: 200,
      getHeaders: () => ({ 'set-cookie': 'secret' }),
    };
    expect(logSerializers.res(res as never)).toEqual({ statusCode: 200 });
  });
});
