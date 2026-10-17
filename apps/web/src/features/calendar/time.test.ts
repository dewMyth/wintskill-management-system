import {
  dayAfter,
  dayBefore,
  endOfDay,
  formatDayRange,
  localDate,
  localTime,
  toInstant,
} from './time';

describe('calendar time helpers', () => {
  it('round-trips local date and time through an instant', () => {
    const instant = toInstant('2026-11-02', '09:30');
    expect(localDate(new Date(instant))).toBe('2026-11-02');
    expect(localTime(new Date(instant))).toBe('09:30');
  });

  it('ends a day at its last millisecond (local time)', () => {
    const end = new Date(endOfDay('2026-11-02'));
    expect(localDate(end)).toBe('2026-11-02');
    expect(localDate(new Date(end.getTime() + 1))).toBe('2026-11-03');
  });

  it('moves across month and year ends', () => {
    expect(dayAfter('2026-12-31')).toBe('2027-01-01');
    expect(dayBefore('2027-03-01')).toBe('2027-02-28');
  });

  it('shows one day or a range for all-day events', () => {
    expect(
      formatDayRange(toInstant('2026-11-02'), toInstant('2026-11-03')),
    ).toBe('Mon 2 Nov');
    expect(
      formatDayRange(toInstant('2026-11-02'), toInstant('2026-11-05')),
    ).toBe('Mon 2 Nov – Wed 4 Nov');
  });
});
