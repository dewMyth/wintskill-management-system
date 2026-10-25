import { BATCH_CODE, nextBatchCode } from './batch-code.js';

describe('nextBatchCode', () => {
  it('starts at 01 for a new year', () => {
    expect(nextBatchCode(2026, [])).toBe('2026/01');
    expect(nextBatchCode(2027, ['2026/01', '2026/02'])).toBe('2027/01');
  });

  it('follows the highest intake number used this year', () => {
    expect(nextBatchCode(2026, ['2026/01', '2026/03', '2025/06'])).toBe(
      '2026/04',
    );
    expect(nextBatchCode(2026, ['2026/09'])).toBe('2026/10');
  });

  it('returns null when every intake number is used', () => {
    expect(nextBatchCode(2026, ['2026/99'])).toBeNull();
  });
});

describe('BATCH_CODE', () => {
  it.each(['2026/01', '2026/10', '1999/99'])('accepts %s', (code) =>
    expect(BATCH_CODE.test(code)).toBe(true),
  );
  it.each([
    '2026',
    '2026A',
    '2026/1',
    '2026/00',
    '2026/100',
    '2026-01',
    '26/01',
  ])('rejects %s', (code) => expect(BATCH_CODE.test(code)).toBe(false));
});
