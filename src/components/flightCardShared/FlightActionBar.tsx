'use client';

import { Flight, Settings } from '@/types';
import { RefreshCw, Clock, Pause, Play, Trash2, Pencil, ShoppingBag, Coins, RotateCcw, DollarSign } from 'lucide-react';
import GoogleIcon from '../GoogleIcon';
import Tooltip from '../common/Tooltip';
import { isPointsCurrency } from '@/utils/format';
import { getGoogleFlightsUrl } from '@/utils/airline';
import { useFlightActions } from '@/hooks/useFlightActions';

interface FlightActionBarProps {
  flight: Flight;
  settings?: Settings | null;
  onRefresh: () => void;
  onShowHistory: () => void;
  onEdit: (flight: Flight) => void;
  onConvertToBooked?: (flight: Flight) => void;
  onOpenManualCheck?: (flight: Flight) => void;
  onRebook?: (flight: Flight) => void;
  onDelete: (flight: Flight) => void;
  variant?: 'card' | 'condensed';
  isHistoryHovered?: boolean;
}

export default function FlightActionBar({
  flight,
  settings,
  onRefresh,
  onShowHistory,
  onEdit,
  onConvertToBooked,
  onOpenManualCheck,
  onRebook,
  onDelete,
  variant = 'card',
  isHistoryHovered = false,
}: FlightActionBarProps) {
  const { toggleStatus, checkNow } = useFlightActions(onRefresh);
  const isPurchased = flight.purchasePrice !== null && flight.purchasePrice !== undefined && flight.purchasePrice > 0;
  const isPast = flight.status === 'Past';
  const googleFlightsUrl = getGoogleFlightsUrl(flight, settings?.currency);
  const isCard = variant === 'card';

  const btnPadding = isCard ? 'p-2' : 'p-1.5';
  const iconSize = isCard ? 'w-4 h-4' : 'w-3.5 h-3.5';
  const tooltipWrapperClass = isCard ? 'w-full' : '';
  const btnBaseClass = isCard
    ? `w-full flex justify-center items-center ${btnPadding} rounded-md transition-colors`
    : `${btnPadding} rounded transition-colors`;

  const hasSpecialAction = (!isPurchased && onConvertToBooked) || (isPurchased && onRebook);
  const containerClass = isCard
    ? `mt-auto grid ${hasSpecialAction ? 'grid-cols-7' : 'grid-cols-6'} gap-1 pt-3 border-t border-gunmetal-border`
    : 'flex items-center justify-end gap-1';

  return (
    <div
      onClick={e => e.stopPropagation()}
      className={containerClass}
    >
      {/* 1. Live Check / Manual Price Check */}
      {isPast ? (
        <Tooltip content="Checks disabled for past flights" align="center" className={tooltipWrapperClass}>
          <button
            disabled
            className={`${btnBaseClass} text-sky-400 opacity-25 pointer-events-none`}
          >
            <RefreshCw className={iconSize} />
          </button>
        </Tooltip>
      ) : (flight.status === 'Paused' || isPointsCurrency(flight.currency)) && onOpenManualCheck ? (
        <Tooltip content="Log manual price check" align="center" className={tooltipWrapperClass}>
          <button
            onClick={e => {
              e.stopPropagation();
              onOpenManualCheck(flight);
            }}
            className={`${btnBaseClass} text-amber-400 hover:text-amber-300 hover:bg-amber-950/40`}
          >
            {isPointsCurrency(flight.currency) ? <Coins className={iconSize} /> : <DollarSign className={iconSize} />}
          </button>
        </Tooltip>
      ) : (
        <Tooltip content="Check live price now" align="center" className={tooltipWrapperClass}>
          <button
            onClick={e => {
              e.stopPropagation();
              checkNow(flight.id);
            }}
            className={`${btnBaseClass} text-sky-400 hover:text-sky-300 hover:bg-sky-950/40`}
          >
            <RefreshCw className={iconSize} />
          </button>
        </Tooltip>
      )}

      {/* 2. Price History */}
      <Tooltip
        content="View price history & trend graph"
        align="center"
        className={tooltipWrapperClass}
      >
        <button
          onClick={e => {
            e.stopPropagation();
            onShowHistory();
          }}
          className={`${btnBaseClass} ${
            isHistoryHovered
              ? 'text-white bg-slate-700/60 ring-1 ring-slate-400 shadow-sm'
              : 'text-slate-300 hover:text-white hover:bg-gunmetal-canvas'
          }`}
        >
          <Clock className={iconSize} />
        </button>
      </Tooltip>

      {/* 3. Google Flights */}
      <Tooltip
        content="Search on Google Flights"
        align="center"
        className={tooltipWrapperClass}
      >
        <a
          href={googleFlightsUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={e => e.stopPropagation()}
          className={`${btnBaseClass} text-slate-300 hover:text-[#4285F4] hover:bg-blue-950/30`}
        >
          <GoogleIcon className={iconSize} />
        </a>
      </Tooltip>

      {/* 4. Edit */}
      <Tooltip
        content="Edit flight details & preferences"
        align="center"
        className={tooltipWrapperClass}
      >
        <button
          onClick={e => {
            e.stopPropagation();
            onEdit(flight);
          }}
          className={`${btnBaseClass} text-purple-400 hover:text-purple-300 hover:bg-purple-950/30`}
        >
          <Pencil className={iconSize} />
        </button>
      </Tooltip>

      {/* 5. Convert to Booked */}
      {!isPurchased && onConvertToBooked && (
        <Tooltip
          content="Convert to Booked (I bought this flight)"
          align="center"
          className={tooltipWrapperClass}
        >
          <button
            onClick={e => {
              e.stopPropagation();
              onConvertToBooked(flight);
            }}
            className={`${btnBaseClass} text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/30`}
          >
            <ShoppingBag className={iconSize} />
          </button>
        </Tooltip>
      )}

      {/* 6. Rebook / Price Adjustment */}
      {isPurchased && onRebook && (
        <Tooltip
          content="Log Flight Rebook or Price Adjustment"
          align="center"
          className={tooltipWrapperClass}
        >
          <button
            onClick={e => {
              e.stopPropagation();
              onRebook(flight);
            }}
            className={`${btnBaseClass} text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/30`}
          >
            <RotateCcw className={iconSize} />
          </button>
        </Tooltip>
      )}

      {/* 7. Pause / Resume */}
      <Tooltip
        content={isPast ? 'Past flight' : flight.status !== 'Paused' ? 'Pause automated price checks' : 'Resume automated price checks'}
        align="center"
        className={tooltipWrapperClass}
      >
        <button
          onClick={e => {
            e.stopPropagation();
            toggleStatus(flight);
          }}
          disabled={isPast}
          className={`${btnBaseClass} text-amber-400 hover:text-amber-300 hover:bg-amber-950/30 disabled:opacity-25 disabled:pointer-events-none`}
        >
          {flight.status !== 'Paused' ? <Pause className={iconSize} /> : <Play className={iconSize} />}
        </button>
      </Tooltip>

      {/* 8. Delete */}
      <Tooltip
        content="Delete flight"
        align="center"
        className={tooltipWrapperClass}
      >
        <button
          onClick={e => {
            e.stopPropagation();
            onDelete(flight);
          }}
          className={`${btnBaseClass} text-rose-400 hover:text-rose-300 hover:bg-rose-950/30`}
        >
          <Trash2 className={iconSize} />
        </button>
      </Tooltip>
    </div>
  );
}