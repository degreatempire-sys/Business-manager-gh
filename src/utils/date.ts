/**
 * Ghana (Africa/Accra) Business Date Utility
 * Ensures all transactions, calculations, reports, and displays
 * strictly follow the Ghana (UTC+0 / Africa/Accra) business calendar.
 */

export const ACCRA_TIMEZONE = 'Africa/Accra';

/**
 * Returns the current date in Africa/Accra as a 'YYYY-MM-DD' string.
 */
export function getAccraToday(): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: ACCRA_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(new Date());
}

/**
 * Safely extracts the 'YYYY-MM-DD' date string in Africa/Accra timezone.
 */
export function getAccraDateString(input?: string | Date | null): string {
  if (!input) return getAccraToday();

  // If already a plain YYYY-MM-DD string
  if (typeof input === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(input.trim())) {
    return input.trim();
  }

  // If an ISO date string starting with YYYY-MM-DD
  if (typeof input === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(input.trim())) {
    const d = new Date(input);
    if (!isNaN(d.getTime())) {
      const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: ACCRA_TIMEZONE,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
      return formatter.format(d);
    }
  }

  const d = typeof input === 'string' ? new Date(input) : input;
  if (isNaN(d.getTime())) {
    return getAccraToday();
  }

  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: ACCRA_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(d);
}

/**
 * Formats a date for display in standard Ghana business format: e.g. "01 Sep 2026".
 */
export function formatAccraDate(
  input?: string | Date | null,
  options?: Intl.DateTimeFormatOptions
): string {
  if (!input) return '-';

  const dateStr = getAccraDateString(input);
  const [yearStr, monthStr, dayStr] = dateStr.split('-');
  const year = parseInt(yearStr, 10);
  const monthIndex = parseInt(monthStr, 10) - 1;
  const day = parseInt(dayStr, 10);

  // Use UTC date constructed from explicit year/month/day to prevent local timezone shift
  const safeDate = new Date(Date.UTC(year, monthIndex, day, 12, 0, 0));

  const defaultOptions: Intl.DateTimeFormatOptions = {
    timeZone: ACCRA_TIMEZONE,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    ...options,
  };

  return new Intl.DateTimeFormat('en-GB', defaultOptions).format(safeDate);
}

/**
 * Formats a date and time for display in Ghana business format: e.g. "01 Sep 2026, 14:30".
 */
export function formatAccraDateTime(
  input?: string | Date | null,
  options?: Intl.DateTimeFormatOptions
): string {
  if (!input) return '-';
  const d = typeof input === 'string' ? new Date(input) : input;
  if (isNaN(d.getTime())) return '-';

  const defaultOptions: Intl.DateTimeFormatOptions = {
    timeZone: ACCRA_TIMEZONE,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    ...options,
  };

  return new Intl.DateTimeFormat('en-GB', defaultOptions).format(d);
}

/**
 * Returns yesterday's date in Africa/Accra as a 'YYYY-MM-DD' string.
 */
export function getAccraYesterday(): string {
  const today = getAccraToday();
  const [yearStr, monthStr, dayStr] = today.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const day = parseInt(dayStr, 10);

  const yesterdayUtc = new Date(Date.UTC(year, month - 1, day - 1, 12, 0, 0));
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: ACCRA_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(yesterdayUtc);
}

/**
 * Checks if a transaction date is "Today" according to the Ghana business calendar.
 */
export function isTodayInAccra(input?: string | Date | null): boolean {
  if (!input) return false;
  const transDate = getAccraDateString(input);
  const today = getAccraToday();
  return transDate === today;
}

/**
 * Checks if a transaction date is "Yesterday" according to the Ghana business calendar.
 */
export function isYesterdayInAccra(input?: string | Date | null): boolean {
  if (!input) return false;
  const transDate = getAccraDateString(input);
  const yesterday = getAccraYesterday();
  return transDate === yesterday;
}

/**
 * Checks if a transaction date falls in the past 7 days (including today) in Ghana.
 */
export function isPast7DaysInAccra(input?: string | Date | null): boolean {
  if (!input) return false;
  const transDate = getAccraDateString(input);
  const today = getAccraToday();

  const [tYear, tMonth, tDay] = today.split('-').map(Number);
  const [dYear, dMonth, dDay] = transDate.split('-').map(Number);

  const todayUtc = Date.UTC(tYear, tMonth - 1, tDay);
  const dateUtc = Date.UTC(dYear, dMonth - 1, dDay);

  const diffDays = (todayUtc - dateUtc) / (1000 * 60 * 60 * 24);
  return diffDays >= 0 && diffDays < 7;
}

/**
 * Checks if a transaction date falls in the current calendar month in Ghana.
 */
export function isThisMonthInAccra(input?: string | Date | null): boolean {
  if (!input) return false;
  const transDate = getAccraDateString(input);
  const today = getAccraToday();

  const transMonth = transDate.slice(0, 7); // 'YYYY-MM'
  const todayMonth = today.slice(0, 7);     // 'YYYY-MM'

  return transMonth === todayMonth;
}

/**
 * Formats a date in full long format: e.g. "Sunday, 6 September 2026".
 */
export function formatAccraLongDate(input?: string | Date | null): string {
  const dateStr = getAccraDateString(input);
  const [yearStr, monthStr, dayStr] = dateStr.split('-');
  const year = parseInt(yearStr, 10);
  const monthIndex = parseInt(monthStr, 10) - 1;
  const day = parseInt(dayStr, 10);
  const safeDate = new Date(Date.UTC(year, monthIndex, day, 12, 0, 0));

  return new Intl.DateTimeFormat('en-GB', {
    timeZone: ACCRA_TIMEZONE,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(safeDate);
}

/**
 * Returns the current hour in Africa/Accra timezone (0-23).
 */
export function getAccraHour(): number {
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: ACCRA_TIMEZONE,
    hour: 'numeric',
    hour12: false,
  });
  return parseInt(formatter.format(new Date()), 10);
}

/**
 * Returns a friendly Ghanaian business greeting based on Accra time of day.
 */
export function getAccraGreeting(): string {
  const hour = getAccraHour();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

