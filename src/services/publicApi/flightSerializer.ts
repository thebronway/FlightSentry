import {
  CabinClass,
  FareTier,
  Flight,
  FlightStatus,
  PriceHistory,
  PriceTrackingDirection,
  RouteItinerary,
  SearchMode,
  Settings,
  TrackedFlightLeg,
} from '@/types';
import { getLayoverAirports, parseFlightLegs } from '@/utils/flightLegs';
import {
  CoLocationInfo,
  getActiveCoLocationBadge,
  getCoLocationInfo,
} from '@/utils/coLocations';
import { resolveAllianceKey } from '@/utils/airlineThemes';
import {
  CarrierMatrixRow,
  StopComparisonMetrics,
  computeCarrierMatrix,
  computeStopComparisonMetrics,
  isConnectingItinerary,
  isNonstopItinerary,
} from '@/utils/routeIntelligence';

export interface PublicFlightStopBreakdown {
  nonstop: number | null;
  withStops: number | null;
}

export interface PublicFlightSummary {
  id: number;
  searchMode: SearchMode;
  status: FlightStatus;
  origin: string | null;
  destination: string | null;
  departureDate: string;
  airline: string;
  bookingAirline: string | null;
  flightNumber: string | null;
  legs: TrackedFlightLeg[];
  layoverAirports: string[];
  pnr: string | null;
  fareTier: FareTier;
  cabinClass: CabinClass;
  currency: string;
  taxesAmount: number | null;
  taxesCurrency: string | null;
  isManual: boolean;
  monitorRouteAlternatives: boolean;
  maxStops: number | null;
  noRedeye: boolean;
  currentPrice: number;
  baselinePrice: number;
  purchasePrice: number | null;
  originalPurchasePrice: number | null;
  targetPrice: number | null;
  allTimeLow: number | null;
  allTimeHigh: number | null;
  priceDelta: number | null;
  priceDeltaPercent: number | null;
  stopBreakdown: PublicFlightStopBreakdown;
  notes: string | null;
  bookingDate: string | null;
  nextCheckAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface PublicFlightDetail extends PublicFlightSummary {
  alliances: {
    included: string[];
    excluded: string[];
  };
  coLocations: {
    origin: CoLocationInfo | null;
    destination: CoLocationInfo | null;
    originBadge: string | null;
    destinationBadge: string | null;
  };
  alertThresholds: {
    direction: PriceTrackingDirection;
    disableNotifications: boolean;
    minDropDollar: number | null;
    minDropPercent: number | null;
    minIncreaseDollar: number | null;
    minIncreasePercent: number | null;
    targetPrice: number | null;
  };
  scheduleCadence: {
    nextCheckAt: string;
    override: Record<string, unknown> | null;
    effectiveHours: {
      farOut: number;
      standard: number;
      finalStretch: number;
    };
    checkStartTime: string;
  };
  searchPreferences: {
    earliestDeparture: string | null;
    latestDeparture: string | null;
    noRedeye: boolean;
    maxStops: number | null;
    maxLayoverMinutes: number | null;
    excludedConnectingAirports: string[];
    maxTotalDurationMinutes: number | null;
    includedAirlines: string[];
    excludedAirlines: string[];
    monitorRouteAlternatives: boolean;
  };
  stopMetrics: StopComparisonMetrics;
  competitorBreakdown: CarrierMatrixRow[];
}

function parseTokenList(raw?: string | null): string[] {
  if (!raw || !raw.trim()) return [];
  return raw
    .split(',')
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);
}

function extractAllianceList(
  explicitAlliances?: string | null,
  airlinesOrAlliances?: string | null
): string[] {
  const result = new Set<string>();
  for (const token of parseTokenList(explicitAlliances)) {
    const resolved = resolveAllianceKey(token);
    result.add(resolved || token);
  }
  for (const token of parseTokenList(airlinesOrAlliances)) {
    const resolved = resolveAllianceKey(token);
    if (resolved) {
      result.add(resolved);
    }
  }
  return Array.from(result);
}

function extractCarrierOnlyList(airlinesOrAlliances?: string | null): string[] {
  return parseTokenList(airlinesOrAlliances).filter(
    (token) => !resolveAllianceKey(token)
  );
}

function extractLatestStopBreakdown(flight: Flight): PublicFlightStopBreakdown {
  if (flight.latestMetadata) {
    try {
      const parsed = JSON.parse(flight.latestMetadata);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const valid = (parsed as RouteItinerary[]).filter(
          (it) => typeof it.price === 'number' && it.price > 0
        );
        if (valid.length > 0) {
          const nonstopPrices = valid
            .filter(isNonstopItinerary)
            .map((it) => it.price);
          const withStopsPrices = valid
            .filter(isConnectingItinerary)
            .map((it) => it.price);
          return {
            nonstop:
              nonstopPrices.length > 0 ? Math.min(...nonstopPrices) : null,
            withStops:
              withStopsPrices.length > 0 ? Math.min(...withStopsPrices) : null,
          };
        }
      }
    } catch {
      // Ignore malformed metadata JSON
    }
  }

  if (flight.maxStops === 0 && flight.currentPrice > 0) {
    return {
      nonstop: flight.currentPrice,
      withStops: null,
    };
  }

  return {
    nonstop: null,
    withStops: null,
  };
}

export function serializePublicFlightSummary(
  flight: Flight,
  defaultCurrency = 'USD'
): PublicFlightSummary {
  const isBooked = Boolean(flight.purchasePrice && flight.purchasePrice > 0);
  const benchmark = isBooked ? flight.purchasePrice! : flight.baselinePrice;

  let priceDelta: number | null = null;
  let priceDeltaPercent: number | null = null;
  if (benchmark > 0 && flight.currentPrice > 0) {
    priceDelta = Math.round((flight.currentPrice - benchmark) * 100) / 100;
    priceDeltaPercent = Math.round((priceDelta / benchmark) * 10000) / 100;
  }

  return {
    id: flight.id,
    searchMode: flight.searchMode,
    status: flight.status,
    origin: flight.origin ?? null,
    destination: flight.destination ?? null,
    departureDate: flight.departureDate,
    airline: flight.airline,
    bookingAirline: flight.bookingAirline ?? null,
    flightNumber: flight.flightNumber ?? null,
    legs: parseFlightLegs(flight.legs),
    layoverAirports: getLayoverAirports(parseFlightLegs(flight.legs)),
    pnr: flight.pnr ?? null,
    fareTier: flight.fareTier,
    cabinClass: flight.cabinClass,
    currency: (flight.currency || defaultCurrency || 'USD').trim(),
    taxesAmount: flight.taxesAmount ?? null,
    taxesCurrency: flight.taxesCurrency ?? null,
    isManual: flight.isManual === 1,
    monitorRouteAlternatives: flight.monitorRouteAlternatives === 1,
    maxStops: flight.maxStops ?? null,
    noRedeye: flight.noRedeye === 1,
    currentPrice: flight.currentPrice,
    baselinePrice: flight.baselinePrice,
    purchasePrice: flight.purchasePrice ?? null,
    originalPurchasePrice: flight.originalPurchasePrice ?? null,
    targetPrice: flight.targetPrice ?? null,
    allTimeLow: flight.allTimeLow ?? null,
    allTimeHigh: flight.allTimeHigh ?? null,
    priceDelta,
    priceDeltaPercent,
    stopBreakdown: extractLatestStopBreakdown(flight),
    notes: flight.notes ?? null,
    bookingDate: flight.bookingDate ?? null,
    nextCheckAt: flight.nextCheckAt,
    createdAt: flight.createdAt,
    updatedAt: flight.updatedAt,
  };
}

export function serializePublicFlightDetail(
  flight: Flight,
  history: PriceHistory[],
  settings: Settings
): PublicFlightDetail {
  const summary = serializePublicFlightSummary(
    flight,
    settings.currency || 'USD'
  );

  let parsedOverride: Record<string, unknown> | null = null;
  let effectiveFarOut = settings.scheduleFarOut;
  let effectiveStandard = settings.scheduleStandard;
  let effectiveFinalStretch = settings.scheduleFinalStretch;

  if (flight.scheduleOverride) {
    try {
      const ov = JSON.parse(flight.scheduleOverride);
      if (ov && typeof ov === 'object') {
        parsedOverride = ov;
        if (ov.farOut !== undefined && ov.farOut !== null && ov.farOut !== '') {
          effectiveFarOut = Number(ov.farOut);
        }
        if (
          ov.standard !== undefined &&
          ov.standard !== null &&
          ov.standard !== ''
        ) {
          effectiveStandard = Number(ov.standard);
        }
        if (
          ov.finalStretch !== undefined &&
          ov.finalStretch !== null &&
          ov.finalStretch !== ''
        ) {
          effectiveFinalStretch = Number(ov.finalStretch);
        }
      }
    } catch {
      // Ignore invalid JSON override
    }
  }

  const routeLabel =
    flight.origin && flight.destination
      ? `${flight.origin} → ${flight.destination}`
      : undefined;

  return {
    ...summary,
    alliances: {
      included: extractAllianceList(
        flight.includedAlliances,
        flight.includedAirlines
      ),
      excluded: extractAllianceList(
        flight.excludedAlliances,
        flight.excludedAirlines
      ),
    },
    coLocations: {
      origin: getCoLocationInfo(flight.origin),
      destination: getCoLocationInfo(flight.destination),
      originBadge: getActiveCoLocationBadge(flight.origin),
      destinationBadge: getActiveCoLocationBadge(flight.destination),
    },
    alertThresholds: {
      direction: flight.priceTrackingDirection || 'drop',
      disableNotifications: flight.disableNotifications === 1,
      minDropDollar: flight.minDropDollar ?? null,
      minDropPercent: flight.minDropPercent ?? null,
      minIncreaseDollar: flight.minIncreaseDollar ?? null,
      minIncreasePercent: flight.minIncreasePercent ?? null,
      targetPrice: flight.targetPrice ?? null,
    },
    scheduleCadence: {
      nextCheckAt: flight.nextCheckAt,
      override: parsedOverride,
      effectiveHours: {
        farOut: effectiveFarOut,
        standard: effectiveStandard,
        finalStretch: effectiveFinalStretch,
      },
      checkStartTime: settings.checkStartTime || '06:00',
    },
    searchPreferences: {
      earliestDeparture: flight.earliestDeparture ?? null,
      latestDeparture: flight.latestDeparture ?? null,
      noRedeye: flight.noRedeye === 1,
      maxStops: flight.maxStops ?? null,
      maxLayoverMinutes: flight.maxLayoverMinutes ?? null,
      excludedConnectingAirports: parseTokenList(
        flight.excludedConnectingAirports
      ),
      maxTotalDurationMinutes: flight.maxTotalDurationMinutes ?? null,
      includedAirlines: extractCarrierOnlyList(flight.includedAirlines),
      excludedAirlines: extractCarrierOnlyList(flight.excludedAirlines),
      monitorRouteAlternatives: flight.monitorRouteAlternatives === 1,
    },
    stopMetrics: computeStopComparisonMetrics(history, flight),
    competitorBreakdown: computeCarrierMatrix(history, routeLabel),
  };
}