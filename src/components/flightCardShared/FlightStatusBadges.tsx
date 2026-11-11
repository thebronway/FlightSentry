'use client';

import { Flight } from '@/types';
import { Clock, ShoppingBag, Tag, Pause, Wrench } from 'lucide-react';
import { isPointsCurrency } from '@/utils/format';

interface FlightStatusBadgesProps {
  flight: Flight;
  size?: 'sm' | 'xs';
  align?: 'start' | 'end';
}

export default function FlightStatusBadges({
  flight,
  size = 'sm',
  align = 'start',
}: FlightStatusBadgesProps) {
  const isPurchased = flight.purchasePrice !== null && flight.purchasePrice !== undefined && flight.purchasePrice > 0;
  const isPast = flight.status === 'Past';
  const isBooked = isPurchased || flight.status === 'Booked';
  const isManualMode = flight.isManual === 1 || isPointsCurrency(flight.currency);

  const badgePadding = size === 'xs' ? 'px-1.5 py-0.5 text-[11px]' : 'px-2 py-0.5 text-xs';
  const subBadgePadding = size === 'xs' ? 'px-1.5 py-0.2 text-[10px]' : 'px-1.5 py-0.2 text-[10px]';
  const iconSize = size === 'xs' ? 'w-2.5 h-2.5' : 'w-3 h-3';
  const alignClass = align === 'end' ? 'items-end' : 'items-start';

  return (
    <div className={`flex flex-col ${alignClass} gap-1 flex-shrink-0`}>
      {isPast ? (
        <span className={`bg-slate-800/50 text-slate-400 border border-slate-700/50 rounded font-semibold inline-flex items-center gap-1 ${badgePadding}`}>
          <Clock className={iconSize} /> Past
        </span>
      ) : isBooked ? (
        <span className={`bg-emerald-950/60 text-emerald-300 border border-emerald-800/60 rounded font-semibold inline-flex items-center gap-1 ${badgePadding}`}>
          <ShoppingBag className={iconSize} /> Booked
        </span>
      ) : (
        <span className={`bg-sky-950/60 text-sky-300 border border-sky-800/50 rounded font-semibold inline-flex items-center gap-1 ${badgePadding}`}>
          <Tag className={iconSize} /> Watching
        </span>
      )}

      {!isPast && (flight.status === 'Paused' || isManualMode) && (
        <div className="flex items-center gap-1">
          {flight.status === 'Paused' && !isManualMode && (
            <span className={`bg-amber-950/60 text-amber-300 border border-amber-800/60 rounded font-semibold inline-flex items-center gap-1 ${subBadgePadding}`}>
              <Pause className="w-2.5 h-2.5 text-amber-400" /> Paused
            </span>
          )}
          {isManualMode && (
            <span className={`bg-slate-800/80 text-slate-300 border border-slate-700/80 rounded font-semibold inline-flex items-center gap-1 ${subBadgePadding}`}>
              <Wrench className="w-2.5 h-2.5 text-slate-400" /> Manual
            </span>
          )}
        </div>
      )}
    </div>
  );
}