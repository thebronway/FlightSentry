import { NextRequest, NextResponse } from 'next/server';
import { settingsDb } from '@/db/settings';
import { flightDb } from '@/db/flights';
import { releaseSyncDb } from '@/db/releaseSync';
import { imapAccountsDb } from '@/db/imapAccounts';
import { checkAndResetQuota, canMakeApiCall } from '@/services/quota';
import { expireOldFlights } from '@/services/scheduler';
import { isPointsCurrency } from '@/utils/format';
import { requireApiAuth } from '@/services/auth/apiGuard';

export const dynamic = 'force-dynamic';

export interface ScheduledFlightTask {
  id: number;
  searchMode: 'Route' | 'FlightNumber';
  origin: string | null;
  destination: string | null;
  airline: string;
  flightNumber: string | null;
  departureDate: string;
  status: string;
  isManualOrPoints: boolean;
  isActiveQueue: boolean;
  nextCheckAt: string;
  proximityTier: string;
  cadenceHours: number;
  hasOverride: boolean;
}

export interface ScheduledSystemTask {
  id: string;
  name: string;
  scheduleLabel: string;
  nextRunAt: string | null;
  status: 'active' | 'paused' | 'disabled' | 'idle';
  details: string;
}

function getNextUtcDailyRun(hour: number, minute: number, now: Date): string {
  const candidate = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      hour,
      minute,
      0,
      0
    )
  );
  if (candidate.getTime() <= now.getTime()) {
    candidate.setUTCDate(candidate.getUTCDate() + 1);
  }
  return candidate.toISOString();
}

function getNextUtcHourlyRun(minute: number, now: Date, minAfterMs?: number): string {
  const candidate = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      now.getUTCHours(),
      minute,
      0,
      0
    )
  );
  while (
    candidate.getTime() <= now.getTime() ||
    (minAfterMs !== undefined && candidate.getTime() < minAfterMs)
  ) {
    candidate.setUTCHours(candidate.getUTCHours() + 1);
  }
  return candidate.toISOString();
}

export async function GET(req: NextRequest) {
  const authCheck = await requireApiAuth(req);
  if (authCheck.response) return authCheck.response;

  try {
    let settings = settingsDb.get();
    settings = checkAndResetQuota(settings);
    expireOldFlights(settings.timezone);

    const now = new Date();
    const allFlights = flightDb.getAll().filter((f) => f.status !== 'Past');

    const flightTasks: ScheduledFlightTask[] = allFlights.map((flight) => {
      let farOut = settings.scheduleFarOut;
      let standard = settings.scheduleStandard;
      let finalStretch = settings.scheduleFinalStretch;
      let hasOverride = false;

      if (flight.scheduleOverride) {
        try {
          const override = JSON.parse(flight.scheduleOverride);
          if (override && typeof override === 'object') {
            if (override.farOut !== undefined && override.farOut !== null && override.farOut !== '') {
              farOut = Number(override.farOut);
              hasOverride = true;
            }
            if (override.standard !== undefined && override.standard !== null && override.standard !== '') {
              standard = Number(override.standard);
              hasOverride = true;
            }
            if (override.finalStretch !== undefined && override.finalStretch !== null && override.finalStretch !== '') {
              finalStretch = Number(override.finalStretch);
              hasOverride = true;
            }
          }
        } catch {
          // Ignore malformed override JSON
        }
      }

      const departureDate = new Date(`${flight.departureDate}T00:00:00Z`);
      const daysUntilDeparture =
        (departureDate.getTime() - now.getTime()) / (1000 * 3600 * 24);

      let proximityTier = 'Far Out (>90d)';
      let cadenceHours = farOut;
      if (daysUntilDeparture <= 14) {
        proximityTier = 'Final Stretch (<14d)';
        cadenceHours = finalStretch;
      } else if (daysUntilDeparture <= 90) {
        proximityTier = 'Standard (14–90d)';
        cadenceHours = standard;
      }

      const isManualOrPoints =
        flight.isManual === 1 || isPointsCurrency(flight.currency);
      const isActiveQueue =
        (flight.status === 'Watching' || flight.status === 'Booked') &&
        !isManualOrPoints &&
        cadenceHours > 0;

      return {
        id: flight.id,
        searchMode: flight.searchMode,
        origin: flight.origin ?? null,
        destination: flight.destination ?? null,
        airline: flight.airline,
        flightNumber: flight.flightNumber ?? null,
        departureDate: flight.departureDate,
        status: flight.status,
        isManualOrPoints,
        isActiveQueue,
        nextCheckAt: flight.nextCheckAt,
        proximityTier,
        cadenceHours,
        hasOverride,
      };
    });

    flightTasks.sort((a, b) => {
      if (a.isActiveQueue !== b.isActiveQueue) {
        return a.isActiveQueue ? -1 : 1;
      }
      if (a.isActiveQueue && b.isActiveQueue) {
        return a.nextCheckAt.localeCompare(b.nextCheckAt);
      }
      return a.departureDate.localeCompare(b.departureDate);
    });

    const circuitBreakerActive = Boolean(
      settings.circuitBreakerUntil &&
        new Date(settings.circuitBreakerUntil) > now
    );
    const apiCallable = canMakeApiCall(settings);
    const activeFlightTasks = flightTasks.filter((t) => t.isActiveQueue);
    const nextFlightRunAt =
      activeFlightTasks.length > 0 ? activeFlightTasks[0].nextCheckAt : null;

    const retentionDays = settings.pastFlightRetentionDays;
    const retentionSummary =
      typeof retentionDays === 'number' && retentionDays > 0
        ? `Marks departed flights Past and purges records older than ${retentionDays} days.`
        : 'Marks departed flights Past (Retention set to Keep Forever).';

    const enabledImapAccounts = imapAccountsDb.getEnabled();
    const emailScannerEnabled = settings.emailScannerEnabled === 1;
    const pollMinutes = Math.max(5, settings.emailScannerPollIntervalMinutes || 15);
    let nextEmailScanAt: string | null = null;
    if (emailScannerEnabled && enabledImapAccounts.length > 0) {
      const lastCheckedMs = enabledImapAccounts
        .map((acc) => (acc.lastCheckedAt ? Date.parse(acc.lastCheckedAt) : NaN))
        .filter((ms) => !Number.isNaN(ms));
      if (lastCheckedMs.length > 0) {
        const latestCheck = Math.max(...lastCheckedMs);
        nextEmailScanAt = new Date(
          Math.max(now.getTime(), latestCheck + pollMinutes * 60 * 1000)
        ).toISOString();
      } else {
        nextEmailScanAt = now.toISOString();
      }
    }

    const githubEnabled = (settings.githubSyncEnabled ?? 1) === 1;
    const releaseSync = releaseSyncDb.get();
    let nextGithubSyncAt: string | null = null;
    if (githubEnabled) {
      const lastSyncMs = releaseSync.lastCheckedAt
        ? Date.parse(releaseSync.lastCheckedAt)
        : NaN;
      const minNextMs = !Number.isNaN(lastSyncMs)
        ? lastSyncMs + 24 * 60 * 60 * 1000
        : undefined;
      nextGithubSyncAt = getNextUtcHourlyRun(15, now, minNextMs);
    }

    const systemTasks: ScheduledSystemTask[] = [
      {
        id: 'price-check-loop',
        name: 'Automated Flight Price Check Worker',
        scheduleLabel: 'Polls every 60s (90–180s cooldown between checks)',
        nextRunAt: nextFlightRunAt,
        status:
          settings.globalPause === 1 || circuitBreakerActive || !apiCallable
            ? 'paused'
            : activeFlightTasks.length > 0
            ? 'active'
            : 'idle',
        details:
          settings.globalPause === 1
            ? 'Paused because Global Pause is enabled.'
            : circuitBreakerActive
            ? `Paused by circuit breaker until ${settings.circuitBreakerUntil}.`
            : !apiCallable
            ? 'Paused because no enabled data source has remaining quota.'
            : activeFlightTasks.length > 0
            ? `${activeFlightTasks.length} active ${activeFlightTasks.length === 1 ? 'flight' : 'flights'} queued.`
            : 'No active automated flights scheduled.',
      },
      {
        id: 'expiration-sweep',
        name: 'Past Flights Expiration & Retention Sweep',
        scheduleLabel: 'Daily at 00:00 UTC',
        nextRunAt: getNextUtcDailyRun(0, 0, now),
        status: 'active',
        details: retentionSummary,
      },
      {
        id: 'email-scanner',
        name: 'IMAP Email Scanner Polling',
        scheduleLabel: emailScannerEnabled
          ? `Every ${pollMinutes} minutes`
          : 'Disabled',
        nextRunAt: nextEmailScanAt,
        status: !emailScannerEnabled
          ? 'disabled'
          : enabledImapAccounts.length > 0
          ? 'active'
          : 'idle',
        details: !emailScannerEnabled
          ? 'Enable in Settings → Email Scanner to poll inboxes.'
          : enabledImapAccounts.length > 0
          ? `Monitoring ${enabledImapAccounts.length} enabled IMAP ${enabledImapAccounts.length === 1 ? 'inbox' : 'inboxes'}.`
          : 'Enabled, but no IMAP accounts are active.',
      },
      {
        id: 'github-sync',
        name: 'GitHub Release & Announcement Check',
        scheduleLabel: githubEnabled
          ? 'Evaluated hourly at :15 (fetches every 24h)'
          : 'Disabled',
        nextRunAt: nextGithubSyncAt,
        status: githubEnabled ? 'active' : 'disabled',
        details: githubEnabled
          ? 'Checks GitHub releases and global announcements with offline fallback.'
          : 'Automatic update checks disabled in Settings → General.',
      },
      {
        id: 'seen-messages-cleanup',
        name: 'Email Deduplication Cache Pruning',
        scheduleLabel: 'Daily at 00:30 UTC',
        nextRunAt: getNextUtcDailyRun(0, 30, now),
        status: 'active',
        details: 'Prunes processed Message-ID entries older than 90 days.',
      },
    ];

    return NextResponse.json(
      {
        timezone: settings.timezone || 'UTC',
        generatedAt: now.toISOString(),
        queueStatus: {
          globalPause: settings.globalPause === 1,
          circuitBreakerActive,
          circuitBreakerUntil: circuitBreakerActive
            ? settings.circuitBreakerUntil ?? null
            : null,
          canMakeApiCall: apiCallable,
        },
        flightTasks,
        systemTasks,
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    );
  } catch (error: any) {
    console.error('Error building scheduled tasks overview:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to load scheduled tasks' },
      { status: 500 }
    );
  }
}