import {
  emptyStudentForm,
  fromStudent,
  studentSchema,
  toPayload,
} from './student-form';
import type { StudentDetail } from './types';

const filled = () => ({
  ...emptyStudentForm('200412345678'),
  fullName: 'Nethmi Rajapaksha',
  nameWithInitials: 'N. Rajapaksha',
  dateOfBirth: '2004-02-11',
  address: 'Kottawa',
  mobilePhone: '0712223334',
});

describe('student form', () => {
  it('sends empty optional fields as null and only the levels that were filled in', () => {
    const values = filled();
    values.ol = {
      enabled: true,
      year: '2020',
      indexNo: '',
      subjects: [
        { subject: 'Sinhala', result: 'a' },
        { subject: '', result: '' },
      ],
    };
    const payload = toPayload(studentSchema.parse(values));
    expect(payload).toMatchObject({
      email: null,
      landPhone: null,
      guardianName: null,
      schoolAttended: null,
    });
    expect(payload.qualifications).toEqual([
      {
        level: 'OL',
        year: 2020,
        indexNo: null,
        subjects: [{ subject: 'Sinhala', result: 'A' }],
      },
    ]);
  });

  it('upper-cases the NIC and requires the mandatory fields', () => {
    expect(
      studentSchema.parse({ ...filled(), nicOrPassport: 'n1234567' })
        .nicOrPassport,
    ).toBe('N1234567');
    const result = studentSchema.safeParse(emptyStudentForm());
    expect(result.success).toBe(false);
    const missing = result.error!.issues.map((i) => i.path.join('.'));
    expect(missing).toEqual(
      expect.arrayContaining([
        'fullName',
        'nameWithInitials',
        'nicOrPassport',
        'dateOfBirth',
        'address',
        'mobilePhone',
      ]),
    );
  });

  it('needs a year for an enabled level and a result for every subject', () => {
    const values = filled();
    values.al = {
      enabled: true,
      year: '',
      indexNo: '',
      subjects: [{ subject: 'Biology', result: '' }],
    };
    const paths = studentSchema
      .safeParse(values)
      .error!.issues.map((i) => i.path.join('.'));
    expect(paths).toEqual(
      expect.arrayContaining(['al.year', 'al.subjects.0.result']),
    );
  });

  it('round-trips a saved student', () => {
    const student = {
      fullName: 'Kavindi Silva',
      nameWithInitials: 'K. Silva',
      nicOrPassport: '200112345678',
      dateOfBirth: '2001-04-12T00:00:00.000Z',
      address: 'Kottawa',
      schoolAttended: null,
      mobilePhone: '0711111111',
      landPhone: null,
      email: null,
      guardianName: 'S. Silva',
      guardianPhone: null,
      qualifications: [
        {
          level: 'OL',
          year: 2017,
          indexNo: '123',
          subjects: [{ subject: 'English', result: 'B' }],
        },
      ],
    } as unknown as StudentDetail;
    const values = fromStudent(student);
    expect(values.dateOfBirth).toBe('2001-04-12');
    expect(values.al.enabled).toBe(false);
    expect(toPayload(studentSchema.parse(values))).toMatchObject({
      guardianName: 'S. Silva',
      qualifications: [{ level: 'OL', year: 2017, indexNo: '123' }],
    });
  });
});
