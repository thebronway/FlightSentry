'use client';

import { Flight } from '@/types';
import { formatCurrency } from '@/utils/format';

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

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <div className="bg-gunmetal-canvas/60 border border-gunmetal-border p-3 rounded-lg">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-gunmetal-muted block">
          Current Fare
        </span>
        <span className="text-xl font-black text-slate-100 block mt-0.5">
          {formatCurrency(flight.currentPrice)}
        </span>
      </div>
      <div className="bg-gunmetal-canvas/60 border border-gunmetal-border p-3 rounded-lg">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-gunmetal-muted block">
          {isRebooked ? 'Active Benchmark' : isBooked ? 'Price Paid' : 'Initial Baseline'}
        </span>
        <span className="text-xl font-bold text-slate-200 block mt-0.5">
          {formatCurrency(benchmarkPrice)}
        </span>
        {isRebooked && (
          <span className="text-[10px] text-gunmetal-muted block mt-0.5">
            Original: {formatCurrency(originalPaid)}
          </span>
        )}
      </div>
      <div className="bg-gunmetal-canvas/60 border border-gunmetal-border p-3 rounded-lg">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-gunmetal-muted block">
          {isRebooked ? 'Credits Claimed' : 'All-Time Low'}
        </span>
        <span className={`text-xl font-bold block mt-0.5 ${isRebooked ? 'text-emerald-400' : 'text-green-400'}`}>
          {isRebooked ? `+${formatCurrency(lifetimeCredits)}` : formatCurrency(allTimeLow)}
        </span>
        {isRebooked && (
          <span className="text-[10px] text-gunmetal-muted block mt-0.5">
            Low: {formatCurrency(allTimeLow)}
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