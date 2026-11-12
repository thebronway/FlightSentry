'use client';

import { useMemo, useState } from 'react';
import { Flight, Settings } from '@/types';
import { formatCurrency, isPointsCurrency } from '@/utils/format';
import { getCurrentPriceAirline, getOperatingAirlines } from '@/utils/airline';
import AirlineBadge from './common/AirlineBadge';
import FlightStatusBadges from './flightCardShared/FlightStatusBadges';
import FlightRouteDisplay from './flightCardShared/FlightRouteDisplay';
import FlightCabinBadges from './flightCardShared/FlightCabinBadges';
import FlightTargetAlertChip from './flightCardShared/FlightTargetAlertChip';
import FlightActionBar from './flightCardShared/FlightActionBar';
import { Coins } from 'lucide-react';

interface Props {
  flight: Flight;
  settings?: Settings | null;
  onRefresh: () => void;
  onShowHistory: () => void;
  onEdit: (flight: Flight) => void;
  onConvertToBooked?: (flight: Flight) => void;
  onOpenManualCheck?: (flight: Flight) => void;
  onRebook?: (flight: Flight) => void;
  onDelete: (flight: Flight) => void;
}

export default function FlightCard({
  flight,
  settings,
  onRefresh,
  onShowHistory,
  onEdit,
  onConvertToBooked,
  onOpenManualCheck,
  onRebook,
  onDelete,
}: Props) {
  const [isTopHovered, setIsTopHovered] = useState(false);

  const isPurchased = flight.purchasePrice !== null && flight.purchasePrice !== undefined && flight.purchasePrice > 0;
  const benchmarkPrice = isPurchased ? flight.purchasePrice! : flight.baselinePrice;
  const benchmarkLabel = isPurchased ? 'Paid' : 'Initial';
  const isDrop = flight.currentPrice < benchmarkPrice;
  const delta = benchmarkPrice - flight.currentPrice;

  const isFlightNumMode = flight.searchMode === 'FlightNumber' && Boolean(flight.flightNumber);
  const isManualMode = flight.isManual === 1 || isPointsCurrency(flight.currency);
  const operatingAirlines = useMemo(() => getOperatingAirlines(flight), [flight]);
  const currentPriceAirline = useMemo(() => getCurrentPriceAirline(flight), [flight]);
  const isPast = flight.status === 'Past';

  return (
    <div className={`bg-gunmetal-card rounded-lg shadow-sm border ${
      isPast
        ? 'border-slate-800/80 bg-gunmetal-card/60 opacity-70'
        : isPurchased
        ? 'border-gunmetal-border border-l-4 border-l-emerald-500 bg-gunmetal-card hover:border-emerald-600'
        : 'border-gunmetal-border border-l-4 border-l-sky-500/70 bg-gunmetal-card hover:border-sky-600'
    } p-4 sm:p-5 flex flex-col justify-between transition-all group/card`}>
      {/* Top 2/3 Clickable Region -> Directly Opens History Modal */}
      <div
        onClick={onShowHistory}
        onMouseEnter={() => setIsTopHovered(true)}
        onMouseLeave={() => setIsTopHovered(false)}
        className="cursor-pointer select-none flex-1 flex flex-col justify-between"
        aria-label="View flight price history, trend graph and carrier matrix"
      >
        <div>
          <div className="flex justify-between items-start mb-2">
            <div className="min-w-0 pr-2">
              <FlightRouteDisplay flight={flight} variant="card" />
            </div>
            <FlightStatusBadges flight={flight} size="sm" align="end" />
          </div>

          {/* Dedicated Airlines Bubble Row (spans full width across the card) */}
          {!isPurchased && (
            <div className="flex flex-wrap items-center gap-1.5 mb-2">
              {isFlightNumMode ? (
                <AirlineBadge
                  code={flight.airline}
                  flightNumber={flight.flightNumber}
                  size="sm"
                  align="left"
                />
              ) : operatingAirlines.length > 0 ? (
                operatingAirlines.map((code, idx) => (
                  <AirlineBadge
                    key={code}
                    code={code}
                    size="xs"
                    showFlightNumber={false}
                    align={idx === 0 ? 'left' : 'center'}
                  />
                ))
              ) : null}
            </div>
          )}

          <div className="my-2.5">
            <FlightCabinBadges flight={flight} size="sm" showRebookSavings showPnr />
          </div>

          {/* Price & Target Alert Block */}
          <div className="flex justify-between items-end gap-3 mt-3 mb-2">
            <div className="flex-1 min-w-0 pr-1">
              <p className="text-[11px] text-gunmetal-muted uppercase tracking-wider font-semibold">Current Price</p>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
                <span className="text-3xl font-black text-slate-100 whitespace-nowrap">
                  {formatCurrency(flight.currentPrice, flight.currency)}
                </span>
                {flight.currency && isPointsCurrency(flight.currency) && (
                  <span className="bg-amber-950/60 text-amber-300 border border-amber-800/60 px-2 py-0.5 rounded text-xs font-semibold inline-flex items-center gap-1 flex-shrink-0">
                    <Coins className="w-3 h-3 text-amber-400" /> {flight.currency}
                  </span>
                )}
                {!isPurchased && !isManualMode && currentPriceAirline && (
                  <AirlineBadge
                    code={currentPriceAirline.code}
                    flightNumber={currentPriceAirline.flightNumber}
                    showFlightNumber={false}
                    size="xs"
                  />
                )}
              </div>
            </div>

            <div className="text-right flex-shrink-0">
              <p className="text-[11px] text-gunmetal-muted uppercase tracking-wider font-semibold whitespace-nowrap">
                {benchmarkLabel}: {formatCurrency(benchmarkPrice, flight.currency)}
              </p>
              {delta !== 0 && (
                <div className={`text-sm font-bold flex items-center justify-end whitespace-nowrap ${isDrop ? 'text-green-400' : 'text-red-400'}`}>
                  {isDrop ? '▼' : '▲'} {formatCurrency(Math.abs(delta), flight.currency)}
                </div>
              )}
              {!isPast && (
                <div className="flex justify-end mt-1.5 whitespace-nowrap">
                  <FlightTargetAlertChip flight={flight} settings={settings} size="sm" />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Action Bar */}
      <FlightActionBar
        flight={flight}
        settings={settings}
        onRefresh={onRefresh}
        onShowHistory={onShowHistory}
        onEdit={onEdit}
        onConvertToBooked={onConvertToBooked}
        onOpenManualCheck={onOpenManualCheck}
        onRebook={onRebook}
        onDelete={onDelete}
        variant="card"
        isHistoryHovered={isTopHovered}
      />
    </div>
  );
}