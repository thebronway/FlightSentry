import cron from 'node-cron';
import { settingsDb } from '../db/settings';
import { initDb } from '../db/init';
import { getCurrentLocalHour } from '../utils/date';
import { runScheduledChecks, expireOldFlights } from './scheduler';

// 1. Ensure DB exists before background worker starts querying it
initDb();
console.log("🚀 FlightDocket Background Worker initialized.");

// 2. Main Polling Schedule (Runs at the top of every hour)
cron.schedule('0 * * * *', async () => {
  try {
    const settings = settingsDb.get();
    
    // Ignore if globally paused
    if (settings.globalPause === 1) return;

    // Parse the user's configured check hours (e.g., "[8, 14, 20]")
    const scheduledHours: number[] = JSON.parse(settings.checkHours);
    const localHour = getCurrentLocalHour(settings.timezone);

    if (scheduledHours.includes(localHour)) {
      console.log(`🕒 Triggering scheduled checks for hour: ${localHour}`);
      await runScheduledChecks();
    }
  } catch (error) {
    console.error("Worker error during hourly check:", error);
  }
});

// 3. Expiration Cleanup Schedule (Runs daily at midnight UTC)
cron.schedule('0 0 * * *', () => {
  try {
    console.log("🧹 Running daily flight expiration sweep.");
    const settings = settingsDb.get();
    expireOldFlights(settings.timezone);
  } catch (error) {
    console.error("Worker error during expiration sweep:", error);
  }
});