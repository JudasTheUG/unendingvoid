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
