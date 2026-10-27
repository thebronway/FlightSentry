import { PriceHistory, SearchMode } from '@/types';

export interface PriceChartProps {
  history: PriceHistory[];
  baselinePrice: number;
  purchasePrice?: number | null;
  searchMode?: SearchMode;
}

export interface CarrierCheckSummary {
  airline: string;
  price: number;
  flightNumber?: string;
  departureTime?: string;
  flightCount: number;
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