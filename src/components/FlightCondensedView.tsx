'use client';

import { useState } from 'react';
import { Flight, Settings } from '@/types';
import { RefreshCw, Clock, Pause, Play, Trash2, Pencil, Bell, BellOff, ShoppingBag, Tag, Coins } from 'lucide-react';
import GoogleIcon from './GoogleIcon';
import { formatCurrency, computeAlertTargets, computeIncreaseAlertTargets, isPointsCurrency } from '@/utils/format';
import { useFlightActions, CONDENSED_CABIN_LABEL_MAP } from '@/hooks/useFlightActions';
import { getGoogleFlightsUrl, getOperatingAirlines, getCurrentPriceAirline } from '@/utils/airline';
import AirlineBadge from './common/AirlineBadge';
import Tooltip from './common/Tooltip';

interface Props {
  flights: Flight[];
  settings?: Settings | null;
  onRefresh: () => void;
  onShowHistory: (flight: Flight) => void;
  onEdit: (flight: Flight) => void;
  onConvertToBooked?: (flight: Flight) => void;
  onDelete: (flight: Flight) => void;
}

export default function FlightCondensedView({ flights, settings, onRefresh, onShowHistory, onEdit, onConvertToBooked, onDelete }: Props) {
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
                    <div className="font-bold text-slate-100 font-sans group-hover/row:text-sky-400 transition-colors">
                      {isFlightNumMode ? `${flight.airline} ${flight.flightNumber}` : `${flight.origin} → ${flight.destination}`}
                    </div>
                    <div className="text-xs text-gunmetal-muted flex flex-wrap items-center gap-1.5 mt-0.5">
                      {isFlightNumMode ? (
                        <>
                          <span>{flight.origin} → {flight.destination}</span>
                          {flight.pnr && <span>• PNR: {flight.pnr}</span>}
                        </>
                      ) : (
                        <>
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
                        </>
                      )}
                    </div>
                  </td>

                  <td className="py-3 px-4 text-slate-200 font-medium whitespace-nowrap">
                    {flight.departureDate}
                  </td>

                  <td className="py-3 px-4">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {flight.currency && isPointsCurrency(flight.currency) && (
                        <span className="bg-amber-950/60 text-amber-300 border border-amber-800/60 px-1.5 py-0.5 rounded text-[10px] font-semibold inline-flex items-center gap-1">
                          <Coins className="w-3 h-3 text-amber-400" /> {flight.currency}
                        </span>
                      )}
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
                      {!isPurchased && flight.priceTrackingDirection === 'increase' && (
                        <span className="bg-gunmetal-canvas text-rose-400 border border-rose-800/60 px-1.5 py-0.5 rounded text-[10px] font-medium">
                          Surges Only
                        </span>
                      )}
                      {!isPurchased && flight.priceTrackingDirection === 'both' && (
                        <span className="bg-gunmetal-canvas text-sky-400 border border-sky-800/60 px-1.5 py-0.5 rounded text-[10px] font-medium">
                          Drops & Surges
                        </span>
                      )}
                    </div>
                  </td>

                  <td className="py-3 px-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
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
                        <span
                          className={`text-[11px] font-mono flex items-center gap-1 mt-0.5 ${
                            flight.disableNotifications === 1
                              ? 'text-gunmetal-muted'
                              : 'text-sky-400'
                          }`}
                          title={
                            flight.disableNotifications === 1
                              ? 'Muted'
                              : dir === 'both'
                              ? `Alerts at ≤ ${formatCurrency(dropTargets.effectiveTarget || 0, flight.currency)} or ≥ ${formatCurrency(incTargets.effectiveTarget || 0, flight.currency)}`
                              : dir === 'increase'
                              ? `Alerts at ≥ ${formatCurrency(incTargets.effectiveTarget || 0, flight.currency)}`
                              : `Alerts at ≤ ${formatCurrency(dropTargets.effectiveTarget || 0, flight.currency)}`
                          }
                        >
                          {flight.disableNotifications === 1 ? (
                            <BellOff className="w-3 h-3 text-gunmetal-muted" />
                          ) : (
                            <Bell className="w-3 h-3 text-sky-400" />
                          )}
                          <span>
                            {dir === 'both'
                              ? `≤ ${formatCurrency(dropTargets.effectiveTarget || 0, flight.currency)} · ≥ ${formatCurrency(incTargets.effectiveTarget || 0, flight.currency)}`
                              : dir === 'increase'
                              ? `≥ ${formatCurrency(incTargets.effectiveTarget || 0, flight.currency)}`
                              : `≤ ${formatCurrency(dropTargets.effectiveTarget || 0, flight.currency)}`}
                          </span>
                        </span>
                      );
                    })()}
                  </td>

                  <td className="py-3 px-4 text-gunmetal-muted whitespace-nowrap">
                    <span className="text-slate-200 font-medium block">{formatCurrency(benchmarkPrice, flight.currency)}</span>
                    <span className="text-[10px] text-gunmetal-muted block">{isPurchased ? 'Paid' : 'Initial'}</span>
                  </td>

                  <td className="py-3 px-4 whitespace-nowrap">
                    {flight.status === 'Watching' ? (
                      <span className="bg-sky-950/60 text-sky-300 border border-sky-800/50 px-2 py-0.5 rounded text-xs font-semibold inline-flex items-center gap-1">
                        <Tag className="w-3 h-3 text-sky-400" /> Watching
                      </span>
                    ) : flight.status === 'Booked' ? (
                      <span className="bg-emerald-950/60 text-emerald-300 border border-emerald-800/60 px-2 py-0.5 rounded text-xs font-semibold inline-flex items-center gap-1">
                        <ShoppingBag className="w-3 h-3 text-emerald-400" /> Booked
                      </span>
                    ) : flight.status === 'Paused' ? (
                      <span className="bg-amber-950/60 text-amber-300 border border-amber-800/60 px-2 py-0.5 rounded text-xs font-semibold inline-flex items-center gap-1">
                        <Pause className="w-3 h-3 text-amber-400" /> Paused
                      </span>
                    ) : (
                      <span className="bg-slate-800/50 text-slate-400 border border-slate-700/50 px-2 py-0.5 rounded text-xs font-semibold inline-flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" /> Past
                      </span>
                    )}
                  </td>

                  <td 
                    onClick={e => e.stopPropagation()}
                    onMouseEnter={() => setHoveredHistoryFlightId(null)}
                    onMouseLeave={() => setHoveredHistoryFlightId(flight.id)}
                    className="py-3 px-4 text-right whitespace-nowrap cursor-default"
                  >
                    <div className="flex items-center justify-end gap-1">
                      <Tooltip
                        content={flight.status === 'Past' ? 'Checks disabled for past flights' : flight.status === 'Paused' ? 'Flight checks paused' : isPointsCurrency(flight.currency) ? 'Automated checks disabled for points flights' : 'Check live price now'}
                        align="center"
                      >
                        <button
                          onClick={() => checkNow(flight.id)}
                          disabled={flight.status === 'Past' || flight.status === 'Paused' || isPointsCurrency(flight.currency)}
                          className="p-1.5 text-sky-400 hover:text-sky-300 hover:bg-sky-950/40 rounded disabled:opacity-25 disabled:pointer-events-none transition-colors"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                        </button>
                      </Tooltip>
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
                        align="right"
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