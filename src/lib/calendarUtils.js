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
 * 1. Long Rest (1/day):
 *    Replenishes on day change (even if used at 23:59 on Day X, on 00:00 Day X+1 it will be replenished).
 *    Disabled (0/1) while still on the same in-game day that the long rest started.
 * 2. Short Rests (2/day):
 *    Replenishes if:
 *      short_rest_used_day_time < today AND
 *      last_long_rest_used_day_time > short_rest_used_day_time
 *    Short rests NEVER replenish on day change alone without a long rest taken after them.
 */
export function calculateDailyRestStatus(restUsage = {}, currentGameTime = DEFAULT_IN_GAME_TIME) {
  const currentDay = getGameDateString(currentGameTime);

  // Normalize inputs from restUsage (supporting current and legacy schemas)
  let primarySR = restUsage?.primaryShortRestTime || null;
  let secondarySR = restUsage?.secondaryShortRestTime || null;
  let lastLRStart = restUsage?.lastLongRestStartTime || null;
  let lastLREnd = restUsage?.lastLongRestEndTime || null;

  // Handle legacy schema
  if (!primarySR && !secondarySR && Number(restUsage?.shortRestsUsed || 0) > 0) {
    const fallbackSrDate = restUsage?.shortRestDate || restUsage?.date || currentDay;
    if (Number(restUsage.shortRestsUsed) >= 1) primarySR = `${getGameDateString(fallbackSrDate)}T10:00:00`;
    if (Number(restUsage.shortRestsUsed) >= 2) secondarySR = `${getGameDateString(fallbackSrDate)}T12:00:00`;
  }
  if (!lastLRStart && (restUsage?.lastLongRestDate || (Number(restUsage?.longRestsUsed || 0) > 0 && restUsage?.date))) {
    const fallbackLrDate = restUsage?.lastLongRestDate || restUsage?.date;
    lastLRStart = `${getGameDateString(fallbackLrDate)}T20:00:00`;
  }

  // 1. Long Rest:
  // "replanish LR on day change even if used at 23:59 X day on 00:00 X+1 day it will be replanished"
  let isLongRestUsedToday = false;
  if (lastLRStart) {
    const lrStartDay = getGameDateString(lastLRStart);
    if (currentDay === lrStartDay) {
      isLongRestUsedToday = true;
    }
  } else if (Number(restUsage?.longRestsUsed || 0) > 0) {
    const recordedDay = restUsage?.date ? getGameDateString(restUsage.date) : currentDay;
    if (currentDay === recordedDay) {
      isLongRestUsedToday = true;
    }
  }

  const longRestsUsed = isLongRestUsedToday ? 1 : 0;
  const longRestsLeft = Math.max(0, MAX_LONG_RESTS_PER_DAY - longRestsUsed);

  // 2. Short Rests:
  // "replanish SRs if short_rest_used_day_time < today + ( last_long_rest_used_day_time > primary_short_rest_used_day_time OR last_long_rest_used_day_time > secondary_short_rest_used_day_time )"
  const lastLrTimeMs = lastLRStart ? parseGameTime(lastLRStart).getTime() : 0;

  let activePrimarySR = primarySR;
  if (primarySR) {
    const sr1Day = getGameDateString(primarySR);
    const sr1TimeMs = parseGameTime(primarySR).getTime();
    if (sr1Day < currentDay && lastLrTimeMs > sr1TimeMs) {
      activePrimarySR = null; // Replenished!
    }
  }

  let activeSecondarySR = secondarySR;
  if (secondarySR) {
    const sr2Day = getGameDateString(secondarySR);
    const sr2TimeMs = parseGameTime(secondarySR).getTime();
    if (sr2Day < currentDay && lastLrTimeMs > sr2TimeMs) {
      activeSecondarySR = null; // Replenished!
    }
  }

  let shortRestsUsed = 0;
  if (activePrimarySR) shortRestsUsed++;
  if (activeSecondarySR) shortRestsUsed++;
  shortRestsUsed = Math.min(MAX_SHORT_RESTS_PER_DAY, shortRestsUsed);
  const shortRestsLeft = Math.max(0, MAX_SHORT_RESTS_PER_DAY - shortRestsUsed);

  return {
    date: currentDay,
    shortRestsUsed,
    shortRestsLeft,
    longRestsUsed,
    longRestsLeft,
    primaryShortRestTime: activePrimarySR,
    secondaryShortRestTime: activeSecondarySR,
    lastLongRestStartTime: lastLRStart,
    lastLongRestEndTime: lastLREnd,
    lastLongRestDate: lastLRStart ? getGameDateString(lastLRStart) : null,
    shortRestDate: activePrimarySR ? getGameDateString(activePrimarySR) : currentDay,
    longRestTaken: Boolean(lastLRStart),
  };
}

/**
 * Applies a completed rest (short or long) to an operative's restUsage record.
 * - Idempotent: Applying the same rest at the same start time does not consume duplicate slots.
 * - Long Rest: Sets lastLongRestStartTime, which replenishes on day change.
 * - Short Rest: Fills primary or secondary short rest slot.
 */
export function applyRestToUsage(currentUsage = {}, restType = 'short', startTimeStr, endTimeStr) {
  const start = startTimeStr || DEFAULT_IN_GAME_TIME;
  const hours = restType === 'long' ? 8 : 2;
  const end = endTimeStr || advanceGameTime(start, hours);

  const startDay = getGameDateString(start);
  const endDay = getGameDateString(end);

  const status = calculateDailyRestStatus(currentUsage, start);

  if (restType === 'long') {
    const newUsage = {
      date: endDay,
      primaryShortRestTime: status.primaryShortRestTime,
      secondaryShortRestTime: status.secondaryShortRestTime,
      lastLongRestStartTime: start,
      lastLongRestEndTime: end,
      lastLongRestDate: startDay,
      longRestTaken: true,
    };
    const endStatus = calculateDailyRestStatus(newUsage, end);
    return {
      ...newUsage,
      primaryShortRestTime: endStatus.primaryShortRestTime,
      secondaryShortRestTime: endStatus.secondaryShortRestTime,
      shortRestsUsed: endStatus.shortRestsUsed,
      longRestsUsed: endStatus.longRestsUsed,
      shortRestDate: endStatus.shortRestDate,
    };
  }

  // Short Rest (+2 hours)
  // Idempotency: if this exact start timestamp was already recorded, preserve it
  let newPrimarySR = status.primaryShortRestTime;
  let newSecondarySR = status.secondaryShortRestTime;

  if (newPrimarySR === start || newSecondarySR === start) {
    // Already recorded this short rest
  } else if (!newPrimarySR) {
    newPrimarySR = start;
  } else if (!newSecondarySR) {
    newSecondarySR = start;
  } else {
    // Both already active
    newSecondarySR = start;
  }

  const newUsage = {
    date: endDay,
    primaryShortRestTime: newPrimarySR,
    secondaryShortRestTime: newSecondarySR,
    lastLongRestStartTime: status.lastLongRestStartTime,
    lastLongRestEndTime: status.lastLongRestEndTime,
    lastLongRestDate: status.lastLongRestDate,
    longRestTaken: status.longRestTaken,
  };

  const endStatus = calculateDailyRestStatus(newUsage, end);
  return {
    ...newUsage,
    primaryShortRestTime: endStatus.primaryShortRestTime,
    secondaryShortRestTime: endStatus.secondaryShortRestTime,
    shortRestsUsed: endStatus.shortRestsUsed,
    longRestsUsed: endStatus.longRestsUsed,
    shortRestDate: endStatus.shortRestDate,
  };
}
