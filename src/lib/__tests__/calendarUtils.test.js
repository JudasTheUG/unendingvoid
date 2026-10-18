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

      // Day advances to next date (current date > previous date) after long rest: resets to 2 short & 1 long rest!
      const day2Morning = calculateDailyRestStatus(
        { date: '2381-05-18', shortRestsUsed: 2, longRestsUsed: 1 },
        '2381-05-19T06:00:00'
      );
      expect(day2Morning.date).toBe('2381-05-19');
      expect(day2Morning.shortRestsLeft).toBe(2);
      expect(day2Morning.shortRestsUsed).toBe(0);
      expect(day2Morning.longRestsLeft).toBe(1);
      expect(day2Morning.longRestsUsed).toBe(0);
    });

    it('replenishes long rest and short rests when long rest starts after 16:01 and crosses midnight into tomorrow', () => {
      const { applyRestToUsage, calculateDailyRestStatus } = require('../calendarUtils');

      // Start: Day 1 at 18:00. Player has used 2 short rests today.
      const initialUsage = {
        date: '2381-05-18',
        shortRestsUsed: 2,
        shortRestDate: '2381-05-18',
        longRestsUsed: 0,
        longRestTaken: false,
      };

      // Player takes Long Rest (+8 hours) starting at 18:00 Day 1 -> ends at 02:00 Day 2!
      const afterRestUsage = applyRestToUsage(
        initialUsage,
        'long',
        '2381-05-18T18:00:00',
        '2381-05-19T02:00:00'
      );

      // Long rest belonged to Day 1, and now it has passed 23:59 into 00:00+ on Day 2 (tomorrow)
      expect(afterRestUsage.date).toBe('2381-05-19');
      expect(afterRestUsage.lastLongRestDate).toBe('2381-05-18');
      expect(afterRestUsage.longRestsUsed).toBe(0);
      expect(afterRestUsage.shortRestsUsed).toBe(0);

      // On Day 2 at 02:00, user has 2 short rests and 1 long rest available!
      const day2Status = calculateDailyRestStatus(afterRestUsage, '2381-05-19T02:00:00');
      expect(day2Status.longRestsLeft).toBe(1);
      expect(day2Status.shortRestsLeft).toBe(2);
      expect(day2Status.longRestsUsed).toBe(0);
      expect(day2Status.shortRestsUsed).toBe(0);
    });

    it('does NOT refill short rests on next date if NO long rest was taken', () => {
      const { calculateDailyRestStatus, applyRestToUsage } = require('../calendarUtils');

      // Day 1: Player uses 2 short rests and takes NO long rest
      const day1Usage = {
        date: '2381-05-18',
        shortRestsUsed: 2,
        shortRestDate: '2381-05-18',
        longRestsUsed: 0,
        longRestTaken: false,
      };

      // Day 2 (24h later): Date is different, but long rest was NOT taken!
      const day2WithoutLongRest = calculateDailyRestStatus(day1Usage, '2381-05-19T08:00:00');
      expect(day2WithoutLongRest.shortRestsLeft).toBe(0); // NOT refilled!
      expect(day2WithoutLongRest.shortRestsUsed).toBe(2);
      expect(day2WithoutLongRest.longRestsLeft).toBe(1); // New day long rest is available

      // Player takes a Long Rest on Day 2 (08:00 to 16:00)
      const afterDay2LongRest = applyRestToUsage(
        day1Usage,
        'long',
        '2381-05-19T08:00:00',
        '2381-05-19T16:00:00'
      );

      // Now date is different than day short rest was used (May 19 != May 18) AND long rest was taken!
      expect(afterDay2LongRest.shortRestsUsed).toBe(0); // Short rests from Day 1 are now refilled!
      expect(afterDay2LongRest.longRestsUsed).toBe(1); // Long rest used for Day 2

      const day2EveningStatus = calculateDailyRestStatus(afterDay2LongRest, '2381-05-19T16:00:00');
      expect(day2EveningStatus.shortRestsLeft).toBe(2);
      expect(day2EveningStatus.longRestsLeft).toBe(0);
    });
  });
});

