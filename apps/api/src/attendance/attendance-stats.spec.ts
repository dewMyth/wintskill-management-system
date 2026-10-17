import { attendanceStats, statsFromCounts } from './attendance-stats.js';

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

describe('statsFromCounts', () => {
  it('matches attendanceStats for the same records', () => {
    expect(statsFromCounts({ PRESENT: 2, LATE: 1, ABSENT: 1 })).toEqual(
      attendanceStats(['PRESENT', 'LATE', 'ABSENT', 'PRESENT']),
    );
  });
});
