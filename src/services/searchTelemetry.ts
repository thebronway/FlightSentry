import crypto from 'crypto';
import { Flight, SearchTelemetryKind } from '../types';
import { searchTelemetryDb } from '../db/searchTelemetry';
import { redactScraperSecrets } from './openFareScraper';

const PROVIDER_DISPLAY_LABELS: Record<string, string> = {
  openfarescraper: 'OpenFareScraper',
  serpapi: 'SerpAPI',
  searchapi: 'SearchApi.io',
  aviation_db: 'Aviation Route DBs',
  web_search: 'Web Search Fallback',
  none: 'Data Source Router',
};

export function formatProviderLabel(provider: string): string {
  const key = (provider || '').trim().toLowerCase();
  return PROVIDER_DISPLAY_LABELS[key] || provider || 'Data Source';
}

export function sanitizeTelemetryMessage(raw?: string | null): string | null {
  if (!raw) return null;
  let cleaned = redactScraperSecrets(String(raw));
  cleaned = cleaned.replace(/([?&](?:api_key|apikey|token|key)=)[^&\s"']+/gi, '$1[REDACTED]');
  cleaned = cleaned.replace(/(Bearer\s+)[A-Za-z0-9._-]+/gi, '$1[REDACTED]');
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  if (cleaned.length > 220) {
    cleaned = `${cleaned.slice(0, 217)}...`;
  }
  return cleaned || null;
}

export function formatFlightSearchContext(flight: Partial<Flight>): {
  context: string;
  route: string | null;
  flightNumber: string | null;
} {
  const origin = (flight.origin || '').trim().toUpperCase();
  const destination = (flight.destination || '').trim().toUpperCase();
  const route = origin && destination ? `${origin} → ${destination}` : null;

  const airline = (flight.airline || '').trim().toUpperCase();
  const num = (flight.flightNumber || '').trim();
  const flightNumber =
    airline && num && airline !== 'ALL'
      ? `${airline} ${num}`
      : airline && airline !== 'ALL'
      ? airline
      : null;

  let context = 'Flight Fare Search';
  if (flightNumber && route) {
    context = `${flightNumber} • ${route}`;
  } else if (route) {
    context = route;
  } else if (flightNumber) {
    context = flightNumber;
  }

  return { context, route, flightNumber };
}

export interface BeginSearchTelemetryParams {
  flight?: Partial<Flight>;
  searchKind: SearchTelemetryKind;
  context?: string;
  route?: string | null;
  flightNumber?: string | null;
  departureDate?: string | null;
  activeProvider: string;
  totalProviders: number;
}

export function beginSearchTelemetry(params: BeginSearchTelemetryParams): string {
  const id = crypto.randomUUID();
  const nowIso = new Date().toISOString();
  const derived = params.flight ? formatFlightSearchContext(params.flight) : null;

  try {
    searchTelemetryDb.upsert({
      id,
      flightId: params.flight?.id && params.flight.id > 0 ? params.flight.id : null,
      searchKind: params.searchKind,
      context: sanitizeTelemetryMessage(params.context || derived?.context) || 'Flight Search',
      route: params.route !== undefined ? params.route : derived?.route ?? null,
      flightNumber: params.flightNumber !== undefined ? params.flightNumber : derived?.flightNumber ?? null,
      departureDate:
        params.departureDate !== undefined
          ? params.departureDate
          : params.flight?.departureDate ?? null,
      activeProvider: params.activeProvider,
      providerLabel: formatProviderLabel(params.activeProvider),
      status: 'searching',
      failoverReason: null,
      previousProvider: null,
      previousProviderLabel: null,
      attemptNumber: 1,
      totalProviders: Math.max(1, params.totalProviders),
      startedAt: nowIso,
      updatedAt: nowIso,
      completedAt: null,
    });
  } catch (err) {
    console.error('[SearchTelemetry] Failed to start telemetry entry:', err);
  }

  return id;
}

export function recordSearchAttempt(
  id: string,
  params: {
    activeProvider: string;
    attemptNumber: number;
    totalProviders: number;
  }
): void {
  try {
    searchTelemetryDb.update(id, {
      activeProvider: params.activeProvider,
      providerLabel: formatProviderLabel(params.activeProvider),
      status: 'searching',
      attemptNumber: params.attemptNumber,
      totalProviders: Math.max(1, params.totalProviders),
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[SearchTelemetry] Failed to record attempt:', err);
  }
}

export function recordSearchFailover(
  id: string,
  params: {
    previousProvider: string;
    nextProvider: string;
    failoverReason: string;
    attemptNumber: number;
    totalProviders: number;
  }
): void {
  try {
    searchTelemetryDb.update(id, {
      activeProvider: params.nextProvider,
      providerLabel: formatProviderLabel(params.nextProvider),
      status: 'failover',
      failoverReason: sanitizeTelemetryMessage(params.failoverReason),
      previousProvider: params.previousProvider,
      previousProviderLabel: formatProviderLabel(params.previousProvider),
      attemptNumber: params.attemptNumber,
      totalProviders: Math.max(1, params.totalProviders),
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[SearchTelemetry] Failed to record failover:', err);
  }
}

export function finishSearchTelemetry(
  id: string,
  outcome: 'completed' | 'failed',
  finalMessage?: string | null
): void {
  try {
    const nowIso = new Date().toISOString();
    const patch: Parameters<typeof searchTelemetryDb.update>[1] = {
      status: outcome,
      updatedAt: nowIso,
      completedAt: nowIso,
    };
    if (outcome === 'failed' && finalMessage) {
      patch.failoverReason = sanitizeTelemetryMessage(finalMessage);
    }
    searchTelemetryDb.update(id, patch);
  } catch (err) {
    console.error('[SearchTelemetry] Failed to finalize telemetry entry:', err);
  }
}