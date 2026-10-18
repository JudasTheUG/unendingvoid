import { describe, it, expect } from 'vitest';
import {
  DEFAULT_IN_GAME_TIME,
  parseGameTime,
  serializeGameTime,
  formatGameDateTime,
  advanceGameTime,
  advanceGameDays,
  setGameTimeFromInputs,
} from '../calendarUtils';

describe('calendarUtils - Galactic Chronometer Engine', () => {
  it('parses valid time string and falls back to default 2381-05-18T08:00:00 on empty input', () => {
    const defaultDate = parseGameTime('');
    expect(defaultDate.getFullYear()).toBe(2381);
    expect(defaultDate.getMonth()).toBe(4); // May (0-indexed)
    expect(defaultDate.getDate()).toBe(18);
    expect(defaultDate.getHours()).toBe(8);
    expect(defaultDate.getMinutes()).toBe(0);

    const parsed = parseGameTime('2381-05-18T08:00:00');
    expect(parsed.getFullYear()).toBe(2381);
    expect(parsed.getDate()).toBe(18);
    expect(parsed.getHours()).toBe(8);
  });

  it('serializes Date accurately into ISO-like game time string', () => {
    const d = new Date(2381, 4, 18, 8, 30, 0);
    expect(serializeGameTime(d)).toBe('2381-05-18T08:30:00');
  });

  it('formats in-game date and time for en, tr, and de locales', () => {
    const timeStr = '2381-05-18T08:00:00';

    expect(formatGameDateTime(timeStr, 'en')).toBe('18 May 2381 08:00');
    expect(formatGameDateTime(timeStr, 'tr')).toBe('18 Mayıs 2381 08:00');
    expect(formatGameDateTime(timeStr, 'de')).toBe('18. Mai 2381 08:00');
  });

  it('correctly advances time by 2 hours for Short Rest', () => {
    const start = '2381-05-18T08:00:00';
    const result = advanceGameTime(start, 2);
    expect(result).toBe('2381-05-18T10:00:00');
    expect(formatGameDateTime(result, 'en')).toBe('18 May 2381 10:00');
  });

  it('correctly advances time by 8 hours for Long Rest', () => {
    const start = '2381-05-18T08:00:00';
    const result = advanceGameTime(start, 8);
    expect(result).toBe('2381-05-18T16:00:00');
    expect(formatGameDateTime(result, 'en')).toBe('18 May 2381 16:00');
  });

  it('correctly rolls over midnight across days on consecutive rests', () => {
    const start = '2381-05-18T20:00:00';
    const afterLongRest = advanceGameTime(start, 8);
    expect(afterLongRest).toBe('2381-05-19T04:00:00');
    expect(formatGameDateTime(afterLongRest, 'en')).toBe('19 May 2381 04:00');
  });

  it('advances time by 24 hours for Skip Day button', () => {
    const start = '2381-05-18T08:00:00';
    const nextDay = advanceGameDays(start, 1);
    expect(nextDay).toBe('2381-05-19T08:00:00');
    expect(formatGameDateTime(nextDay, 'en')).toBe('19 May 2381 08:00');
  });

  it('sets custom discrete date and time values from manual inputs', () => {
    const custom = setGameTimeFromInputs(2382, 12, 25, 14, 45);
    expect(custom).toBe('2382-12-25T14:45:00');
    expect(formatGameDateTime(custom, 'en')).toBe('25 December 2382 14:45');
    expect(formatGameDateTime(custom, 'tr')).toBe('25 Aralık 2382 14:45');
  });

  describe('Daily Rest Allowance & Day Change Reset Engine', () => {
    it('correctly extracts YYYY-MM-DD date string ignoring time', () => {
      const { getGameDateString } = require('../calendarUtils');
      expect(getGameDateString('2381-05-18T08:00:00')).toBe('2381-05-18');
      expect(getGameDateString('2381-05-19T23:59:59')).toBe('2381-05-19');
    });

    it('identifies next game day by strictly comparing dates without comparing hours', () => {
      const { isNextGameDay } = require('../calendarUtils');
      // Later hours on the same date: NOT next day
      expect(isNextGameDay('2381-05-18T23:00:00', '2381-05-18T08:00:00')).toBe(false);

      // Earlier hour on subsequent date: IS next day (date > previous date)
      expect(isNextGameDay('2381-05-19T02:00:00', '2381-05-18T22:00:00')).toBe(true);

      // Earlier date: NOT next day
      expect(isNextGameDay('2381-05-17T08:00:00', '2381-05-18T08:00:00')).toBe(false);
    });

    it('enforces 2 short rests and 1 long rest per in-game day and resets on day change', () => {
      const { calculateDailyRestStatus } = require('../calendarUtils');

      // Day 1 initial status
      const day1Start = calculateDailyRestStatus({}, '2381-05-18T08:00:00');
      expect(day1Start.shortRestsLeft).toBe(2);
      expect(day1Start.longRestsLeft).toBe(1);

      // After 1 short rest on Day 1
      const afterShort1 = calculateDailyRestStatus(
        { date: '2381-05-18', shortRestsUsed: 1, longRestsUsed: 0 },
        '2381-05-18T10:00:00'
      );
      expect(afterShort1.shortRestsLeft).toBe(1);
      expect(afterShort1.longRestsLeft).toBe(1);

      // After 2 short rests on Day 1
      const afterShort2 = calculateDailyRestStatus(
        { date: '2381-05-18', shortRestsUsed: 2, longRestsUsed: 0 },
        '2381-05-18T12:00:00'
      );
      expect(afterShort2.shortRestsLeft).toBe(0);
      expect(afterShort2.longRestsLeft).toBe(1);

      // Hours advancing to evening on same date: limits remain exhausted
      const day1Evening = calculateDailyRestStatus(
        { date: '2381-05-18', shortRestsUsed: 2, longRestsUsed: 1 },
        '2381-05-18T22:00:00'
      );
      expect(day1Evening.shortRestsLeft).toBe(0);
      expect(day1Evening.longRestsLeft).toBe(0);

      // Day advances to next date after long rest: resets to 2 short & 1 long rest!
      const day2Morning = calculateDailyRestStatus(
        {
          date: '2381-05-18',
          primaryShortRestTime: '2381-05-18T10:00:00',
          secondaryShortRestTime: '2381-05-18T12:00:00',
          lastLongRestStartTime: '2381-05-18T14:00:00',
          lastLongRestDate: '2381-05-18',
        },
        '2381-05-19T06:00:00'
      );
      expect(day2Morning.date).toBe('2381-05-19');
      expect(day2Morning.shortRestsLeft).toBe(2);
      expect(day2Morning.shortRestsUsed).toBe(0);
      expect(day2Morning.longRestsLeft).toBe(1);
      expect(day2Morning.longRestsUsed).toBe(0);
    });

    it('sets long rest to 0/1 (used & disabled) when taken and ending on same day, and resets after midnight', () => {
      const { applyRestToUsage, calculateDailyRestStatus } = require('../calendarUtils');

      // Player takes Long Rest (+8 hours) starting at 10:00 -> ends at 18:00 on 18 May
      const afterRestUsage = applyRestToUsage(
        {},
        'long',
        '2381-05-18T10:00:00',
        '2381-05-18T18:00:00'
      );

      // Long rest is used (0/1 left, disabled) for the rest of 18 May
      expect(afterRestUsage.date).toBe('2381-05-18');
      expect(afterRestUsage.longRestsUsed).toBe(1);

      const statusSameDay = calculateDailyRestStatus(afterRestUsage, '2381-05-18T18:00:00');
      expect(statusSameDay.longRestsLeft).toBe(0); // 0/1 left, disabled on same day!

      // At midnight (00:00 on 19 May), long rest replenishes to 1/1!
      const statusMidnight = calculateDailyRestStatus(afterRestUsage, '2381-05-19T00:00:00');
      expect(statusMidnight.longRestsLeft).toBe(1); // 1/1 left, replenished on day change!
      expect(statusMidnight.longRestsUsed).toBe(0);
    });

    it('follows user scenario: short rest on 28 May, day skip to 29 May (not refilled), long rest crossing to 30 May refills both SR and LR', () => {
      const { applyRestToUsage, calculateDailyRestStatus } = require('../calendarUtils');

      // 1. Today is 28 May 2381, 15:00. SR=2, LR=1.
      const initial = calculateDailyRestStatus({}, '2381-05-28T15:00:00');
      expect(initial.shortRestsLeft).toBe(2);
      expect(initial.longRestsLeft).toBe(1);

      // 2. Use short rest (+2h): time is 17:00. SR=1, LR=1.
      const usageAfterSR = applyRestToUsage({}, 'short', '2381-05-28T15:00:00', '2381-05-28T17:00:00');
      const statusAfterSR = calculateDailyRestStatus(usageAfterSR, '2381-05-28T17:00:00');
      expect(statusAfterSR.shortRestsLeft).toBe(1);
      expect(statusAfterSR.longRestsLeft).toBe(1);

      // 3. Skip day: today is 29 May 2381, 17:00.
      // Short rest was NOT refilled because long rest was not taken!
      const statusDay2 = calculateDailyRestStatus(usageAfterSR, '2381-05-29T17:00:00');
      expect(statusDay2.shortRestsLeft).toBe(1); // STILL 1 short rest!
      expect(statusDay2.longRestsLeft).toBe(1);  // 1 long rest!

      // 4. Use long rest on 29 May 17:00 -> ends 30 May 01:00 (+8h).
      // During long rest, time advanced to new day 30 May which replenished LR!
      // And SR was taken on 28 May < 30 May + LR was taken on 29 May > 28 May, so SR replenishes!
      const usageAfterLR = applyRestToUsage(usageAfterSR, 'long', '2381-05-29T17:00:00', '2381-05-30T01:00:00');
      const statusDay3 = calculateDailyRestStatus(usageAfterLR, '2381-05-30T01:00:00');
      expect(statusDay3.date).toBe('2381-05-30');
      expect(statusDay3.longRestsLeft).toBe(1);  // 1/1 replenished!
      expect(statusDay3.shortRestsLeft).toBe(2); // 2/2 replenished!
    });

    it('does not double count short rest when applyRestToUsage is called idempotently with same start timestamp', () => {
      const { applyRestToUsage, calculateDailyRestStatus } = require('../calendarUtils');

      const firstCall = applyRestToUsage({}, 'short', '2381-05-28T15:00:00', '2381-05-28T17:00:00');
      expect(firstCall.shortRestsUsed).toBe(1);

      // Duplicate invocation with the same start timestamp
      const secondCall = applyRestToUsage(firstCall, 'short', '2381-05-28T15:00:00', '2381-05-28T17:00:00');
      expect(secondCall.shortRestsUsed).toBe(1); // STILL 1, not 2!

      const status = calculateDailyRestStatus(secondCall, '2381-05-28T17:00:00');
      expect(status.shortRestsLeft).toBe(1);
    });
  });
});

