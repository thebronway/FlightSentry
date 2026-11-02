export const getCurrentLocalHour = (timezone: string): number => {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: 'numeric',
    hourCycle: 'h23',
  });
  return parseInt(formatter.format(new Date()), 10);
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

export const isFlightExpired = (departureDate: string, timezone: string): boolean => {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  
  // Format returns MM/DD/YYYY, we need to compare it against YYYY-MM-DD
  const parts = formatter.formatToParts(new Date());
  const year = parts.find(p => p.type === 'year')?.value;
  const month = parts.find(p => p.type === 'month')?.value;
  const day = parts.find(p => p.type === 'day')?.value;
  
  const localToday = `${year}-${month}-${day}`;
  
  // If the local current date string is lexicographically greater than the departure date, it has passed.
  return localToday > departureDate;
};