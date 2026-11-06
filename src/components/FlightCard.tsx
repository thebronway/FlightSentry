'use client';

import { useMemo, useState } from 'react';
import { Flight, Settings } from '@/types';
import { RefreshCw, Clock, Pause, Play, Trash2, Pencil, Bell, BellOff, ShoppingBag, Tag, Coins } from 'lucide-react';
import GoogleIcon from './GoogleIcon';
import { formatCurrency, computeAlertTargets, computeIncreaseAlertTargets, isPointsCurrency } from '@/utils/format';
import { useFlightActions, CABIN_LABEL_MAP } from '@/hooks/useFlightActions';
import { getGoogleFlightsUrl, getOperatingAirlines, getCurrentPriceAirline } from '@/utils/airline';
import AirlineBadge from './common/AirlineBadge';
import Tooltip from './common/Tooltip';

interface Props {
  flight: Flight;
  settings?: Settings | null;
  onRefresh: () => void;
  onShowHistory: () => void;
  onEdit: (flight: Flight) => void;
  onConvertToBooked?: (flight: Flight) => void;
  onDelete: (flight: Flight) => void;
}

export default function FlightCard({ flight, settings, onRefresh, onShowHistory, onEdit, onConvertToBooked, onDelete }: Props) {
  const { toggleStatus, checkNow } = useFlightActions(onRefresh);
  const [isTopHovered, setIsTopHovered] = useState(false);

  const isPurchased = flight.purchasePrice !== null && flight.purchasePrice !== undefined && flight.purchasePrice > 0;
  const benchmarkPrice = isPurchased ? flight.purchasePrice! : flight.baselinePrice;
  const benchmarkLabel = isPurchased ? 'Paid' : 'Initial';
  const isDrop = flight.currentPrice < benchmarkPrice;
  const delta = benchmarkPrice - flight.currentPrice;

  // Prominent title formatting: Route or Flight Number in big font
  const isFlightNumMode = flight.searchMode === 'FlightNumber' && flight.flightNumber;
  const primaryHeadline = isFlightNumMode
    ? `${flight.airline} ${flight.flightNumber}`
    : `${flight.origin} → ${flight.destination}`;

  const operatingAirlines = useMemo(() => getOperatingAirlines(flight), [flight]);
  const secondaryDetail = isFlightNumMode ? `${flight.origin} → ${flight.destination}` : '';
  const currentPriceAirline = useMemo(() => getCurrentPriceAirline(flight), [flight]);

  const isPast = flight.status === 'Past';
  const googleFlightsUrl = getGoogleFlightsUrl(flight);

  return (
    <div className={`bg-gunmetal-card rounded-lg shadow-sm border ${
      isPast
        ? 'border-slate-800/80 bg-gunmetal-card/60 opacity-70'
        : isPurchased
        ? 'border-gunmetal-border border-l-4 border-l-emerald-500 bg-gunmetal-card hover:border-emerald-600'
        : 'border-gunmetal-border border-l-4 border-l-sky-500/70 bg-gunmetal-card hover:border-sky-600'
    } p-5 flex flex-col justify-between transition-all group/card`}>
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
            <div>
              <h3 className="text-2xl font-black text-slate-100 tracking-tight font-sans group-hover/card:text-white transition-colors">
                {primaryHeadline}
              </h3>
              <p className="text-sm font-medium text-slate-300 mt-0.5">
                {flight.departureDate}
                {secondaryDetail && (
                  <span className="text-xs text-gunmetal-muted font-normal ml-1.5">
                    • {secondaryDetail}
                  </span>
                )}
              </p>
            </div>
            {flight.status === 'Watching' ? (
              <span className="bg-sky-950/60 text-sky-300 border border-sky-800/50 px-2 py-0.5 rounded text-xs font-semibold flex items-center gap-1">
                <Tag className="w-3 h-3 text-sky-400" /> Watching
              </span>
            ) : flight.status === 'Booked' ? (
              <span className="bg-emerald-950/60 text-emerald-300 border border-emerald-800/60 px-2 py-0.5 rounded text-xs font-semibold flex items-center gap-1">
                <ShoppingBag className="w-3 h-3 text-emerald-400" /> Booked
              </span>
            ) : flight.status === 'Paused' ? (
              <span className="bg-amber-950/60 text-amber-300 border border-amber-800/60 px-2 py-0.5 rounded text-xs font-semibold flex items-center gap-1">
                <Pause className="w-3 h-3 text-amber-400" /> Paused
              </span>
            ) : (
              <span className="bg-slate-800/50 text-slate-400 border border-slate-700/50 px-2 py-0.5 rounded text-xs font-semibold flex items-center gap-1">
                <Clock className="w-3 h-3 text-slate-400" /> Past
              </span>
            )}
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

          <div className="flex flex-wrap items-center gap-1.5 my-2.5">
            {isPurchased && flight.baselinePrice > 0 && flight.baselinePrice > flight.purchasePrice! && (
              <span className="bg-emerald-950/50 text-emerald-300 border border-emerald-700/60 px-2 py-0.5 rounded text-xs font-semibold">
                +{formatCurrency(flight.baselinePrice - flight.purchasePrice!, flight.currency)} Rebook Savings
              </span>
            )}
            {flight.currency && isPointsCurrency(flight.currency) && (
              <span className="bg-amber-950/60 text-amber-300 border border-amber-800/60 px-2 py-0.5 rounded text-xs font-semibold flex items-center gap-1">
                <Coins className="w-3 h-3 text-amber-400" /> {flight.currency}
              </span>
            )}
            <span className="bg-gunmetal-canvas text-slate-300 border border-gunmetal-border px-2 py-0.5 rounded text-xs font-medium">
              {CABIN_LABEL_MAP[flight.cabinClass] || 'Economy'}
            </span>
            <span className="bg-gunmetal-canvas text-gunmetal-muted border border-gunmetal-border px-2 py-0.5 rounded text-xs font-medium">
              {flight.fareTier}
            </span>
            {flight.noRedeye === 1 && (
              <span className="bg-gunmetal-canvas text-amber-400 border border-amber-800/60 px-2 py-0.5 rounded text-xs font-medium">
                No Redeye
              </span>
            )}
            {flight.maxStops === 0 && (
              <span className="bg-gunmetal-canvas text-sky-400 border border-sky-800/60 px-2 py-0.5 rounded text-xs font-medium">
                Nonstop
              </span>
            )}
            {flight.maxStops === 1 && (
              <span className="bg-gunmetal-canvas text-slate-300 border border-gunmetal-border px-2 py-0.5 rounded text-xs font-medium">
                ≤ 1 Stop
              </span>
            )}
            {flight.maxStops === 2 && (
              <span className="bg-gunmetal-canvas text-slate-300 border border-gunmetal-border px-2 py-0.5 rounded text-xs font-medium">
                ≤ 2 Stops
              </span>
            )}
            {!isPurchased && flight.priceTrackingDirection === 'increase' && (
              <span className="bg-gunmetal-canvas text-rose-400 border border-rose-800/60 px-2 py-0.5 rounded text-xs font-medium">
                Surges Only
              </span>
            )}
            {!isPurchased && flight.priceTrackingDirection === 'both' && (
              <span className="bg-gunmetal-canvas text-sky-400 border border-sky-800/60 px-2 py-0.5 rounded text-xs font-medium">
                Drops & Surges
              </span>
            )}
            {flight.pnr && (
              <span className="bg-gunmetal-canvas text-slate-300 border border-gunmetal-border px-2 py-0.5 rounded text-xs font-medium">
                PNR: {flight.pnr}
              </span>
            )}
          </div>

          {(() => {
            const effectiveDollar =
              flight.minDropDollar !== null && flight.minDropDollar !== undefined
                ? flight.minDropDollar
                : settings?.minDropDollar ?? 15;
            const effectivePercent =
              flight.minDropPercent !== null && flight.minDropPercent !== undefined
                ? flight.minDropPercent
                : settings?.minDropPercent ?? 5;

            const dropTargets = computeAlertTargets(
              flight.currentPrice,
              effectiveDollar,
              effectivePercent
            );

            const effectiveIncDollar =
              flight.minIncreaseDollar !== null && flight.minIncreaseDollar !== undefined
                ? flight.minIncreaseDollar
                : settings?.minIncreaseDollar ?? 50;
            const effectiveIncPercent =
              flight.minIncreasePercent !== null && flight.minIncreasePercent !== undefined
                ? flight.minIncreasePercent
                : settings?.minIncreasePercent ?? 10;

            const incTargets = computeIncreaseAlertTargets(
              flight.currentPrice,
              effectiveIncDollar,
              effectiveIncPercent
            );

            const dir = isPurchased ? 'drop' : (flight.priceTrackingDirection || 'drop');

            return (
              <div className="flex justify-between items-end mt-3 mb-2">
                <div>
                <p className="text-[11px] text-gunmetal-muted uppercase tracking-wider font-semibold">Current Price</p>
                <div className="flex items-center gap-2">
                  <span className="text-3xl font-black text-slate-100">{formatCurrency(flight.currentPrice, flight.currency)}</span>
                  {!isPurchased && currentPriceAirline && (
                    <AirlineBadge
                      code={currentPriceAirline.code}
                      flightNumber={currentPriceAirline.flightNumber}
                      showFlightNumber={false}
                      size="xs"
                    />
                  )}
                </div>
              </div>
                <div className="text-right">
                  <p className="text-[11px] text-gunmetal-muted uppercase tracking-wider font-semibold">{benchmarkLabel}: {formatCurrency(benchmarkPrice, flight.currency)}</p>
                  {delta !== 0 && (
                    <div className={`text-sm font-bold flex items-center justify-end ${isDrop ? 'text-green-400' : 'text-red-400'}`}>
                      {isDrop ? '▼' : '▲'} {formatCurrency(Math.abs(delta), flight.currency)}
                    </div>
                  )}
                  {!isPast && (
                    <p
                      className={`text-[11px] font-medium mt-1 flex items-center justify-end gap-1 ${
                        flight.disableNotifications === 1
                          ? 'text-gunmetal-muted'
                          : 'text-sky-400'
                      }`}
                      title={
                        flight.disableNotifications === 1
                          ? 'Notifications muted for this flight'
                          : dir === 'both'
                          ? `Drop alert at ≤ ${formatCurrency(dropTargets.effectiveTarget || 0, flight.currency)}, surge alert at ≥ ${formatCurrency(incTargets.effectiveTarget || 0, flight.currency)}`
                          : dir === 'increase'
                          ? `Surge alert at ≥ ${formatCurrency(incTargets.effectiveTarget || 0, flight.currency)}`
                          : `Drop alert at ≤ ${formatCurrency(dropTargets.effectiveTarget || 0, flight.currency)}`
                      }
                    >
                      {flight.disableNotifications === 1 ? (
                        <BellOff className="w-3 h-3 text-gunmetal-muted flex-shrink-0" />
                      ) : (
                        <Bell className="w-3 h-3 text-sky-400 flex-shrink-0" />
                      )}
                      <span>
                        {flight.disableNotifications === 1
                          ? 'Muted'
                          : dir === 'both'
                          ? `≤ ${formatCurrency(dropTargets.effectiveTarget || 0, flight.currency)} · ≥ ${formatCurrency(incTargets.effectiveTarget || 0, flight.currency)}`
                          : dir === 'increase'
                          ? `≥ ${formatCurrency(incTargets.effectiveTarget || 0, flight.currency)}`
                          : `≤ ${formatCurrency(dropTargets.effectiveTarget || 0, flight.currency)}`}
                      </span>
                    </p>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* Bottom Action Bar (Clicks isolated from triggering history) */}
      <div
        onClick={e => e.stopPropagation()}
        className={`mt-auto grid ${!isPurchased && onConvertToBooked ? 'grid-cols-7' : 'grid-cols-6'} gap-1 pt-3 border-t border-gunmetal-border`}
      >
        <Tooltip
          content={isPast ? "Checks disabled for past flights" : isPointsCurrency(flight.currency) ? "Automated checks disabled for points flights" : "Check live price now"}
          align="left"
          className="w-full"
        >
          <button
            onClick={(e) => { e.stopPropagation(); checkNow(flight.id); }}
            disabled={isPast || flight.status === 'Paused' || isPointsCurrency(flight.currency)}
            className="w-full flex justify-center items-center p-2 text-sky-400 hover:text-sky-300 hover:bg-sky-950/40 rounded-md disabled:opacity-25 disabled:pointer-events-none transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </Tooltip>
        <Tooltip
          content="View price history & trend graph"
          align="center"
          className="w-full"
        >
          <button
            onClick={(e) => { e.stopPropagation(); onShowHistory(); }}
            className={`w-full flex justify-center items-center p-2 rounded-md transition-colors ${
              isTopHovered
                ? 'text-white bg-slate-700/60 ring-1 ring-slate-400 shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-gunmetal-canvas'
            }`}
          >
            <Clock className="w-4 h-4" />
          </button>
        </Tooltip>
        <Tooltip
          content="Search on Google Flights"
          align="center"
          className="w-full"
        >
          <a
            href={googleFlightsUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="w-full flex justify-center items-center p-2 text-slate-300 hover:text-[#4285F4] hover:bg-blue-950/30 rounded-md transition-colors"
          >
            <GoogleIcon className="w-4 h-4" />
          </a>
        </Tooltip>
        <Tooltip
          content="Edit flight details & preferences"
          align="center"
          className="w-full"
        >
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(flight); }}
            className="w-full flex justify-center items-center p-2 text-purple-400 hover:text-purple-300 hover:bg-purple-950/30 rounded-md transition-colors"
          >
            <Pencil className="w-4 h-4" />
          </button>
        </Tooltip>
        {!isPurchased && onConvertToBooked && (
          <Tooltip
            content="Convert to Booked (I bought this flight)"
            align="center"
            className="w-full"
          >
            <button
              onClick={(e) => { e.stopPropagation(); onConvertToBooked(flight); }}
              className="w-full flex justify-center items-center p-2 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/30 rounded-md transition-colors"
            >
              <ShoppingBag className="w-4 h-4" />
            </button>
          </Tooltip>
        )}
        <Tooltip
          content={isPast ? "Past flight" : flight.status !== 'Paused' ? 'Pause automated price checks' : 'Resume automated price checks'}
          align="center"
          className="w-full"
        >
          <button
            onClick={(e) => { e.stopPropagation(); toggleStatus(flight); }}
            disabled={isPast}
            className="w-full flex justify-center items-center p-2 text-amber-400 hover:text-amber-300 hover:bg-amber-950/30 rounded-md disabled:opacity-25 disabled:pointer-events-none transition-colors"
          >
            {flight.status !== 'Paused' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>
        </Tooltip>
        <Tooltip
          content="Delete flight"
          align="right"
          className="w-full"
        >
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(flight); }}
            className="w-full flex justify-center items-center p-2 text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 rounded-md transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </Tooltip>
      </div>
    </div>
  );
}