import { academyDay } from './academy-day.js';

describe('academyDay', () => {
  it('uses the Sri Lankan date, not the UTC date', () => {
    // 20:00 UTC on 1 Nov is 01:30 on 2 Nov in Colombo.
    expect(academyDay(new Date('2026-11-01T20:00:00Z'))).toEqual({
      start: new Date('2026-11-01T18:30:00Z'),
      end: new Date('2026-11-02T18:30:00Z'),
    });
  });

  it('includes midnight and excludes the next midnight', () => {
    const { start, end } = academyDay(new Date('2026-11-01T18:30:00Z'));
    expect(start.toISOString()).toBe('2026-11-01T18:30:00.000Z');
    expect(academyDay(new Date(end.getTime() - 1)).start).toEqual(start);
  });
});
