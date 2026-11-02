import { Flight, Settings } from '../types';

export const calculateNextCheck = (flight: Flight, settings: Settings): string => {
  let farOut = settings.scheduleFarOut;
  let standard = settings.scheduleStandard;
  let finalStretch = settings.scheduleFinalStretch;

  if (flight.scheduleOverride) {
    try {
      const override = JSON.parse(flight.scheduleOverride);
      if (override.farOut !== undefined && override.farOut !== null && override.farOut !== '') {
        farOut = Number(override.farOut);
      }
      if (override.standard !== undefined && override.standard !== null && override.standard !== '') {
        standard = Number(override.standard);
      }
      if (override.finalStretch !== undefined && override.finalStretch !== null && override.finalStretch !== '') {
        finalStretch = Number(override.finalStretch);
      }
    } catch (e) {
      console.error(`Invalid scheduleOverride for flight ${flight.id}`);
    }
  }

  const now = new Date();
  const departureDate = new Date(`${flight.departureDate}T00:00:00Z`);
  const daysUntilDeparture = (departureDate.getTime() - now.getTime()) / (1000 * 3600 * 24);

  let hoursToAdd = farOut;
  if (daysUntilDeparture <= 14) {
    hoursToAdd = finalStretch;
  } else if (daysUntilDeparture <= 90) {
    hoursToAdd = standard;
  }

  const [startHStr, startMStr] = (settings.checkStartTime || '06:00').split(':');
  const startH = parseInt(startHStr || '6', 10);
  const startM = parseInt(startMStr || '0', 10);

  // Timezone calculation
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: settings.timezone || 'UTC',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    hourCycle: 'h23',
  });

  const parts = formatter.formatToParts(now);
  const getPart = (type: string) => parseInt(parts.find(p => p.type === type)?.value || '0', 10);

  const localYear = getPart('year');
  const localMonth = getPart('month') - 1;
  const localDay = getPart('day');
  const localHour = getPart('hour');
  const localMinute = getPart('minute');

  const localAsUtc = Date.UTC(localYear, localMonth, localDay, localHour, localMinute);
  const nowTruncUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), now.getUTCHours(), now.getUTCMinutes());
  const tzOffsetMs = localAsUtc - nowTruncUtc;

  // If current proximity window is "Do not check" (0 hrs), advance to next active stage
  if (hoursToAdd <= 0) {
    let targetDaysBefore: number | null = null;
    if (daysUntilDeparture > 90) {
      if (standard > 0) targetDaysBefore = 90;
      else if (finalStretch > 0) targetDaysBefore = 14;
    } else if (daysUntilDeparture > 14) {
      if (finalStretch > 0) targetDaysBefore = 14;
    }

    if (targetDaysBefore !== null) {
      const transitionTimeMs = departureDate.getTime() - (targetDaysBefore * 24 * 3600 * 1000);
      const transitionDate = new Date(transitionTimeMs);
      const targetAnchorLocalMs = Date.UTC(
        transitionDate.getUTCFullYear(),
        transitionDate.getUTCMonth(),
        transitionDate.getUTCDate(),
        startH,
        startM
      );
      let targetCheckMs = targetAnchorLocalMs - tzOffsetMs;
      if (targetCheckMs <= now.getTime()) {
        targetCheckMs = now.getTime() + 24 * 3600 * 1000;
      }
      return new Date(targetCheckMs).toISOString();
    } else {
      // No future checks configured; remain dormant until past departure
      return new Date(departureDate.getTime() + 24 * 3600 * 1000).toISOString();
    }
  }

  // Active check interval: anchor to start time and step forward
  const todayAnchorLocalMs = Date.UTC(localYear, localMonth, localDay, startH, startM);
  const todayAnchorActualMs = todayAnchorLocalMs - tzOffsetMs;
  const stepMs = Math.round(hoursToAdd * 3600 * 1000);
  let nextCheckMs: number;

  if (hoursToAdd >= 24) {
    const daysStepMs = Math.max(1, Math.round(hoursToAdd / 24)) * 24 * 3600 * 1000;
    let candidate = todayAnchorActualMs;
    while (candidate <= now.getTime()) {
      candidate += daysStepMs;
    }
    nextCheckMs = candidate;
  } else {
    let candidate = todayAnchorActualMs - (24 * 3600 * 1000);
    while (candidate <= now.getTime()) {
      candidate += stepMs;
    }
    nextCheckMs = candidate;
  }

  const jitterMs = Math.floor(Math.random() * 5 * 60 * 1000);
  return new Date(nextCheckMs + jitterMs).toISOString();
};