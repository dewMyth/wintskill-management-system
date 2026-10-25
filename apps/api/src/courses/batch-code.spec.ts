import { nextBatchCode } from './batch-code.js';

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
