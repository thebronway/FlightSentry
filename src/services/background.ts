import cron from 'node-cron';
import { settingsDb } from '../db/settings';
import { initDb } from '../db/init';
import { getCurrentLocalHour } from '../utils/date';
import { processNextFlight, expireOldFlights } from './scheduler';
import { syncGitHubMetadata } from './githubSync';
import { scanAllEnabledAccounts } from './emailScanner';
import { sendEmailQueueAlert } from './notifications';
import { emailQueueDb } from '../db/emailQueue';

// 1. Ensure DB exists before background worker starts querying it
initDb();
console.log("FlightSentry Background Worker initialized.");
void syncGitHubMetadata({ force: false });

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

// 4. GitHub Release & Announcement Sync Check (Evaluated hourly; fetches at most once every 24h)
cron.schedule('15 * * * *', () => {
  void syncGitHubMetadata({ force: false });
});

// 5. Multi-Account IMAP Email Scanner Polling Loop
let lastEmailScanAtMs = 0;
let isEmailScanRunning = false;

const runScheduledEmailScan = async () => {
  if (isEmailScanRunning) return;
  try {
    const settings = settingsDb.get();
    if (settings.emailScannerEnabled !== 1) return;

    const intervalMinutes = Math.max(5, settings.emailScannerPollIntervalMinutes || 15);
    const intervalMs = intervalMinutes * 60 * 1000;
    const nowMs = Date.now();

    if (lastEmailScanAtMs > 0 && nowMs - lastEmailScanAtMs < intervalMs) {
      return;
    }

    isEmailScanRunning = true;
    lastEmailScanAtMs = nowMs;

    const result = await scanAllEnabledAccounts();
    if (result.totalEventsQueued > 0) {
      console.log(
        `[EmailScanner] Queued ${result.totalEventsQueued} new flight event(s) from ${result.scannedAccounts} inbox(es).`
      );
      await sendEmailQueueAlert(settings, result.queuedItems);
    }
  } catch (error) {
    console.error('[EmailScanner] Worker polling error:', error);
  } finally {
    isEmailScanRunning = false;
  }
};

void runScheduledEmailScan();
setInterval(() => {
  void runScheduledEmailScan();
}, 60 * 1000);

// 6. Prune aged Message-ID deduplication entries daily
cron.schedule('30 0 * * *', () => {
  try {
    emailQueueDb.pruneOldSeenMessages(90);
  } catch (error) {
    console.error('[EmailScanner] Error pruning old seen messages:', error);
  }
});