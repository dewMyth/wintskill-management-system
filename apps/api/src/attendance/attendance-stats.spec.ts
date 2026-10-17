import { attendanceStats } from './attendance-stats.js';

describe('attendanceStats', () => {
  it('counts late as attended', () => {
    expect(attendanceStats(['PRESENT', 'LATE', 'ABSENT', 'PRESENT'])).toEqual({
      present: 2,
      late: 1,
      absent: 1,
      excused: 0,
      percentage: 75,
    });
  });

  it('leaves excused classes out of the percentage', () => {
    expect(
      attendanceStats(['PRESENT', 'EXCUSED', 'EXCUSED', 'ABSENT']).percentage,
    ).toBe(50);
  });

  it('rounds to one decimal', () => {
    expect(attendanceStats(['PRESENT', 'PRESENT', 'ABSENT']).percentage).toBe(
      66.7,
    );
  });

  it('has no percentage when nothing counts', () => {
    expect(attendanceStats([]).percentage).toBeNull();
    expect(attendanceStats(['EXCUSED']).percentage).toBeNull();
  });
});
