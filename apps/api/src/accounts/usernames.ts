/** Staff usernames: lower case, start with a letter, 3–30 characters. */
export const STAFF_USERNAME = /^[a-z][a-z0-9._-]{2,29}$/;

const SEP = '[\\s./-]+';
/**
 * A registration number as someone might type it: WINT/BB/2026/03/092, bb-2026-3-92, ...
 * The WINT prefix is optional and any of / - . or spaces separate the parts.
 */
const TYPED_REGISTRATION_NO = new RegExp(
  `^(?:wint${SEP})?([a-z]{2,6})${SEP}(\\d{4})${SEP}(\\d{1,2})${SEP}(\\d{1,4})$`,
  'i',
);

/** Student usernames are registration numbers such as WINT/BB/2026/03/092. Staff may not use that shape. */
export const looksLikeRegistrationNo = (username: string) =>
  TYPED_REGISTRATION_NO.test(username.trim());

/** The stored form of a typed username: WINT/BB/2026/03/092 for students, lower case for staff. */
export function canonicalUsername(typed: string) {
  const m = TYPED_REGISTRATION_NO.exec(typed.trim());
  if (!m) return typed.trim().toLowerCase();
  const [, course, year, intake, seq] = m;
  return `WINT/${course.toUpperCase()}/${year}/${intake.padStart(2, '0')}/${seq.padStart(3, '0')}`;
}
