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
});
