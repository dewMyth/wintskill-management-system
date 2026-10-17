import { validateEnv } from './env.js';

const valid = {
  DATABASE_URL: 'postgresql://u:p@localhost:5432/db?schema=app',
  SUPABASE_URL: 'http://127.0.0.1:54321',
  SUPABASE_SECRET_KEY: 'sb_secret_x',
};

describe('validateEnv', () => {
  it('applies defaults to a valid config', () => {
    expect(validateEnv(valid)).toEqual({
      ...valid,
      NODE_ENV: 'development',
      PORT: 3000,
      MATERIAL_MAX_MB: 100,
      LOW_ATTENDANCE_PERCENT: 80,
    });
  });

  it('coerces PORT', () => {
    expect(validateEnv({ ...valid, PORT: '8080' }).PORT).toBe(8080);
  });

  it('fails fast naming the missing variable', () => {
    const { SUPABASE_SECRET_KEY: _, ...missing } = valid;
    expect(() => validateEnv(missing)).toThrow(/SUPABASE_SECRET_KEY/);
  });

  it('rejects a malformed URL', () => {
    expect(() => validateEnv({ ...valid, SUPABASE_URL: 'not a url' })).toThrow(
      /SUPABASE_URL/,
    );
  });
});
