/** Staff usernames: lower case, start with a letter, 3–30 characters. */
export const STAFF_USERNAME = /^[a-z][a-z0-9._-]{2,29}$/;

/** Student usernames are registration numbers such as HSC2026A001. Staff may not use that shape. */
export const looksLikeRegistrationNo = (username: string) =>
  /^[a-z]{2,6}\d{4}[a-z]\d+$/i.test(username);
