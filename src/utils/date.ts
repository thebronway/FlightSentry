export const getCurrentLocalHour = (timezone: string): number => {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: 'numeric',
    hourCycle: 'h23',
  });
  return parseInt(formatter.format(new Date()), 10);
};

export const formatOrdinalDay = (day: number): string => {
  const j = day % 10;
  const k = day % 100;
  if (j === 1 && k !== 11) return `${day}st`;
  if (j === 2 && k !== 12) return `${day}nd`;
  if (j === 3 && k !== 13) return `${day}rd`;
  return `${day}th`;
};

export const calculateNextResetDate = (
  resetDay: number,
  timezone?: string | null
): string => {
  const clampedDay = Math.min(31, Math.max(1, Math.round(resetDay || 1)));
  const todayStr = getTodayDateString(timezone);
  const parts = todayStr.split('-');
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1; // 0-indexed month

  const getClampedDateStr = (y: number, m: number, d: number): string => {
    // Day 0 of month m+1 resolves to the final day of month m in UTC
    const maxDays = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
    const targetDay = Math.min(d, maxDays);
    const mm = String(m + 1).padStart(2, '0');
    const dd = String(targetDay).padStart(2, '0');
    return `${y}-${mm}-${dd}`;
  };

  // 1. Candidate in current month
  const candidateCurrent = getClampedDateStr(year, month, clampedDay);
  if (candidateCurrent > todayStr) {
    return candidateCurrent;
  }

  // 2. If already passed or today, candidate is in next month
  const nextMonth = (month + 1) % 12;
  const nextYear = month === 11 ? year + 1 : year;
  return getClampedDateStr(nextYear, nextMonth, clampedDay);
};

export const getNextMonthString = (): string => {
  const date = new Date();
  date.setMonth(date.getMonth() + 1);
  date.setDate(1);
  return date.toISOString().split('T')[0];
};

export const getNextMonthResetDate = (currentDateStr?: string | null): string => {
  const now = new Date();
  if (!currentDateStr || isNaN(new Date(currentDateStr).getTime())) {
    const d = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return d.toISOString().split('T')[0];
  }
  const parts = currentDateStr.split('-');
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1; // 0-indexed month
  const day = parseInt(parts[2], 10);

  // Advance by 1 month, handling calendar rollovers
  const nextDate = new Date(year, month + 1, day);
  if (nextDate.getDate() !== day) {
    // Clamps to last day of target month (e.g. Feb 31 -> Feb 28)
    nextDate.setDate(0);
  }
  return nextDate.toISOString().split('T')[0];
};

export const getSystemTimezone = (settingsTimezone?: string | null): string => {
  if (settingsTimezone && settingsTimezone !== 'UTC') {
    return settingsTimezone;
  }
  if (typeof process !== 'undefined' && process.env?.TZ) {
    return process.env.TZ;
  }
  if (typeof Intl !== 'undefined') {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    } catch {
      return 'UTC';
    }
  }
  return 'UTC';
};

export const getTodayDateString = (timezone?: string | null): string => {
  // Client-side browser: always return the client's local calendar date (never rolls to UTC tomorrow)
  if (typeof window !== 'undefined') {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // Server-side: resolve against container TZ or configured timezone
  const tz = getSystemTimezone(timezone);
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const parts = formatter.formatToParts(new Date());
    const year = parts.find(p => p.type === 'year')?.value;
    const month = parts.find(p => p.type === 'month')?.value;
    const day = parts.find(p => p.type === 'day')?.value;
    if (year && month && day) {
      return `${year}-${month}-${day}`;
    }
  } catch {
    // Fallback if the timezone name is invalid
  }
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const isFlightExpired = (departureDate: string, timezone: string): boolean => {
  const localToday = getTodayDateString(timezone);
  return localToday > departureDate;
};