'use client';

import { Flight, Settings } from '@/types';
import { formatCurrency, isPointsCurrency } from '@/utils/format';
import { getCurrentPriceAirline } from '@/utils/airline';
import AirlineBadge from '../common/AirlineBadge';
import FlightRouteDisplay from '../flightCardShared/FlightRouteDisplay';
import FlightCabinBadges from '../flightCardShared/FlightCabinBadges';
import FlightStatusBadges from '../flightCardShared/FlightStatusBadges';
import FlightTargetAlertChip from '../flightCardShared/FlightTargetAlertChip';
import FlightActionBar from '../flightCardShared/FlightActionBar';
import { Coins } from 'lucide-react';

interface CondensedFlightRowProps {
  flight: Flight;
  settings?: Settings | null;
  isHistoryHovered: boolean;
  onRefresh: () => void;
  onShowHistory: (flight: Flight) => void;
  onEdit: (flight: Flight) => void;
  onConvertToBooked?: (flight: Flight) => void;
  onOpenManualCheck?: (flight: Flight) => void;
  onRebook?: (flight: Flight) => void;
  onDelete: (flight: Flight) => void;
  onHoverHistory: (id: number | null) => void;
}

export default function CondensedFlightRow({
  flight,
  settings,
  isHistoryHovered,
  onRefresh,
  onShowHistory,
  onEdit,
  onConvertToBooked,
  onOpenManualCheck,
  onRebook,
  onDelete,
  onHoverHistory,
}: CondensedFlightRowProps) {
  const isPurchased = flight.purchasePrice !== null && flight.purchasePrice !== undefined && flight.purchasePrice > 0;
  const benchmarkPrice = isPurchased ? flight.purchasePrice! : flight.baselinePrice;
  const isDrop = flight.currentPrice < benchmarkPrice;
  const delta = benchmarkPrice - flight.currentPrice;
  const isPast = flight.status === 'Past';
  const currentPriceAirline = getCurrentPriceAirline(flight);

  return (
    <tr
      key={flight.id}
      onClick={() => onShowHistory(flight)}
      onMouseEnter={() => onHoverHistory(flight.id)}
      onMouseLeave={() => onHoverHistory(null)}
      className={`hover:bg-gunmetal-canvas/40 transition-colors group/row hover:relative hover:z-10 hover:outline hover:outline-1 hover:-outline-offset-1 cursor-pointer ${
        isPast
          ? 'hover:outline-slate-700/60'
          : isPurchased
          ? 'hover:outline-emerald-600'
          : 'hover:outline-sky-600'
      }`}
    >
      {/* 1. Route / Flight Cell */}
      <td
        className={`py-3 px-4 border-l-4 transition-colors ${
          isPast
            ? 'border-l-slate-700/60'
            : isPurchased
            ? 'border-l-emerald-500 group-hover/row:border-l-emerald-600'
            : 'border-l-sky-500/70 group-hover/row:border-l-sky-600'
        }`}
      >
        <FlightRouteDisplay flight={flight} variant="condensed" />
      </td>

      {/* 2. Departure Date */}
      <td className="py-3 px-4 text-slate-200 font-medium whitespace-nowrap">
        {flight.departureDate}
      </td>

      {/* 3. Cabin & Tier */}
      <td className="py-3 px-4">
        <FlightCabinBadges
          flight={flight}
          size="xs"
          showRebookSavings={true}
          showPnr={false}
        />
      </td>

      {/* 4. Current Price */}
      <td className="py-3 px-4 whitespace-nowrap w-32 min-w-[120px]">
        <div className="flex items-center gap-1.5 whitespace-nowrap">
          <span className="font-black text-slate-100">
            {formatCurrency(flight.currentPrice, flight.currency)}
          </span>
          {!isPurchased && currentPriceAirline && (
            <AirlineBadge
              code={currentPriceAirline.code}
              flightNumber={currentPriceAirline.flightNumber}
              showFlightNumber={false}
              size="xs"
            />
          )}
        </div>
        {flight.currency && isPointsCurrency(flight.currency) && (
          <div className="mt-0.5">
            <span className="bg-amber-950/60 text-amber-300 border border-amber-800/60 px-1.5 py-0.2 rounded text-[10px] font-semibold inline-flex items-center gap-1">
              <Coins className="w-3 h-3 text-amber-400" /> {flight.currency}
            </span>
          </div>
        )}
        {delta !== 0 && (
          <div className="mt-0.5">
            <span className={`text-xs font-semibold ${isDrop ? 'text-green-400' : 'text-red-400'} block`}>
              {isDrop ? '▼' : '▲'} {formatCurrency(Math.abs(delta), flight.currency)}
            </span>
          </div>
        )}
      </td>

      {/* 5. Baseline & Notifications */}
      <td className="py-3 px-4 text-gunmetal-muted whitespace-nowrap">
        <div className="space-y-1">
          <span className="text-slate-200 font-medium block text-xs">
            <span className="text-[11px] text-gunmetal-muted font-normal mr-1">{isPurchased ? 'Paid:' : 'Initial:'}</span>
            {formatCurrency(benchmarkPrice, flight.currency)}
          </span>
          <FlightTargetAlertChip flight={flight} settings={settings} size="xs" />
        </div>
      </td>

      {/* 6. Status */}
      <td className="py-3 px-4 whitespace-nowrap">
        <FlightStatusBadges flight={flight} size="xs" align="start" />
      </td>

      {/* 7. Actions */}
      <td
        onClick={e => e.stopPropagation()}
        onMouseEnter={() => onHoverHistory(null)}
        onMouseLeave={() => onHoverHistory(flight.id)}
        className="py-3 px-4 text-right whitespace-nowrap cursor-default"
      >
        <FlightActionBar
          flight={flight}
          settings={settings}
          onRefresh={onRefresh}
          onShowHistory={() => onShowHistory(flight)}
          onEdit={onEdit}
          onConvertToBooked={onConvertToBooked}
          onOpenManualCheck={onOpenManualCheck}
          onRebook={onRebook}
          onDelete={onDelete}
          variant="condensed"
          isHistoryHovered={isHistoryHovered}
        />
      </td>
    </tr>
  );
}