export interface CarrierMatrixRow {
  airline: string;
  airlineName: string;
  color: string;
  bestFlightDetail: string; // e.g. "B6 523 · Nonstop · 8:30 AM"
  currentLowestPrice: number;
  allTimeLow: number;
  allTimeHigh: number;
  priceDelta: number; // Current price minus previous check price for this carrier
  deltaStatus: 'dropped' | 'risen' | 'steady';
  isRouteFloor: boolean;
}

export interface RouteCorridorMetrics {
  currentFloor: number;
  allTimeLow: number;
  allTimeHigh: number;
  spreadPercent: number; // 0% (at low) to 100% (at high)
  totalChecks: number;
  hasSpread: boolean;
}