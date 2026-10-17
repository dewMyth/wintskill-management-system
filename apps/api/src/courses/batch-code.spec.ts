import { BATCH_CODE, nextBatchCode } from './batch-code.js';

describe('nextBatchCode', () => {
  it('starts at A for a new year', () => {
    expect(nextBatchCode(2026, [])).toBe('2026A');
    expect(nextBatchCode(2027, ['2026A', '2026B'])).toBe('2027A');
  });

  it('follows the highest letter used this year', () => {
    expect(nextBatchCode(2026, ['2026A', '2026C', '2025F'])).toBe('2026D');
  });

  it('returns null when every letter is used', () => {
    expect(nextBatchCode(2026, ['2026Z'])).toBeNull();
  });
});

describe('BATCH_CODE', () => {
  it.each(['2026A', '1999Z'])('accepts %s', (code) =>
    expect(BATCH_CODE.test(code)).toBe(true),
  );
  it.each(['2026', '2026a', '26A', '2026AB', 'A2026'])('rejects %s', (code) =>
    expect(BATCH_CODE.test(code)).toBe(false),
  );
});
