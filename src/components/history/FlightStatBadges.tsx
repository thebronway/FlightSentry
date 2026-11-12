'use client';

import { useMemo } from 'react';
import { Flight } from '@/types';
import { formatCurrency, isPointsCurrency } from '@/utils/format';
import { getCurrentPriceAirline } from '@/utils/airline';
import AirlineBadge from '../common/AirlineBadge';
import { Coins } from 'lucide-react';

interface Props {
  flight: Flight;
  allTimeLow: number;
  totalChecks: number;
}

export default function FlightStatBadges({ flight, allTimeLow, totalChecks }: Props) {
  const isBooked = Boolean(flight.purchasePrice && flight.purchasePrice > 0);
  const benchmarkPrice = isBooked ? flight.purchasePrice! : flight.baselinePrice;
  const originalPaid = flight.baselinePrice > 0 ? flight.baselinePrice : benchmarkPrice;
  const isRebooked = isBooked && flight.baselinePrice > 0 && flight.baselinePrice > flight.purchasePrice!;
  const lifetimeCredits = isRebooked ? flight.baselinePrice - flight.purchasePrice! : 0;
  const delta = benchmarkPrice - flight.currentPrice;
  const isDrop = flight.currentPrice < benchmarkPrice;
  const currentPriceAirline = useMemo(() => getCurrentPriceAirline(flight), [flight]);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <div className="bg-gunmetal-canvas/60 border border-gunmetal-border p-3 rounded-lg">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-gunmetal-muted block">
          Current Fare
        </span>
        <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
          <span className="text-xl font-black text-slate-100">
            {formatCurrency(flight.currentPrice, flight.currency)}
          </span>
          {flight.currency && isPointsCurrency(flight.currency) && (
            <span className="bg-amber-950/60 text-amber-300 border border-amber-800/60 px-1.5 py-0.5 rounded text-[10px] font-semibold inline-flex items-center gap-1">
              <Coins className="w-3 h-3 text-amber-400" /> {flight.currency}
            </span>
          )}
          {!isBooked && currentPriceAirline && (
            <AirlineBadge
              code={currentPriceAirline.code}
              flightNumber={currentPriceAirline.flightNumber}
              showFlightNumber={false}
              size="xs"
            />
          )}
        </div>
        {delta !== 0 && (
          <span className={`text-xs font-bold block mt-0.5 ${isDrop ? 'text-green-400' : 'text-red-400'}`}>
            {isDrop ? '▼' : '▲'} {formatCurrency(Math.abs(delta), flight.currency)}
          </span>
        )}
      </div>
      <div className="bg-gunmetal-canvas/60 border border-gunmetal-border p-3 rounded-lg">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-gunmetal-muted block">
          {isRebooked ? 'Active Benchmark' : isBooked ? 'Price Paid' : 'Initial Baseline'}
        </span>
        <span className="text-xl font-bold text-slate-200 block mt-0.5">
          {formatCurrency(benchmarkPrice, flight.currency)}
        </span>
        {isRebooked && (
          <span className="text-[10px] text-gunmetal-muted block mt-0.5">
            Original: {formatCurrency(originalPaid, flight.currency)}
          </span>
        )}
      </div>
      <div className="bg-gunmetal-canvas/60 border border-gunmetal-border p-3 rounded-lg">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-gunmetal-muted block">
          {isRebooked ? 'Rebook Savings' : 'All-Time Low'}
        </span>
        <span className={`text-xl font-bold block mt-0.5 ${isRebooked ? 'text-emerald-400' : 'text-green-400'}`}>
          {isRebooked ? `+${formatCurrency(lifetimeCredits, flight.currency)}` : formatCurrency(allTimeLow, flight.currency)}
        </span>
        {isRebooked && (
          <span className="text-[10px] text-gunmetal-muted block mt-0.5">
            Low: {formatCurrency(allTimeLow, flight.currency)}
          </span>
        )}
      </div>
      <div className="bg-gunmetal-canvas/60 border border-gunmetal-border p-3 rounded-lg">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-gunmetal-muted block">
          Total Checks
        </span>
        <span className="text-xl font-bold text-sky-400 block mt-0.5">
          {totalChecks}
        </span>
      </div>
    </div>
  );
}