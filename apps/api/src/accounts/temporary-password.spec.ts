import { generateTemporaryPassword } from './temporary-password.js';

describe('generateTemporaryPassword', () => {
  it('is 12 readable characters with upper, lower and a digit', () => {
    for (let i = 0; i < 200; i++) {
      const password = generateTemporaryPassword();
      expect(password).toMatch(/^[A-HJ-NP-Za-km-z2-9]{12}$/);
      expect(password).toMatch(/[A-Z]/);
      expect(password).toMatch(/[a-z]/);
      expect(password).toMatch(/\d/);
    }
  });

  it('is different every time', () => {
    const passwords = new Set(
      Array.from({ length: 100 }, () => generateTemporaryPassword()),
    );
    expect(passwords.size).toBe(100);
  });
});
