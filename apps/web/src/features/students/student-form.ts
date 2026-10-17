import { z } from 'zod';
import { toDateInput } from '@/lib/format';
import type {
  Qualification,
  QualificationLevel,
  StudentDetail,
  StudentPayload,
} from './types';

const PHONE = /^\+?[0-9 -]{9,15}$/;
const PHONE_MESSAGE = 'Enter a phone number, e.g. 0771234567';

const optionalPhone = z
  .string()
  .trim()
  .refine((v) => !v || PHONE.test(v), PHONE_MESSAGE);

const subjectRow = z
  .object({
    subject: z.string().trim().max(60),
    result: z.string().trim().toUpperCase().max(5),
  })
  .superRefine((row, ctx) => {
    if (row.subject && !row.result)
      ctx.addIssue({
        code: 'custom',
        path: ['result'],
        message: 'Enter the result',
      });
    if (row.result && !row.subject)
      ctx.addIssue({
        code: 'custom',
        path: ['subject'],
        message: 'Enter the subject',
      });
  });

const qualification = z
  .object({
    enabled: z.boolean(),
    year: z.string().trim(),
    indexNo: z.string().trim().max(20),
    subjects: z.array(subjectRow).max(15),
  })
  .superRefine((q, ctx) => {
    const year = Number(q.year);
    if (
      q.enabled &&
      !(
        Number.isInteger(year) &&
        year >= 1950 &&
        year <= new Date().getFullYear()
      )
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['year'],
        message: 'Enter the exam year, e.g. 2019',
      });
    }
  });

/** The admission form. Empty optional fields are '' here and null in the API payload. */
export const studentSchema = z.object({
  fullName: z.string().trim().min(1, 'Enter the full name').max(150),
  nameWithInitials: z
    .string()
    .trim()
    .min(1, 'Enter the name with initials')
    .max(100),
  nicOrPassport: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9]{5,20}$/, 'Enter an NIC or passport number'),
  dateOfBirth: z.string().min(1, 'Enter the date of birth'),
  schoolAttended: z.string().trim().max(150),
  address: z.string().trim().min(1, 'Enter the address').max(300),
  mobilePhone: z.string().trim().regex(PHONE, PHONE_MESSAGE),
  landPhone: optionalPhone,
  email: z.union([z.literal(''), z.email('Enter a valid email address')]),
  guardianName: z.string().trim().max(150),
  guardianPhone: optionalPhone,
  ol: qualification,
  al: qualification,
});

export type StudentFormValues = z.infer<typeof studentSchema>;

/** Which fields each wizard step shows, so a step can be validated on its own. */
export const stepFields = {
  personal: [
    'fullName',
    'nameWithInitials',
    'nicOrPassport',
    'dateOfBirth',
    'schoolAttended',
  ],
  contact: [
    'address',
    'mobilePhone',
    'landPhone',
    'email',
    'guardianName',
    'guardianPhone',
  ],
  education: ['ol', 'al'],
} as const satisfies Record<string, (keyof StudentFormValues)[]>;

const emptyRows = () =>
  Array.from({ length: 3 }, () => ({ subject: '', result: '' }));
const emptyQualification = () => ({
  enabled: false,
  year: '',
  indexNo: '',
  subjects: emptyRows(),
});

export const emptyStudentForm = (nicOrPassport = ''): StudentFormValues => ({
  fullName: '',
  nameWithInitials: '',
  nicOrPassport,
  dateOfBirth: '',
  schoolAttended: '',
  address: '',
  mobilePhone: '',
  landPhone: '',
  email: '',
  guardianName: '',
  guardianPhone: '',
  ol: emptyQualification(),
  al: emptyQualification(),
});

const toQualification = (
  level: QualificationLevel,
  q: StudentFormValues['ol'],
): Qualification[] =>
  q.enabled
    ? [
        {
          level,
          year: Number(q.year),
          indexNo: q.indexNo || null,
          subjects: q.subjects.filter((s) => s.subject && s.result),
        },
      ]
    : [];

export const toPayload = (v: StudentFormValues): StudentPayload => ({
  fullName: v.fullName,
  nameWithInitials: v.nameWithInitials,
  nicOrPassport: v.nicOrPassport,
  dateOfBirth: v.dateOfBirth,
  schoolAttended: v.schoolAttended || null,
  address: v.address,
  mobilePhone: v.mobilePhone,
  landPhone: v.landPhone || null,
  email: v.email || null,
  guardianName: v.guardianName || null,
  guardianPhone: v.guardianPhone || null,
  qualifications: [
    ...toQualification('OL', v.ol),
    ...toQualification('AL', v.al),
  ],
});

const fromQualification = (q: Qualification | undefined) =>
  q
    ? {
        enabled: true,
        year: String(q.year),
        indexNo: q.indexNo ?? '',
        subjects: q.subjects.length ? q.subjects : emptyRows(),
      }
    : emptyQualification();

export const fromStudent = (s: StudentDetail): StudentFormValues => ({
  fullName: s.fullName,
  nameWithInitials: s.nameWithInitials,
  nicOrPassport: s.nicOrPassport,
  dateOfBirth: toDateInput(s.dateOfBirth),
  schoolAttended: s.schoolAttended ?? '',
  address: s.address,
  mobilePhone: s.mobilePhone ?? '',
  landPhone: s.landPhone ?? '',
  email: s.email ?? '',
  guardianName: s.guardianName ?? '',
  guardianPhone: s.guardianPhone ?? '',
  ol: fromQualification(s.qualifications.find((q) => q.level === 'OL')),
  al: fromQualification(s.qualifications.find((q) => q.level === 'AL')),
});
