import { Flight, Settings } from '../types';

export const calculateNextCheck = (flight: Flight, settings: Settings): string => {
  // Parse custom override if it exists, otherwise use settings
  let farOut = settings.scheduleFarOut;
  let standard = settings.scheduleStandard;
  let finalStretch = settings.scheduleFinalStretch;

  if (flight.scheduleOverride) {
    try {
      const override = JSON.parse(flight.scheduleOverride);
      if (override.farOut) farOut = override.farOut;
      if (override.standard) standard = override.standard;
      if (override.finalStretch) finalStretch = override.finalStretch;
    } catch (e) {
      console.error(`Invalid scheduleOverride for flight ${flight.id}`);
    }
  }

  const now = new Date();
  const departureDate = new Date(flight.departureDate);
  const daysUntilDeparture = (departureDate.getTime() - now.getTime()) / (1000 * 3600 * 24);

  let hoursToAdd = farOut;
  if (daysUntilDeparture <= 14) {
    hoursToAdd = finalStretch;
  } else if (daysUntilDeparture <= 90) {
    hoursToAdd = standard;
  }

  const nextCheck = new Date(now.getTime() + hoursToAdd * 3600 * 1000);
  
  // Enforce Operating Hours (7 AM - 11 PM local)
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: settings.timezone,
    hour: 'numeric',
    hourCycle: 'h23',
  });
  const localHour = parseInt(formatter.format(nextCheck), 10);

  if (localHour < settings.operatingHoursStart || localHour >= settings.operatingHoursEnd) {
    // Push to the start of the next operating window with a 1-15 minute random delay
    nextCheck.setHours(nextCheck.getHours() + (24 - localHour + settings.operatingHoursStart));
    const randomDelay = Math.floor(Math.random() * 15 * 60000);
    return new Date(nextCheck.getTime() + randomDelay).toISOString();
  }

  return nextCheck.toISOString();
};