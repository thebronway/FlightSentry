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

interface CondensedMobileCardProps {
  flight: Flight;
  settings?: Settings | null;
  onRefresh: () => void;
  onShowHistory: (flight: Flight) => void;
  onEdit: (flight: Flight) => void;
  onConvertToBooked?: (flight: Flight) => void;
  onOpenManualCheck?: (flight: Flight) => void;
  onRebook?: (flight: Flight) => void;
  onDelete: (flight: Flight) => void;
}

export default function CondensedMobileCard({
  flight,
  settings,
  onRefresh,
  onShowHistory,
  onEdit,
  onConvertToBooked,
  onOpenManualCheck,
  onRebook,
  onDelete,
}: CondensedMobileCardProps) {
  const isPurchased = flight.purchasePrice !== null && flight.purchasePrice !== undefined && flight.purchasePrice > 0;
  const benchmarkPrice = isPurchased ? flight.purchasePrice! : flight.baselinePrice;
  const isDrop = flight.currentPrice < benchmarkPrice;
  const delta = benchmarkPrice - flight.currentPrice;
  const isPast = flight.status === 'Past';
  const currentPriceAirline = getCurrentPriceAirline(flight);

  return (
    <div
      onClick={() => onShowHistory(flight)}
      className={`p-3.5 rounded-lg border bg-gunmetal-card transition-all cursor-pointer shadow-sm overflow-hidden ${
        isPast
          ? 'border-slate-800/80 bg-gunmetal-card/60 opacity-70'
          : isPurchased
          ? 'border-gunmetal-border border-l-4 border-l-emerald-500 hover:border-emerald-600'
          : 'border-gunmetal-border border-l-4 border-l-sky-500/70 hover:border-sky-600'
      }`}
    >
      {/* Line 1: Route & Price */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0 flex-1">
          <FlightRouteDisplay flight={flight} variant="condensed" />
        </div>
        <div className="text-right flex-shrink-0">
          <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
            <span className="font-black text-base text-slate-100 font-mono">
              {formatCurrency(flight.currentPrice, flight.currency)}
            </span>
            {flight.currency && isPointsCurrency(flight.currency) && (
              <span className="bg-amber-950/60 text-amber-300 border border-amber-800/60 px-1.5 py-0.5 rounded text-[10px] font-semibold inline-flex items-center gap-1">
                <Coins className="w-3 h-3 text-amber-400" /> {flight.currency}
              </span>
            )}
            {!isPurchased && currentPriceAirline && (
              <AirlineBadge
                code={currentPriceAirline.code}
                flightNumber={currentPriceAirline.flightNumber}
                showFlightNumber={false}
                size="xs"
              />
            )}
          </div>
          {delta !== 0 && (
            <span className={`text-[11px] font-semibold ${isDrop ? 'text-green-400' : 'text-red-400'} block text-right`}>
              {isDrop ? '▼' : '▲'} {formatCurrency(Math.abs(delta), flight.currency)}
            </span>
          )}
        </div>
      </div>

      {/* Line 2: Date, Badges & Status */}
      <div className="flex items-center justify-between gap-2 py-1.5 border-t border-gunmetal-border/50 text-xs">
        <div className="flex flex-wrap items-center gap-1.5 min-w-0">
          <span className="text-slate-200 font-medium whitespace-nowrap text-[11px]">
            {flight.departureDate}
          </span>
          <span className="text-gunmetal-muted text-[11px]">•</span>
          <FlightCabinBadges
            flight={flight}
            size="xs"
            showRebookSavings={true}
            showPnr={false}
          />
        </div>
        <FlightStatusBadges flight={flight} size="xs" align="end" />
      </div>

      {/* Line 3: Baseline & Target */}
      <div className="flex items-center justify-between gap-2 pt-2 pb-2.5 border-t border-gunmetal-border/50 text-xs">
        <span className="text-[11px] text-gunmetal-muted whitespace-nowrap">
          {isPurchased ? 'Paid:' : 'Initial:'}{' '}
          <strong className="text-slate-200 font-mono">{formatCurrency(benchmarkPrice, flight.currency)}</strong>
        </span>
        <FlightTargetAlertChip flight={flight} settings={settings} size="xs" />
      </div>

      {/* Line 4: Action Toolbar */}
      <div
        onClick={e => e.stopPropagation()}
        className="pt-2 border-t border-gunmetal-border/50 flex justify-end"
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
        />
      </div>
    </div>
  );
}