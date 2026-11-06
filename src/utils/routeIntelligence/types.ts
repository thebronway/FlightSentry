export interface CarrierDepartureDetail {
  flightIdentifier: string;
  route?: string;
  scheduleDetail?: string;
  price: number;
  departureTime?: string;
  arrivalTime?: string;
  duration?: string;
  stops?: number;
  isNonstop?: boolean;
  layoverAirports?: string[];
}

export interface CarrierMatrixRow {
  airline: string;
  airlineName: string;
  color: string;
  bestFlightDetail: string; // e.g. "B6 523 · Nonstop · 8:30 AM"
  flightIdentifier?: string; // e.g. "WN 43"
  route?: string; // e.g. "DCA → DAL"
  scheduleDetail?: string; // e.g. "Nonstop · 1:55 PM"
  currentLowestPrice: number;
  allTimeLow: number;
  allTimeHigh: number;
  priceDelta: number; // Current price minus previous check price for this carrier
  deltaStatus: 'dropped' | 'risen' | 'steady';
  isRouteFloor: boolean;
  layoverAirports?: string[];
  departures?: CarrierDepartureDetail[];
}

export interface RouteCorridorMetrics {
  currentFloor: number;
  allTimeLow: number;
  allTimeHigh: number;
  spreadPercent: number; // 0% (at low) to 100% (at high)
  totalChecks: number;
  hasSpread: boolean;
}