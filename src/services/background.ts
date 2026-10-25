import cron from 'node-cron';
import { settingsDb } from '../db/settings';
import { initDb } from '../db/init';
import { getCurrentLocalHour } from '../utils/date';
import { processNextFlight, expireOldFlights } from './scheduler';

// 1. Ensure DB exists before background worker starts querying it
initDb();
console.log("FlightSentry Background Worker initialized.");

// 2. Main Queue Loop (Strict Single Queue)
const startWorkerLoop = async () => {
  while (true) {
    try {
      const processedJob = await processNextFlight();
      
      if (processedJob) {
        // Delay Between Flights: Wait a random 1.5 to 3 minutes
        const delayMs = Math.floor(Math.random() * (180000 - 90000 + 1) + 90000);
        console.log(`Job complete. Sleeping for ${Math.round(delayMs / 1000)} seconds...`);
        await new Promise(res => setTimeout(res, delayMs));
      } else {
        // If no jobs are due or circuit breaker active, poll gently every 60 seconds
        await new Promise(res => setTimeout(res, 60000));
      }
    } catch (error) {
      console.error("Worker loop encountered an error:", error);
      await new Promise(res => setTimeout(res, 60000)); // Fallback sleep on crash
    }
  }
};

startWorkerLoop();

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