import { NextRequest } from 'next/server';
import packageInfo from '../../../../../../package.json';
import { settingsDb } from '@/db/settings';
import { flightDb } from '@/db/flights';
import { emailQueueDb } from '@/db/emailQueue';
import { checkAndResetQuota } from '@/services/quota';
import { expireOldFlights } from '@/services/scheduler';
import { parseConfiguredPointsCurrencies } from '@/services/emailScanner/pointsMatcher';
import { requirePublicApiAuth } from '@/services/auth/apiGuard';
import {
  internalServerError,
  publicApiJson,
} from '@/services/publicApi/response';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const authCheck = await requirePublicApiAuth(req, 'read');
  if (authCheck.response) return authCheck.response;

  try {
    let settings = settingsDb.get();
    settings = checkAndResetQuota(settings);
    expireOldFlights(settings.timezone);

    const allFlights = flightDb.getAll();
    const flightCounts = {
      watching: 0,
      booked: 0,
      paused: 0,
      past: 0,
      total: allFlights.length,
    };

    for (const f of allFlights) {
      if (f.status === 'Watching') flightCounts.watching += 1;
      else if (f.status === 'Booked') flightCounts.booked += 1;
      else if (f.status === 'Paused') flightCounts.paused += 1;
      else if (f.status === 'Past') flightCounts.past += 1;
    }

    const circuitBreakerActive = Boolean(
      settings.circuitBreakerUntil &&
        new Date(settings.circuitBreakerUntil) > new Date()
    );

    const serpQuota = settings.serpApiQuota ?? 0;
    const serpUsed = settings.serpApiUsed ?? 0;
    const serpRemaining =
      serpQuota > 0 ? Math.max(0, serpQuota - serpUsed) : null;

    const searchQuota = settings.searchApiQuota ?? 0;
    const searchUsed = settings.searchApiUsed ?? 0;
    const searchRemaining =
      searchQuota > 0 ? Math.max(0, searchQuota - searchUsed) : null;

    const priorityOrder = (settings.dataSourceStrategy || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    return authCheck.finish(
      publicApiJson(
        {
          version: packageInfo.version,
          timezone: settings.timezone || 'UTC',
          activeCurrency: (settings.currency || 'USD').trim(),
          pointsCurrencies: parseConfiguredPointsCurrencies(
            settings.pointsCurrencies
          ),
          globalPause: settings.globalPause === 1,
          circuitBreaker: {
            active: circuitBreakerActive,
            until: circuitBreakerActive
              ? settings.circuitBreakerUntil ?? null
              : null,
          },
          flightCounts,
          emailQueue: {
            enabled: settings.emailScannerEnabled === 1,
            pendingCount: emailQueueDb.countPending(),
          },
          providers: {
            strategyMode: settings.fallbackStrategyMode || 'sequential-query',
            priorityOrder,
            serpapi: {
              enabled: settings.serpApiEnabled === 1,
              paused: settings.serpApiPaused === 1,
              configured: Boolean((settings.serpApiKey || '').trim()),
              quotaMode: settings.serpApiQuotaMode || 'monthly',
              quota: serpQuota,
              used: serpUsed,
              remaining: serpRemaining,
              resetDate: settings.serpApiResetDate || settings.quotaResetDate,
            },
            searchapi: {
              enabled: settings.searchApiEnabled === 1,
              paused: settings.searchApiPaused === 1,
              configured: Boolean((settings.searchApiKey || '').trim()),
              quotaMode: settings.searchApiQuotaMode || 'monthly',
              quota: searchQuota,
              used: searchUsed,
              remaining: searchRemaining,
              resetDate:
                settings.searchApiResetDate || settings.quotaResetDate,
            },
            flightsentryScraper: {
              enabled: settings.flightsentryScraperEnabled === 1,
              paused: settings.flightsentryScraperPaused === 1,
              configured: Boolean(
                (settings.flightsentryScraperUrl || '').trim() &&
                  (settings.flightsentryScraperApiKey || '').trim()
              ),
              prioritizeFirst:
                (settings.flightsentryScraperPrioritizeFirst ?? 1) === 1,
              used: settings.flightsentryScraperUsed ?? 0,
            },
          },
        },
        { rateLimit: authCheck.rateLimit }
      )
    );
  } catch (error) {
    console.error('[PublicAPI] GET /api/v1/system/status failed:', error);
    return authCheck.finish(
      internalServerError(
        'Failed to retrieve system status.',
        authCheck.rateLimit
      )
    );
  }
}