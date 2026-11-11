'use client';

import { Flight } from '@/types';
import { CABIN_LABEL_MAP, CONDENSED_CABIN_LABEL_MAP } from '@/hooks/useFlightActions';
import { formatCurrency } from '@/utils/format';

interface FlightCabinBadgesProps {
  flight: Flight;
  size?: 'sm' | 'xs';
  showRebookSavings?: boolean;
  showPnr?: boolean;
}

export default function FlightCabinBadges({
  flight,
  size = 'sm',
  showRebookSavings = true,
  showPnr = true,
}: FlightCabinBadgesProps) {
  const isPurchased = flight.purchasePrice !== null && flight.purchasePrice !== undefined && flight.purchasePrice > 0;
  const isXs = size === 'xs';

  const badgeClass = isXs
    ? 'px-1.5 py-0.5 text-[11px] font-medium'
    : 'px-2 py-0.5 text-xs font-medium';

  const stopBadgeClass = isXs
    ? 'px-1.5 py-0.5 text-[10px] font-medium'
    : 'px-2 py-0.5 text-xs font-medium';

  const cabinLabel = isXs
    ? (CONDENSED_CABIN_LABEL_MAP[flight.cabinClass] || 'E')
    : (CABIN_LABEL_MAP[flight.cabinClass] || 'Economy');

  const tierLabel = isXs
    ? (flight.fareTier === 'Standard' ? 'Std.' : flight.fareTier === 'Basic Economy' ? 'Basic' : flight.fareTier)
    : flight.fareTier;

  const savingsLabel = isXs ? 'Savings' : 'Rebook Savings';

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {showRebookSavings && isPurchased && flight.baselinePrice > 0 && flight.baselinePrice > flight.purchasePrice! && (
        <span className={`bg-emerald-950/50 text-emerald-300 border border-emerald-700/60 rounded font-semibold ${isXs ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-xs'}`}>
          +{formatCurrency(flight.baselinePrice - flight.purchasePrice!, flight.currency)} {savingsLabel}
        </span>
      )}
      <span className={`bg-gunmetal-canvas text-slate-300 border border-gunmetal-border rounded ${badgeClass}`}>
        {cabinLabel}
      </span>
      <span className={`bg-gunmetal-canvas text-gunmetal-muted border border-gunmetal-border rounded ${badgeClass}`}>
        {tierLabel}
      </span>
      {flight.noRedeye === 1 && (
        <span className={`bg-gunmetal-canvas text-amber-400 border border-amber-800/60 rounded ${stopBadgeClass}`}>
          No Redeye
        </span>
      )}
      {flight.maxStops === 0 && (
        <span className={`bg-gunmetal-canvas text-sky-400 border border-sky-800/60 rounded ${stopBadgeClass}`}>
          Nonstop
        </span>
      )}
      {flight.maxStops === 1 && (
        <span className={`bg-gunmetal-canvas text-slate-300 border border-gunmetal-border rounded ${stopBadgeClass}`}>
          ≤ 1 Stop
        </span>
      )}
      {flight.maxStops === 2 && (
        <span className={`bg-gunmetal-canvas text-slate-300 border border-gunmetal-border rounded ${stopBadgeClass}`}>
          ≤ 2 Stops
        </span>
      )}
      {showPnr && flight.pnr && (
        <span className={`bg-gunmetal-canvas text-slate-300 border border-gunmetal-border rounded ${badgeClass}`}>
          PNR: {flight.pnr}
        </span>
      )}
    </div>
  );
}