'use client';

import { Flight } from '@/types';
import { formatCurrency } from '@/utils/format';

interface Props {
  flight: Flight;
  allTimeLow: number;
  totalChecks: number;
}

export default function FlightStatBadges({ flight, allTimeLow, totalChecks }: Props) {
  const benchmarkPrice = flight.purchasePrice && flight.purchasePrice > 0
    ? flight.purchasePrice
    : flight.baselinePrice;
  const benchmarkLabel = flight.purchasePrice && flight.purchasePrice > 0
    ? 'Purchase Price'
    : 'Initial Baseline';

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <div className="bg-gunmetal-canvas/60 border border-gunmetal-border p-3 rounded-lg">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-gunmetal-muted block">
          Current Price
        </span>
        <span className="text-xl font-black text-slate-100 block mt-0.5">
          {formatCurrency(flight.currentPrice)}
        </span>
      </div>
      <div className="bg-gunmetal-canvas/60 border border-gunmetal-border p-3 rounded-lg">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-gunmetal-muted block">
          {benchmarkLabel}
        </span>
        <span className="text-xl font-bold text-slate-300 block mt-0.5">
          {formatCurrency(benchmarkPrice)}
        </span>
      </div>
      <div className="bg-gunmetal-canvas/60 border border-gunmetal-border p-3 rounded-lg">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-gunmetal-muted block">
          All-Time Low
        </span>
        <span className="text-xl font-bold text-green-400 block mt-0.5">
          {formatCurrency(allTimeLow)}
        </span>
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