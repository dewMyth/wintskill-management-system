import {
  canonicalUsername,
  looksLikeRegistrationNo,
  STAFF_USERNAME,
} from './usernames.js';

describe('staff usernames', () => {
  it.each(['nimali', 'nimali.p', 'teacher_2', 'r-jay'])('accepts %s', (u) =>
    expect(STAFF_USERNAME.test(u)).toBe(true),
  );
  it.each(['ab', 'Nimali', '2nimali', 'nimali perera', 'a'.repeat(31)])(
    'rejects %s',
    (u) => expect(STAFF_USERNAME.test(u)).toBe(false),
  );

  it.each([
    'WINT/BB/2026/03/092',
    'wint/bb/2026/03/092',
    'bb-2026-03-092',
    'wint.bb.2026.3.92',
    'hd 2026 01 001',
  ])('detects registration-number shaped %s', (u) =>
    expect(looksLikeRegistrationNo(u)).toBe(true),
  );
  it.each(['nimali', 'hsc2026', 'teacher2026', 'nimali.p', 'bb.2026'])(
    'allows %s',
    (u) => expect(looksLikeRegistrationNo(u)).toBe(false),
  );
});

describe('canonicalUsername', () => {
  it.each([
    'WINT/BB/2026/03/092',
    ' wint/bb/2026/03/092 ',
    'BB/2026/03/092',
    'bb-2026-03-092',
    'wint bb 2026 3 92',
    'WINT.BB.2026.03.092',
  ])('turns %s into WINT/BB/2026/03/092', (typed) =>
    expect(canonicalUsername(typed)).toBe('WINT/BB/2026/03/092'),
  );

  it('keeps sequence numbers past 999', () =>
    expect(canonicalUsername('bb/2026/03/1000')).toBe('WINT/BB/2026/03/1000'));

  it('lower-cases staff usernames', () =>
    expect(canonicalUsername(' Nimali.P ')).toBe('nimali.p'));
});
