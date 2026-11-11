'use client';

import { useState } from 'react';
import { Flight, Settings } from '@/types';
import { RefreshCw, Clock, Pause, Play, Trash2, Pencil, Bell, BellOff, ShoppingBag, Tag, Coins, RotateCcw, DollarSign, TrendingDown, TrendingUp, Wrench } from 'lucide-react';
import GoogleIcon from './GoogleIcon';
import { formatCurrency, formatCompactCurrency, computeAlertTargets, computeIncreaseAlertTargets, isPointsCurrency } from '@/utils/format';
import { useFlightActions, CONDENSED_CABIN_LABEL_MAP } from '@/hooks/useFlightActions';
import { getGoogleFlightsUrl, getOperatingAirlines, getCurrentPriceAirline, getAirlineTheme } from '@/utils/airline';
import { resolveLocationDisplay } from '@/utils/coLocations';
import AirlineBadge from './common/AirlineBadge';
import Tooltip from './common/Tooltip';

interface Props {
  flights: Flight[];
  settings?: Settings | null;
  onRefresh: () => void;
  onShowHistory: (flight: Flight) => void;
  onEdit: (flight: Flight) => void;
  onConvertToBooked?: (flight: Flight) => void;
  onOpenManualCheck?: (flight: Flight) => void;
  onRebook?: (flight: Flight) => void;
  onDelete: (flight: Flight) => void;
}

export default function FlightCondensedView({
  flights,
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
  const [hoveredHistoryFlightId, setHoveredHistoryFlightId] = useState<number | null>(null);

  return (
    <div className="bg-gunmetal-card rounded-lg border border-gunmetal-border shadow-sm">
      <div>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-gunmetal-border bg-gunmetal-canvas/60 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              <th className="py-3 px-4 border-l-4 border-l-transparent rounded-tl-lg">Flight / Route</th>
              <th className="py-3 px-4">Departure</th>
              <th className="py-3 px-4">Tier & Cabin</th>
              <th className="py-3 px-4">Current Price</th>
              <th className="py-3 px-4">Benchmark</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-right rounded-tr-lg">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gunmetal-border text-sm">
            {flights.map(flight => {
              const isPurchased = flight.purchasePrice !== null && flight.purchasePrice !== undefined && flight.purchasePrice > 0;
              const benchmarkPrice = isPurchased ? flight.purchasePrice! : flight.baselinePrice;
              const isDrop = flight.currentPrice < benchmarkPrice;
              const delta = benchmarkPrice - flight.currentPrice;
              const isFlightNumMode = flight.searchMode === 'FlightNumber' && flight.flightNumber;
              const googleFlightsUrl = getGoogleFlightsUrl(flight);
              const isPast = flight.status === 'Past';
              const isHistoryHovered = hoveredHistoryFlightId === flight.id;
              const operatingAirlines = getOperatingAirlines(flight);
              const currentPriceAirline = getCurrentPriceAirline(flight);
              return (
                <tr
                  key={flight.id}
                  onClick={() => onShowHistory(flight)}
                  onMouseEnter={() => setHoveredHistoryFlightId(flight.id)}
                  onMouseLeave={() => setHoveredHistoryFlightId(null)}
                  className={`hover:bg-gunmetal-canvas/40 transition-colors group/row hover:relative hover:z-10 hover:outline hover:outline-1 hover:-outline-offset-1 cursor-pointer ${
                    isPast
                      ? 'hover:outline-slate-700/60'
                      : isPurchased
                      ? 'hover:outline-emerald-600'
                      : 'hover:outline-sky-600'
                  }`}
                >
                  {/* Columns 1 through 6 are clickable through Status */}
                  <td 
                    className={`py-3 px-4 border-l-4 transition-colors ${
                      isPast
                        ? 'border-l-slate-700/60'
                        : isPurchased
                        ? 'border-l-emerald-500 group-hover/row:border-l-emerald-600'
                        : 'border-l-sky-500/70 group-hover/row:border-l-sky-600'
                    }`}
                  >
                    {isFlightNumMode ? (
                      (() => {
                        const theme = getAirlineTheme(flight.airline);
                        const originDisplay = resolveLocationDisplay(flight.origin);
                        const destDisplay = resolveLocationDisplay(flight.destination);

                        return (
                          <div>
                            <span
                              className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded border text-xs font-bold shadow-sm"
                              style={{
                                backgroundColor: `${theme.color}15`,
                                borderColor: `${theme.color}60`,
                              }}
                            >
                              <span
                                className="w-2 h-2 rounded-full flex-shrink-0"
                                style={{ backgroundColor: theme.color }}
                              />
                              <span className="text-slate-100">{theme.shortName}</span>
                              <span className="font-mono font-black" style={{ color: theme.color }}>
                                {flight.flightNumber}
                              </span>
                            </span>
                            <div className="text-xs text-gunmetal-muted flex flex-wrap items-center gap-1.5 mt-1">
                              {flight.origin && flight.destination && (
                                <div className="inline-flex items-center gap-1">
                                  {originDisplay.isCluster && originDisplay.tooltipText ? (
                                    <Tooltip content={originDisplay.tooltipText} align="left">
                                      <span className="px-1.5 py-0.2 rounded bg-gunmetal-canvas border border-gunmetal-border text-slate-200 font-mono font-semibold text-[11px] cursor-help">
                                        {originDisplay.code}
                                      </span>
                                    </Tooltip>
                                  ) : (
                                    <span className="px-1.5 py-0.2 rounded bg-gunmetal-canvas border border-gunmetal-border text-slate-200 font-mono font-semibold text-[11px]">
                                      {originDisplay.code}
                                    </span>
                                  )}
                                  <span className="text-gunmetal-muted text-[11px]">→</span>
                                  {destDisplay.isCluster && destDisplay.tooltipText ? (
                                    <Tooltip content={destDisplay.tooltipText} align="center">
                                      <span className="px-1.5 py-0.2 rounded bg-gunmetal-canvas border border-gunmetal-border text-slate-200 font-mono font-semibold text-[11px] cursor-help">
                                        {destDisplay.code}
                                      </span>
                                    </Tooltip>
                                  ) : (
                                    <span className="px-1.5 py-0.2 rounded bg-gunmetal-canvas border border-gunmetal-border text-slate-200 font-mono font-semibold text-[11px]">
                                      {destDisplay.code}
                                    </span>
                                  )}
                                </div>
                              )}
                              {flight.pnr && <span>• PNR: {flight.pnr}</span>}
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
                            <div className="flex items-center gap-1.5">
                              {originDisplay.isCluster && originDisplay.tooltipText ? (
                                <Tooltip content={originDisplay.tooltipText} align="left">
                                  <span className="px-2 py-0.5 rounded bg-gunmetal-canvas border border-gunmetal-border text-slate-100 font-mono font-bold text-xs shadow-sm cursor-help">
                                    {originDisplay.code}
                                  </span>
                                </Tooltip>
                              ) : (
                                <span className="px-2 py-0.5 rounded bg-gunmetal-canvas border border-gunmetal-border text-slate-100 font-mono font-bold text-xs shadow-sm">
                                  {originDisplay.code}
                                </span>
                              )}
                              <span className="text-gunmetal-muted text-xs">→</span>
                              {destDisplay.isCluster && destDisplay.tooltipText ? (
                                <Tooltip content={destDisplay.tooltipText} align="center">
                                  <span className="px-2 py-0.5 rounded bg-gunmetal-canvas border border-gunmetal-border text-slate-100 font-mono font-bold text-xs shadow-sm cursor-help">
                                    {destDisplay.code}
                                  </span>
                                </Tooltip>
                              ) : (
                                <span className="px-2 py-0.5 rounded bg-gunmetal-canvas border border-gunmetal-border text-slate-100 font-mono font-bold text-xs shadow-sm">
                                  {destDisplay.code}
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-gunmetal-muted flex flex-wrap items-center gap-1.5 mt-1">
                              {operatingAirlines.length > 0 ? (
                                operatingAirlines.map((code, idx) => (
                                  <AirlineBadge
                                    key={code}
                                    code={code}
                                    size="xs"
                                    showFlightNumber={false}
                                    align={idx === 0 ? 'left' : 'center'}
                                  />
                                ))
                              ) : flight.airline ? (
                                <AirlineBadge code={flight.airline} size="xs" showFlightNumber={false} align="left" />
                              ) : flight.includedAirlines ? (
                                <span>{flight.includedAirlines}</span>
                              ) : (
                                <span>All Airlines</span>
                              )}
                              {flight.pnr && <span>• PNR: {flight.pnr}</span>}
                            </div>
                          </div>
                        );
                      })()
                    )}
                  </td>

                  <td className="py-3 px-4 text-slate-200 font-medium whitespace-nowrap">
                    {flight.departureDate}
                  </td>

                  <td className="py-3 px-4">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="bg-gunmetal-canvas text-slate-300 border border-gunmetal-border px-1.5 py-0.5 rounded text-[11px] font-medium">
                        {CONDENSED_CABIN_LABEL_MAP[flight.cabinClass] || 'Economy'}
                      </span>
                      <span className="bg-gunmetal-canvas text-gunmetal-muted border border-gunmetal-border px-1.5 py-0.5 rounded text-[11px] font-medium">
                        {flight.fareTier}
                      </span>
                      {flight.noRedeye === 1 && (
                        <span className="bg-gunmetal-canvas text-amber-400 border border-amber-800/60 px-1.5 py-0.5 rounded text-[10px] font-medium">
                          No Redeye
                        </span>
                      )}
                      {flight.maxStops === 0 && (
                        <span className="bg-gunmetal-canvas text-sky-400 border border-sky-800/60 px-1.5 py-0.5 rounded text-[10px] font-medium">
                          Nonstop
                        </span>
                      )}
                      {flight.maxStops === 1 && (
                        <span className="bg-gunmetal-canvas text-slate-300 border border-gunmetal-border px-1.5 py-0.5 rounded text-[10px] font-medium">
                          ≤ 1 Stop
                        </span>
                      )}
                      {flight.maxStops === 2 && (
                        <span className="bg-gunmetal-canvas text-slate-300 border border-gunmetal-border px-1.5 py-0.5 rounded text-[10px] font-medium">
                          ≤ 2 Stops
                        </span>
                      )}
                    </div>
                  </td>

                  <td className="py-3 px-4 whitespace-nowrap">
                    <div className="flex items-center flex-wrap gap-2">
                      <span className="font-black text-slate-100">
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
                      <span className={`text-xs font-semibold ${isDrop ? 'text-green-400' : 'text-red-400'} block`}>
                        {isDrop ? '↓' : '↑'} {formatCurrency(Math.abs(delta), flight.currency)}
                      </span>
                    )}
                    {(() => {
                      if (flight.status === 'Past') return null;
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

                      return (
                        <div className="mt-1">
                          {flight.disableNotifications === 1 ? (
                            <span
                              className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-medium bg-gunmetal-canvas border border-gunmetal-border text-gunmetal-muted shadow-sm whitespace-nowrap"
                              title="Notifications muted for this flight"
                            >
                              <BellOff className="w-3 h-3 text-gunmetal-muted flex-shrink-0" />
                              <span>Alerts Off</span>
                            </span>
                          ) : dir === 'both' ? (
                            <span
                              className="inline-flex items-center gap-1.5 px-1.5 py-0.2 rounded text-[10px] font-semibold font-mono bg-gunmetal-canvas border border-gunmetal-border text-slate-300 shadow-sm whitespace-nowrap"
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
                          ) : dir === 'increase' ? (
                            <span
                              className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-semibold font-mono bg-gunmetal-canvas border border-gunmetal-border text-slate-300 shadow-sm whitespace-nowrap"
                              title={`Surge alert at ≥ ${formatCurrency(incTargets.effectiveTarget || 0, flight.currency)}`}
                            >
                              <TrendingUp className="w-3 h-3 text-rose-400 flex-shrink-0" />
                              <Bell className="w-3 h-3 text-rose-400 flex-shrink-0" />
                              <span className="text-rose-300">≥ {formatCompactCurrency(incTargets.effectiveTarget || 0, flight.currency)}</span>
                            </span>
                          ) : (
                            <span
                              className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-semibold font-mono bg-gunmetal-canvas border border-gunmetal-border text-slate-300 shadow-sm whitespace-nowrap"
                              title={`Drop alert at ≤ ${formatCurrency(dropTargets.effectiveTarget || 0, flight.currency)}`}
                            >
                              <TrendingDown className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                              <Bell className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                              <span className="text-emerald-300">≤ {formatCompactCurrency(dropTargets.effectiveTarget || 0, flight.currency)}</span>
                            </span>
                          )}
                        </div>
                      );
                    })()}
                  </td>

                  <td className="py-3 px-4 text-gunmetal-muted whitespace-nowrap">
                    <span className="text-slate-200 font-medium block">{formatCurrency(benchmarkPrice, flight.currency)}</span>
                    <span className="text-[10px] text-gunmetal-muted block">{isPurchased ? 'Paid' : 'Initial'}</span>
                  </td>

                  <td className="py-3 px-4 whitespace-nowrap">
                    <div className="flex flex-col items-start gap-1">
                      {isPast ? (
                        <span className="bg-slate-800/50 text-slate-400 border border-slate-700/50 px-2 py-0.5 rounded text-xs font-semibold inline-flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400" /> Past
                        </span>
                      ) : isPurchased || flight.status === 'Booked' ? (
                        <span className="bg-emerald-950/60 text-emerald-300 border border-emerald-800/60 px-2 py-0.5 rounded text-xs font-semibold inline-flex items-center gap-1">
                          <ShoppingBag className="w-3 h-3 text-emerald-400" /> Booked
                        </span>
                      ) : (
                        <span className="bg-sky-950/60 text-sky-300 border border-sky-800/50 px-2 py-0.5 rounded text-xs font-semibold inline-flex items-center gap-1">
                          <Tag className="w-3 h-3 text-sky-400" /> Watching
                        </span>
                      )}

                      {!isPast && (flight.status === 'Paused' || flight.isManual === 1 || isPointsCurrency(flight.currency)) && (
                        <div className="flex items-center gap-1">
                          {flight.status === 'Paused' && (
                            <span className="bg-amber-950/60 text-amber-300 border border-amber-800/60 px-1.5 py-0.2 rounded text-[10px] font-semibold inline-flex items-center gap-1">
                              <Pause className="w-2.5 h-2.5 text-amber-400" /> Paused
                            </span>
                          )}
                          {(flight.isManual === 1 || isPointsCurrency(flight.currency)) && (
                            <span className="bg-slate-800/80 text-slate-300 border border-slate-700/80 px-1.5 py-0.2 rounded text-[10px] font-semibold inline-flex items-center gap-1">
                              <Wrench className="w-2.5 h-2.5 text-slate-400" /> Manual
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </td>

                  <td 
                    onClick={e => e.stopPropagation()}
                    onMouseEnter={() => setHoveredHistoryFlightId(null)}
                    onMouseLeave={() => setHoveredHistoryFlightId(flight.id)}
                    className="py-3 px-4 text-right whitespace-nowrap cursor-default"
                  >
                    <div className="flex items-center justify-end gap-1">
                      {isPast ? (
                        <Tooltip content="Checks disabled for past flights" align="center">
                          <button
                            disabled
                            className="p-1.5 text-sky-400 rounded opacity-25 pointer-events-none"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                          </button>
                        </Tooltip>
                      ) : (flight.status === 'Paused' || isPointsCurrency(flight.currency)) && onOpenManualCheck ? (
                        <Tooltip content="Log manual price check" align="center">
                          <button
                            onClick={() => onOpenManualCheck(flight)}
                            className="p-1.5 text-amber-400 hover:text-amber-300 hover:bg-amber-950/40 rounded transition-colors"
                          >
                            {isPointsCurrency(flight.currency) ? <Coins className="w-3.5 h-3.5" /> : <DollarSign className="w-3.5 h-3.5" />}
                          </button>
                        </Tooltip>
                      ) : (
                        <Tooltip content="Check live price now" align="center">
                          <button
                            onClick={() => checkNow(flight.id)}
                            className="p-1.5 text-sky-400 hover:text-sky-300 hover:bg-sky-950/40 rounded transition-colors"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                          </button>
                        </Tooltip>
                      )}
                      <Tooltip
                        content="View price history & trend graph"
                        align="center"
                      >
                        <button
                          onClick={() => onShowHistory(flight)}
                          className={`p-1.5 rounded transition-colors ${
                            isHistoryHovered
                              ? 'text-white bg-slate-700/60 ring-1 ring-slate-400 shadow-sm'
                              : 'text-slate-300 hover:text-white hover:bg-gunmetal-canvas'
                          }`}
                        >
                          <Clock className="w-3.5 h-3.5" />
                        </button>
                      </Tooltip>
                      <Tooltip
                        content="Search on Google Flights"
                        align="center"
                      >
                        <a
                          href={googleFlightsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 text-slate-300 hover:text-[#4285F4] hover:bg-blue-950/30 rounded transition-colors"
                        >
                          <GoogleIcon className="w-3.5 h-3.5" />
                        </a>
                      </Tooltip>
                      <Tooltip
                        content="Edit flight details & preferences"
                        align="center"
                      >
                        <button
                          onClick={() => onEdit(flight)}
                          className="p-1.5 text-purple-400 hover:text-purple-300 hover:bg-purple-950/30 rounded transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      </Tooltip>
                      {!isPurchased && onConvertToBooked && (
                        <Tooltip
                          content="Convert to Booked (I bought this flight)"
                          align="center"
                        >
                          <button
                            onClick={() => onConvertToBooked(flight)}
                            className="p-1.5 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/30 rounded transition-colors"
                          >
                            <ShoppingBag className="w-3.5 h-3.5" />
                          </button>
                        </Tooltip>
                      )}
                      {isPurchased && onRebook && (
                        <Tooltip
                          content="Log Flight Rebook or Price Adjustment"
                          align="center"
                        >
                          <button
                            onClick={() => onRebook(flight)}
                            className="p-1.5 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/30 rounded transition-colors"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                        </Tooltip>
                      )}
                      <Tooltip
                        content={flight.status === 'Past' ? 'Past flight' : flight.status !== 'Paused' ? 'Pause automated price checks' : 'Resume automated price checks'}
                        align="center"
                      >
                        <button
                          onClick={() => toggleStatus(flight)}
                          disabled={flight.status === 'Past'}
                          className="p-1.5 text-amber-400 hover:text-amber-300 hover:bg-amber-950/30 rounded disabled:opacity-25 disabled:pointer-events-none transition-colors"
                        >
                          {flight.status !== 'Paused' ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                        </button>
                      </Tooltip>
                      <Tooltip
                        content="Delete flight"
                        align="center"
                      >
                        <button
                          onClick={() => onDelete(flight)}
                          className="p-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 rounded transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </Tooltip>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}