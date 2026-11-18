import { Flight, SearchTelemetryKind } from '@/types';

export const SEARCH_STARTED_EVENT = 'flightsentry:search-started';
export const SEARCH_FINISHED_EVENT = 'flightsentry:search-finished';

export interface ClientSearchStartPayload {
  token: string;
  flightId?: number | null;
  searchKind: SearchTelemetryKind;
  context: string;
  route?: string | null;
  flightNumber?: string | null;
  providerLabel?: string;
  startedAtMs: number;
}

export interface ClientSearchFinishPayload {
  token: string;
  ok: boolean;
  errorMessage?: string | null;
}

export function buildFlightContextLabel(flight: Partial<Flight>): {
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

export function notifySearchStarted(params: {
  flightId?: number | null;
  searchKind: SearchTelemetryKind;
  context: string;
  route?: string | null;
  flightNumber?: string | null;
  providerLabel?: string;
}): string {
  const token = `client-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  if (typeof window !== 'undefined') {
    const detail: ClientSearchStartPayload = {
      token,
      flightId: params.flightId ?? null,
      searchKind: params.searchKind,
      context: params.context || 'Flight Search',
      route: params.route ?? null,
      flightNumber: params.flightNumber ?? null,
      providerLabel: params.providerLabel,
      startedAtMs: Date.now(),
    };
    window.dispatchEvent(new CustomEvent<ClientSearchStartPayload>(SEARCH_STARTED_EVENT, { detail }));
  }
  return token;
}

export function notifySearchFinished(
  token: string,
  result?: { ok?: boolean; errorMessage?: string | null }
): void {
  if (typeof window === 'undefined' || !token) return;
  const detail: ClientSearchFinishPayload = {
    token,
    ok: result?.ok ?? true,
    errorMessage: result?.errorMessage ?? null,
  };
  window.dispatchEvent(new CustomEvent<ClientSearchFinishPayload>(SEARCH_FINISHED_EVENT, { detail }));
}