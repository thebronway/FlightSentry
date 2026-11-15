import { PriceHistory, SearchMode } from '@/types';
import { StopPriceBreakdown } from '@/utils/routeIntelligence';

export interface PriceChartProps {
  history: PriceHistory[];
  rawHistory?: PriceHistory[];
  baselinePrice: number;
  purchasePrice?: number | null;
  searchMode?: SearchMode;
  currency?: string | null;
  overlayRouteFloor?: boolean;
  showStopComparison?: boolean;
  flightMaxStops?: number | null;
}

export interface CarrierDeparture {
  flightNumber?: string;
  price: number;
  origin?: string;
  destination?: string;
  departureTime?: string;
  arrivalTime?: string;
  duration?: string;
  stops?: number;
  isNonstop?: boolean;
}

export interface CarrierCheckSummary {
  airline: string;
  price: number;
  flightNumber?: string;
  origin?: string;
  destination?: string;
  departureTime?: string;
  flightCount: number;
  departures?: CarrierDeparture[];
}

export interface PlottedDot {
  id: string;
  checkIdx: number;
  airline: string;
  price: number;
  flightNumber?: string;
  departureTime?: string;
  flightCount: number;
  nominalX: number;
  nominalY: number;
  x: number;
  y: number;
  color: string;
  isFloor: boolean;
}

export interface AirlineSeries {
  airline: string;
  color: string;
  points: { x: number; y: number; price: number; checkIdx: number }[];
  pathString: string;
}

export type { StopPriceBreakdown };