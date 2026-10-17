import { looksLikeRegistrationNo, STAFF_USERNAME } from './usernames.js';

describe('staff usernames', () => {
  it.each(['nimali', 'nimali.p', 'teacher_2', 'r-jay'])('accepts %s', (u) =>
    expect(STAFF_USERNAME.test(u)).toBe(true),
  );
  it.each(['ab', 'Nimali', '2nimali', 'nimali perera', 'a'.repeat(31)])(
    'rejects %s',
    (u) => expect(STAFF_USERNAME.test(u)).toBe(false),
  );

  it.each(['hsc2026a001', 'HSC2026A001', 'btc2027b12'])(
    'detects registration-number shaped %s',
    (u) => expect(looksLikeRegistrationNo(u)).toBe(true),
  );
  it.each(['nimali', 'hsc2026', 'teacher2026'])('allows %s', (u) =>
    expect(looksLikeRegistrationNo(u)).toBe(false),
  );
});
