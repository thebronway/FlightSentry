'use client';

import { useMemo, useState } from 'react';
import { Flight, Settings } from '@/types';
import { RefreshCw, Clock, Pause, Play, Trash2, Pencil, Bell, BellOff, ShoppingBag, Tag, Coins, RotateCcw, DollarSign, TrendingDown, TrendingUp, Wrench } from 'lucide-react';
import GoogleIcon from './GoogleIcon';
import { formatCurrency, formatCompactCurrency, computeAlertTargets, computeIncreaseAlertTargets, isPointsCurrency } from '@/utils/format';
import { useFlightActions, CABIN_LABEL_MAP } from '@/hooks/useFlightActions';
import { getGoogleFlightsUrl, getOperatingAirlines, getCurrentPriceAirline, getAirlineTheme } from '@/utils/airline';
import { resolveLocationDisplay } from '@/utils/coLocations';
import AirlineBadge from './common/AirlineBadge';
import Tooltip from './common/Tooltip';

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
            <div className="min-w-0 pr-2">
              {isFlightNumMode ? (
                (() => {
                  const theme = getAirlineTheme(flight.airline);
                  const originDisplay = resolveLocationDisplay(flight.origin);
                  const destDisplay = resolveLocationDisplay(flight.destination);

                  return (
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className="inline-flex items-center gap-2 px-3 py-1 rounded-lg border shadow-sm font-sans font-bold text-base"
                          style={{
                            backgroundColor: `${theme.color}15`,
                            borderColor: `${theme.color}60`,
                          }}
                        >
                          <span
                            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: theme.color }}
                          />
                          <span className="text-slate-100">{theme.shortName}</span>
                          <span className="font-mono font-black" style={{ color: theme.color }}>
                            {flight.flightNumber}
                          </span>
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 mt-1.5">
                        <span className="text-xs text-gunmetal-muted font-medium">{flight.departureDate}</span>
                        {flight.origin && flight.destination && (
                          <>
                            <span className="text-xs text-gunmetal-muted">•</span>
                            <div className="inline-flex items-center gap-1.5">
                              {originDisplay.isCluster && originDisplay.tooltipText ? (
                                <Tooltip content={originDisplay.tooltipText} align="left">
                                  <span className="px-1.5 py-0.5 rounded bg-gunmetal-canvas border border-gunmetal-border text-slate-200 font-mono font-semibold text-xs shadow-sm cursor-help">
                                    {originDisplay.code}
                                  </span>
                                </Tooltip>
                              ) : (
                                <span className="px-1.5 py-0.5 rounded bg-gunmetal-canvas border border-gunmetal-border text-slate-200 font-mono font-semibold text-xs shadow-sm">
                                  {originDisplay.code}
                                </span>
                              )}
                              <span className="text-gunmetal-muted text-xs">→</span>
                              {destDisplay.isCluster && destDisplay.tooltipText ? (
                                <Tooltip content={destDisplay.tooltipText} align="center">
                                  <span className="px-1.5 py-0.5 rounded bg-gunmetal-canvas border border-gunmetal-border text-slate-200 font-mono font-semibold text-xs shadow-sm cursor-help">
                                    {destDisplay.code}
                                  </span>
                                </Tooltip>
                              ) : (
                                <span className="px-1.5 py-0.5 rounded bg-gunmetal-canvas border border-gunmetal-border text-slate-200 font-mono font-semibold text-xs shadow-sm">
                                  {destDisplay.code}
                                </span>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })()
              ) : (
                (() => {
                  const originDisplay = resolveLocationDisplay(flight.origin);
                  const destDisplay = resolveLocationDisplay(flight.destination);

                  return (
                    <div>
                      <div className="flex items-center gap-2">
                        {originDisplay.isCluster && originDisplay.tooltipText ? (
                          <Tooltip content={originDisplay.tooltipText} align="left">
                            <span className="px-3 py-1 rounded-lg bg-gunmetal-canvas border border-gunmetal-border text-slate-100 font-mono font-black text-lg shadow-sm cursor-help">
                              {originDisplay.code}
                            </span>
                          </Tooltip>
                        ) : (
                          <span className="px-3 py-1 rounded-lg bg-gunmetal-canvas border border-gunmetal-border text-slate-100 font-mono font-black text-lg shadow-sm">
                            {originDisplay.code}
                          </span>
                        )}

                        <span className="text-gunmetal-muted text-base font-bold">→</span>

                        {destDisplay.isCluster && destDisplay.tooltipText ? (
                          <Tooltip content={destDisplay.tooltipText} align="center">
                            <span className="px-3 py-1 rounded-lg bg-gunmetal-canvas border border-gunmetal-border text-slate-100 font-mono font-black text-lg shadow-sm cursor-help">
                              {destDisplay.code}
                            </span>
                          </Tooltip>
                        ) : (
                          <span className="px-3 py-1 rounded-lg bg-gunmetal-canvas border border-gunmetal-border text-slate-100 font-mono font-black text-lg shadow-sm">
                            {destDisplay.code}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gunmetal-muted font-medium mt-1.5">
                        {flight.departureDate}
                      </p>
                    </div>
                  );
                })()
              )}
            </div>
            <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
              {isPast ? (
                <span className="bg-slate-800/50 text-slate-400 border border-slate-700/50 px-2 py-0.5 rounded text-xs font-semibold flex items-center gap-1">
                  <Clock className="w-3 h-3 text-slate-400" /> Past
                </span>
              ) : isPurchased || flight.status === 'Booked' ? (
                <span className="bg-emerald-950/60 text-emerald-300 border border-emerald-800/60 px-2 py-0.5 rounded text-xs font-semibold flex items-center gap-1">
                  <ShoppingBag className="w-3 h-3 text-emerald-400" /> Booked
                </span>
              ) : (
                <span className="bg-sky-950/60 text-sky-300 border border-sky-800/50 px-2 py-0.5 rounded text-xs font-semibold flex items-center gap-1">
                  <Tag className="w-3 h-3 text-sky-400" /> Watching
                </span>
              )}

              {/* Operational Sub-Badges (Option D: Only shown if Paused or Manual) */}
              {!isPast && (flight.status === 'Paused' || flight.isManual === 1 || isPointsCurrency(flight.currency)) && (
                <div className="flex items-center gap-1">
                  {flight.status === 'Paused' && (
                    <span className="bg-amber-950/60 text-amber-300 border border-amber-800/60 px-1.5 py-0.2 rounded text-[10px] font-semibold flex items-center gap-1">
                      <Pause className="w-2.5 h-2.5 text-amber-400" /> Paused
                    </span>
                  )}
                  {(flight.isManual === 1 || isPointsCurrency(flight.currency)) && (
                    <span className="bg-slate-800/80 text-slate-300 border border-slate-700/80 px-1.5 py-0.2 rounded text-[10px] font-semibold flex items-center gap-1">
                      <Wrench className="w-2.5 h-2.5 text-slate-400" /> Manual
                    </span>
                  )}
                </div>
              )}
            </div>
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
              <div className="flex justify-between items-end gap-3 mt-3 mb-2">
                <div className="flex-1 min-w-0 pr-1">
                  <p className="text-[11px] text-gunmetal-muted uppercase tracking-wider font-semibold">Current Price</p>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
                    <span className="text-3xl font-black text-slate-100 whitespace-nowrap">{formatCurrency(flight.currentPrice, flight.currency)}</span>
                    {flight.currency && isPointsCurrency(flight.currency) && (
                      <span className="bg-amber-950/60 text-amber-300 border border-amber-800/60 px-2 py-0.5 rounded text-xs font-semibold inline-flex items-center gap-1 flex-shrink-0">
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
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-[11px] text-gunmetal-muted uppercase tracking-wider font-semibold whitespace-nowrap">{benchmarkLabel}: {formatCurrency(benchmarkPrice, flight.currency)}</p>
                  {delta !== 0 && (
                    <div className={`text-sm font-bold flex items-center justify-end whitespace-nowrap ${isDrop ? 'text-green-400' : 'text-red-400'}`}>
                      {isDrop ? '▼' : '▲'} {formatCurrency(Math.abs(delta), flight.currency)}
                    </div>
                  )}
                  {!isPast && (
                    <div className="flex justify-end mt-1.5 whitespace-nowrap">
                      {flight.disableNotifications === 1 ? (
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-gunmetal-canvas border border-gunmetal-border text-gunmetal-muted shadow-sm"
                          title="Notifications muted for this flight"
                        >
                          <BellOff className="w-3 h-3 text-gunmetal-muted flex-shrink-0" />
                          <span>Alerts Off</span>
                        </span>
                      ) : dir === 'both' ? (
                        <span
                          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-semibold font-mono bg-gunmetal-canvas border border-gunmetal-border text-slate-300 shadow-sm"
                          title={`Drop alert at ≤ ${formatCurrency(dropTargets.effectiveTarget || 0, flight.currency)}, surge alert at ≥ ${formatCurrency(incTargets.effectiveTarget || 0, flight.currency)}`}
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
                      ) : dir === 'increase' ? (
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold font-mono bg-gunmetal-canvas border border-gunmetal-border text-slate-300 shadow-sm"
                          title={`Surge alert at ≥ ${formatCurrency(incTargets.effectiveTarget || 0, flight.currency)}`}
                        >
                          <TrendingUp className="w-3 h-3 text-rose-400 flex-shrink-0" />
                          <Bell className="w-3 h-3 text-rose-400 flex-shrink-0" />
                          <span className="text-rose-300">≥ {formatCompactCurrency(incTargets.effectiveTarget || 0, flight.currency)}</span>
                        </span>
                      ) : (
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold font-mono bg-gunmetal-canvas border border-gunmetal-border text-slate-300 shadow-sm"
                          title={`Drop alert at ≤ ${formatCurrency(dropTargets.effectiveTarget || 0, flight.currency)}`}
                        >
                          <TrendingDown className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                          <Bell className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                          <span className="text-emerald-300">≤ {formatCompactCurrency(dropTargets.effectiveTarget || 0, flight.currency)}</span>
                        </span>
                      )}
                    </div>
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
        className={`mt-auto grid ${(!isPurchased && onConvertToBooked) || (isPurchased && onRebook) ? 'grid-cols-7' : 'grid-cols-6'} gap-1 pt-3 border-t border-gunmetal-border`}
      >
        {isPast ? (
          <Tooltip content="Checks disabled for past flights" align="center" className="w-full">
            <button
              disabled
              className="w-full flex justify-center items-center p-2 text-sky-400 rounded-md opacity-25 pointer-events-none"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </Tooltip>
        ) : (flight.status === 'Paused' || isPointsCurrency(flight.currency)) && onOpenManualCheck ? (
          <Tooltip content="Log manual price check" align="center" className="w-full">
            <button
              onClick={(e) => { e.stopPropagation(); onOpenManualCheck(flight); }}
              className="w-full flex justify-center items-center p-2 text-amber-400 hover:text-amber-300 hover:bg-amber-950/40 rounded-md transition-colors"
            >
              {isPointsCurrency(flight.currency) ? <Coins className="w-4 h-4" /> : <DollarSign className="w-4 h-4" />}
            </button>
          </Tooltip>
        ) : (
          <Tooltip content="Check live price now" align="center" className="w-full">
            <button
              onClick={(e) => { e.stopPropagation(); checkNow(flight.id); }}
              className="w-full flex justify-center items-center p-2 text-sky-400 hover:text-sky-300 hover:bg-sky-950/40 rounded-md transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </Tooltip>
        )}
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
        {isPurchased && onRebook && (
          <Tooltip
            content="Log Flight Rebook or Price Adjustment"
            align="center"
            className="w-full"
          >
            <button
              onClick={(e) => { e.stopPropagation(); onRebook(flight); }}
              className="w-full flex justify-center items-center p-2 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/30 rounded-md transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
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
          align="center"
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