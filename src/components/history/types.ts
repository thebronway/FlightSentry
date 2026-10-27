import { PriceHistory } from '@/types';

export interface DayGroup {
  dateKey: string;
  displayDate: string;
  records: PriceHistory[];
  dayHigh: number;
  dayLow: number;
  firstPrice: number;
  lastPrice: number;
  intradayDelta: number;
  hasMultipleChecks: boolean;
}