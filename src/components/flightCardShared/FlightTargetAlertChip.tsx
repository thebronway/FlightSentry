'use client';

import { Flight, Settings } from '@/types';
import { Bell, BellOff, TrendingDown, TrendingUp } from 'lucide-react';
import {
  formatCurrency,
  formatCompactCurrency,
  computeAlertTargets,
  computeIncreaseAlertTargets,
} from '@/utils/format';

interface FlightTargetAlertChipProps {
  flight: Flight;
  settings?: Settings | null;
  size?: 'sm' | 'xs';
}

export default function FlightTargetAlertChip({
  flight,
  settings,
  size = 'sm',
}: FlightTargetAlertChipProps) {
  if (flight.status === 'Past') return null;

  const isPurchased = flight.purchasePrice !== null && flight.purchasePrice !== undefined && flight.purchasePrice > 0;
  const effDollar =
    flight.minDropDollar !== null && flight.minDropDollar !== undefined
      ? flight.minDropDollar
      : settings?.minDropDollar ?? 15;
  const effPercent =
    flight.minDropPercent !== null && flight.minDropPercent !== undefined
      ? flight.minDropPercent
      : settings?.minDropPercent ?? 5;
  const dropTargets = computeAlertTargets(
    flight.currentPrice,
    effDollar,
    effPercent
  );

  const effIncDollar =
    flight.minIncreaseDollar !== null && flight.minIncreaseDollar !== undefined
      ? flight.minIncreaseDollar
      : settings?.minIncreaseDollar ?? 50;
  const effIncPercent =
    flight.minIncreasePercent !== null && flight.minIncreasePercent !== undefined
      ? flight.minIncreasePercent
      : settings?.minIncreasePercent ?? 10;
  const incTargets = computeIncreaseAlertTargets(
    flight.currentPrice,
    effIncDollar,
    effIncPercent
  );

  const dir = isPurchased ? 'drop' : (flight.priceTrackingDirection || 'drop');
  const chipPadding = size === 'xs' ? 'px-1.5 py-0.2 text-[10px]' : 'px-2 py-0.5 text-[10px]';

  if (flight.disableNotifications === 1) {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded font-medium bg-gunmetal-canvas border border-gunmetal-border text-gunmetal-muted shadow-sm whitespace-nowrap ${chipPadding}`}
        title="Notifications muted for this flight"
      >
        <BellOff className="w-3 h-3 text-gunmetal-muted flex-shrink-0" />
        <span>Alerts Off</span>
      </span>
    );
  }

  if (dir === 'both') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded font-semibold font-mono bg-gunmetal-canvas border border-gunmetal-border text-slate-300 shadow-sm whitespace-nowrap ${chipPadding}`}
        title={`Alerts at ≤ ${formatCurrency(dropTargets.effectiveTarget || 0, flight.currency)} or ≥ ${formatCurrency(incTargets.effectiveTarget || 0, flight.currency)}`}
      >
        <span className="flex items-center gap-1 text-emerald-300">
          <TrendingDown className="w-3 h-3 text-emerald-400 flex-shrink-0" />
          <Bell className="w-3 h-3 text-emerald-400 flex-shrink-0" />
          <span>≤ {formatCompactCurrency(dropTargets.effectiveTarget || 0, flight.currency)}</span>
        </span>
        <span className="text-gunmetal-muted font-normal">|</span>
        <span className="flex items-center gap-1 text-rose-300">
          <TrendingUp className="w-3 h-3 text-rose-400 flex-shrink-0" />
          <Bell className="w-3 h-3 text-rose-400 flex-shrink-0" />
          <span>≥ {formatCompactCurrency(incTargets.effectiveTarget || 0, flight.currency)}</span>
        </span>
      </span>
    );
  }

  if (dir === 'increase') {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded font-semibold font-mono bg-gunmetal-canvas border border-gunmetal-border text-slate-300 shadow-sm whitespace-nowrap ${chipPadding}`}
        title={`Surge alert at ≥ ${formatCurrency(incTargets.effectiveTarget || 0, flight.currency)}`}
      >
        <TrendingUp className="w-3 h-3 text-rose-400 flex-shrink-0" />
        <Bell className="w-3 h-3 text-rose-400 flex-shrink-0" />
        <span className="text-rose-300">≥ {formatCompactCurrency(incTargets.effectiveTarget || 0, flight.currency)}</span>
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1 rounded font-semibold font-mono bg-gunmetal-canvas border border-gunmetal-border text-slate-300 shadow-sm whitespace-nowrap ${chipPadding}`}
      title={`Drop alert at ≤ ${formatCurrency(dropTargets.effectiveTarget || 0, flight.currency)}`}
    >
      <TrendingDown className="w-3 h-3 text-emerald-400 flex-shrink-0" />
      <Bell className="w-3 h-3 text-emerald-400 flex-shrink-0" />
      <span className="text-emerald-300">≤ {formatCompactCurrency(dropTargets.effectiveTarget || 0, flight.currency)}</span>
    </span>
  );
}