/**
 * In-Game Calendar & Galactic Chronometer Utilities
 * Default Start: 18 May 2381 08:00
 */

export const DEFAULT_IN_GAME_TIME = '2381-05-18T08:00:00';

export const MONTH_NAMES = {
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  tr: ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'],
  de: ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'],
};

export const MONTH_ABBR = {
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  tr: ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'],
  de: ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'],
};

/**
 * Safely parse ISO date string into a Date instance
 */
export function parseGameTime(timeStr) {
  if (!timeStr) return new Date(2381, 4, 18, 8, 0, 0);
  if (timeStr instanceof Date && !isNaN(timeStr)) return new Date(timeStr);
  const match = String(timeStr).match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/);
  if (match) {
    const [, y, m, d, hh, mm, ss] = match;
    return new Date(Number(y), Number(m) - 1, Number(d), Number(hh), Number(mm), Number(ss || 0));
  }
  const d = new Date(timeStr);
  return isNaN(d.getTime()) ? new Date(2381, 4, 18, 8, 0, 0) : d;
}

/**
 * Serialize a Date instance into standard ISO string
 */
export function serializeGameTime(date) {
  const d = date instanceof Date ? date : parseGameTime(date);
  const pad = (n) => String(n).padStart(2, '0');
  const y = String(d.getFullYear()).padStart(4, '0');
  const m = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hh = pad(d.getHours());
  const mm = pad(d.getMinutes());
  const ss = pad(d.getSeconds());
  return `${y}-${m}-${day}T${hh}:${mm}:${ss}`;
}

/**
 * Format in-game date & time for localized sci-fi display
 * e.g., "18 May 2381 08:00" | "18 Mayıs 2381 08:00" | "18. Mai 2381 08:00"
 */
export function formatGameDateTime(timeStr, locale = 'en') {
  const d = parseGameTime(timeStr);
  const lang = (locale || 'en').toLowerCase().slice(0, 2);
  const monthIdx = d.getMonth();
  const months = MONTH_NAMES[lang] || MONTH_NAMES.en;
  const monthName = months[monthIdx] || 'May';
  const pad = (n) => String(n).padStart(2, '0');
  const day = d.getDate();
  const year = d.getFullYear();
  const hh = pad(d.getHours());
  const mm = pad(d.getMinutes());

  if (lang === 'de') {
    return `${day}. ${monthName} ${year} ${hh}:${mm}`;
  }
  return `${day} ${monthName} ${year} ${hh}:${mm}`;
}

/**
 * Advance in-game time by a given number of hours
 */
export function advanceGameTime(timeStr, hoursToAdd = 0) {
  const d = parseGameTime(timeStr);
  d.setHours(d.getHours() + Number(hoursToAdd || 0));
  return serializeGameTime(d);
}

/**
 * Advance in-game time by a given number of days (24 hours per day)
 */
export function advanceGameDays(timeStr, daysToAdd = 1) {
  return advanceGameTime(timeStr, Number(daysToAdd || 1) * 24);
}

/**
 * Set in-game time from discrete integer values
 */
export function setGameTimeFromInputs(year, month, day, hour, minute) {
  const d = new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), 0);
  return serializeGameTime(d);
}

export const MAX_SHORT_RESTS_PER_DAY = 2;
export const MAX_LONG_RESTS_PER_DAY = 1;

/**
 * Extracts the YYYY-MM-DD date string (ignoring hours/minutes/seconds)
 */
export function getGameDateString(timeStr) {
  if (!timeStr) return '2381-05-18';
  if (typeof timeStr === 'string' && timeStr.includes('T')) {
    return timeStr.split('T')[0];
  }
  const d = parseGameTime(timeStr);
  const pad = (n) => String(n).padStart(2, '0');
  return `${String(d.getFullYear()).padStart(4, '0')}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * Returns true if currentDate is strictly greater than previousDate (ignoring hours)
 */
export function isNextGameDay(currentDateStr, previousDateStr) {
  if (!currentDateStr || !previousDateStr) return false;
  const curr = getGameDateString(currentDateStr);
  const prev = getGameDateString(previousDateStr);
  return curr > prev;
}

/**
 * Calculates operative daily rest allowance based on in-game day progression.
 * Rules:
 * 1. Long rest belongs to the in-game day it was started. When time passes 23:59 into 00:00 (tomorrow),
 *    the long rest is replenished (1 available).
 * 2. Short rests can ONLY be refilled if date is different than day of short rest used
 *    AND a long rest has been taken.
 */
export function calculateDailyRestStatus(restUsage = {}, currentGameTime = DEFAULT_IN_GAME_TIME) {
  const currentDay = getGameDateString(currentGameTime);
  const recordedDay = restUsage?.date ? getGameDateString(restUsage.date) : currentDay;

  // 1. Long Rest Availability
  // A long rest is used for currentDay if the last long rest was charged to currentDay
  const lastLongRestDay = restUsage?.lastLongRestDate || (
    Number(restUsage?.longRestsUsed || 0) > 0 && recordedDay === currentDay ? recordedDay : null
  );
  const isLongRestUsedToday = Boolean(lastLongRestDay && lastLongRestDay === currentDay);
  const longRestsUsed = isLongRestUsedToday ? 1 : 0;
  const longRestsLeft = Math.max(0, MAX_LONG_RESTS_PER_DAY - longRestsUsed);

  // 2. Short Rest Availability
  // Rule: "short rests can only be refilled if date is different than day of short rest used and long rest is taken"
  const recordedShortUsed = Math.min(
    MAX_SHORT_RESTS_PER_DAY,
    Math.max(0, Number(restUsage?.shortRestsUsed || 0))
  );

  let shortRestsUsed = recordedShortUsed;

  if (recordedShortUsed > 0) {
    const shortDay = restUsage?.shortRestDate ? getGameDateString(restUsage.shortRestDate) : recordedDay;
    const isDifferentDate = currentDay > shortDay;
    const hasLongRested = Boolean(
      restUsage?.longRestTaken ||
      (lastLongRestDay && lastLongRestDay >= shortDay) ||
      (Number(restUsage?.longRestsUsed || 0) > 0 && recordedDay >= shortDay)
    );

    if (isDifferentDate && hasLongRested) {
      shortRestsUsed = 0;
    }
  }

  return {
    date: currentDay,
    shortRestsUsed,
    longRestsUsed,
    shortRestsLeft: Math.max(0, MAX_SHORT_RESTS_PER_DAY - shortRestsUsed),
    longRestsLeft,
    shortRestDate: restUsage?.shortRestDate || recordedDay,
    lastLongRestDate: lastLongRestDay,
    longRestTaken: Boolean(restUsage?.longRestTaken),
  };
}

/**
 * Applies a completed rest (short or long) to an operative's restUsage record.
 * - Long Rest (+8 hours):
 *   Belongs to the in-game day it was started (startDay).
 *   If the 8-hour rest crosses midnight (endDay > startDay), then upon entering tomorrow,
 *   both 1 long rest and 2 short rests are replenished.
 *   If completed within the same day, long rest is marked used for startDay, and any short rests
 *   from previous days are refilled.
 * - Short Rest (+2 hours):
 *   Consumes a short rest on startDay. Resets longRestTaken to false.
 */
export function applyRestToUsage(currentUsage = {}, restType = 'short', startTimeStr, endTimeStr) {
  const startDay = getGameDateString(startTimeStr || DEFAULT_IN_GAME_TIME);
  const endDay = getGameDateString(endTimeStr || advanceGameTime(startTimeStr || DEFAULT_IN_GAME_TIME, restType === 'long' ? 8 : 2));
  const currentStatus = calculateDailyRestStatus(currentUsage, startTimeStr || DEFAULT_IN_GAME_TIME);

  if (restType === 'long') {
    if (endDay > startDay) {
      // Crossed midnight (e.g. started after 16:01, or anytime passing 23:59 into 00:00 tomorrow)!
      // The long rest belonged to startDay.
      // Tomorrow (endDay) begins with 2 short rests and 1 long rest replenished!
      return {
        date: endDay,
        shortRestsUsed: 0,
        shortRestDate: endDay,
        longRestsUsed: 0,
        lastLongRestDate: startDay,
        longRestTaken: false,
      };
    } else {
      // Completed within the same day (e.g. 08:00 to 16:00)
      // If short rests were from a previous day, this long rest refills them!
      const shortDay = currentUsage?.shortRestDate ? getGameDateString(currentUsage.shortRestDate) : startDay;
      const hadShortRestFromPreviousDay = shortDay < startDay;
      const newShortUsed = hadShortRestFromPreviousDay ? 0 : currentStatus.shortRestsUsed;

      return {
        date: startDay,
        shortRestsUsed: newShortUsed,
        shortRestDate: hadShortRestFromPreviousDay ? startDay : shortDay,
        longRestsUsed: 1,
        lastLongRestDate: startDay,
        longRestTaken: true, // Long rest has been taken; refilling short rests when date advances
      };
    }
  }

  // Short Rest (+2 hours)
  const newShortUsed = Math.min(MAX_SHORT_RESTS_PER_DAY, currentStatus.shortRestsUsed + 1);
  return {
    date: endDay,
    shortRestsUsed: newShortUsed,
    shortRestDate: startDay,
    longRestsUsed: currentStatus.longRestsUsed,
    lastLongRestDate: currentUsage?.lastLongRestDate || (currentStatus.longRestsUsed > 0 ? startDay : null),
    longRestTaken: false, // New short rest used; requires a subsequent long rest to refill
  };
}
