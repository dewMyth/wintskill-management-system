import { MAX_OCCURRENCES, weeklyOccurrences } from './occurrences.js';

const first = {
  startsAt: new Date('2026-11-02T03:30:00Z'),
  endsAt: new Date('2026-11-02T06:30:00Z'),
};

describe('weeklyOccurrences', () => {
  it('is just the first class without a repeat date', () => {
    expect(weeklyOccurrences(first)).toEqual([first]);
  });

  it('repeats weekly up to and including the last date', () => {
    const result = weeklyOccurrences(first, new Date('2026-11-23T18:29:59Z'))!;
    expect(result.map((o) => o.startsAt.toISOString())).toEqual([
      '2026-11-02T03:30:00.000Z',
      '2026-11-09T03:30:00.000Z',
      '2026-11-16T03:30:00.000Z',
      '2026-11-23T03:30:00.000Z',
    ]);
    expect(result[3].endsAt.toISOString()).toBe('2026-11-23T06:30:00.000Z');
  });

  it('ignores a repeat date before the first class', () => {
    expect(weeklyOccurrences(first, new Date('2026-10-01T00:00:00Z'))).toEqual([
      first,
    ]);
  });

  it(`refuses more than ${MAX_OCCURRENCES} classes`, () => {
    expect(
      weeklyOccurrences(first, new Date('2027-10-31T00:00:00Z')),
    ).toHaveLength(MAX_OCCURRENCES);
    expect(
      weeklyOccurrences(first, new Date('2027-11-30T00:00:00Z')),
    ).toBeNull();
  });
});
