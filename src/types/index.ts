export type FlightStatus = 'Active' | 'Paused' | 'Expired';
export type FareTier = 'Basic Economy' | 'Standard';

export interface Flight {
  id: number;
  origin: string;
  destination: string;
  departureDate: string; // YYYY-MM-DD
  airline: string;
  flightNumber: string;
  pnr?: string | null;
  fareTier: FareTier;
  baselinePrice: number;
  targetPrice?: number | null;
  currentPrice: number;
  notes?: string | null;
  status: FlightStatus;
  createdAt: string;
  updatedAt: string;
}

export interface PriceHistory {
  id: number;
  flightId: number;
  price: number;
  status: string; // e.g., 'Success', 'SoldOut', 'Error'
  checkedAt: string; // ISO DateTime
}

export interface Settings {
  id: number;
  serpApiKey?: string | null;
  appriseUrl?: string | null;
  timezone: string;
  checkHours: string; // JSON array, e.g., "[8, 14, 20]"
  minDropDollar: number;
  minDropPercent: number;
  monthlyQuota: number;
  apiSearchesUsed: number;
  quotaResetDate: string; // YYYY-MM-DD
  globalPause: number; // 0 (false) or 1 (true)
}