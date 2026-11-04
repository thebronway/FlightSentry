'use client';

import { useState } from 'react';
import { Flight, Settings } from '@/types';
import { RefreshCw, Clock, Pause, Play, Trash2, Pencil, Bell, BellOff, ShoppingBag, Tag } from 'lucide-react';
import GoogleIcon from './GoogleIcon';
import { formatCurrency, computeAlertTargets, computeIncreaseAlertTargets } from '@/utils/format';
import { useFlightActions, CONDENSED_CABIN_LABEL_MAP } from '@/hooks/useFlightActions';
import { getGoogleFlightsUrl } from '@/utils/airline';
import AirlineBadge from './common/AirlineBadge';

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
    <div className="bg-gunmetal-card rounded-lg border border-gunmetal-border overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-gunmetal-border bg-gunmetal-canvas/60 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              <th className="py-3 px-4 border-l-4 border-l-transparent">Flight / Route</th>
              <th className="py-3 px-4">Departure</th>
              <th className="py-3 px-4">Tier & Cabin</th>
              <th className="py-3 px-4">Current Price</th>
              <th className="py-3 px-4">Benchmark</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-right">Actions</th>
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
                    <div className="text-xs text-gunmetal-muted flex items-center gap-1.5 mt-0.5">
                      {isFlightNumMode ? (
                        <>
                          <span>{flight.origin} → {flight.destination}</span>
                          {flight.pnr && <span>• PNR: {flight.pnr}</span>}
                        </>
                      ) : (
                        <>
                          {flight.airline ? (
                            <AirlineBadge code={flight.airline} size="xs" showFlightNumber={false} />
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
                      {isPurchased ? (
                        <span className="bg-emerald-950/60 text-emerald-300 border border-emerald-800/60 px-2 py-0.5 rounded text-[11px] font-semibold inline-flex items-center gap-1">
                          <ShoppingBag className="w-3 h-3 text-emerald-400" /> Booked
                        </span>
                      ) : (
                        <span className="bg-sky-950/50 text-sky-300 border border-sky-800/50 px-2 py-0.5 rounded text-[11px] font-semibold inline-flex items-center gap-1">
                          <Tag className="w-3 h-3 text-sky-400" /> Watching
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
                    <span className="font-black text-slate-100 block">
                      {formatCurrency(flight.currentPrice)}
                    </span>
                    {delta !== 0 && (
                      <span className={`text-xs font-semibold ${isDrop ? 'text-green-400' : 'text-red-400'}`}>
                        {isDrop ? '↓' : '↑'} {formatCurrency(Math.abs(delta))}
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
                          : settings?.minDropDollar ?? 15;
                      const effIncPercent =
                        flight.minIncreasePercent !== null && flight.minIncreasePercent !== undefined
                          ? flight.minIncreasePercent
                          : settings?.minDropPercent ?? 5;
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
                              ? `Alerts at ≤ ${formatCurrency(dropTargets.effectiveTarget || 0)} or ≥ ${formatCurrency(incTargets.effectiveTarget || 0)}`
                              : dir === 'increase'
                              ? `Alerts at ≥ ${formatCurrency(incTargets.effectiveTarget || 0)}`
                              : `Alerts at ≤ ${formatCurrency(dropTargets.effectiveTarget || 0)}`
                          }
                        >
                          {flight.disableNotifications === 1 ? (
                            <BellOff className="w-3 h-3 text-gunmetal-muted" />
                          ) : (
                            <Bell className="w-3 h-3 text-sky-400" />
                          )}
                          <span>
                            {dir === 'both'
                              ? `≤ ${formatCurrency(dropTargets.effectiveTarget || 0)} · ≥ ${formatCurrency(incTargets.effectiveTarget || 0)}`
                              : dir === 'increase'
                              ? `≥ ${formatCurrency(incTargets.effectiveTarget || 0)}`
                              : `≤ ${formatCurrency(dropTargets.effectiveTarget || 0)}`}
                          </span>
                        </span>
                      );
                    })()}
                  </td>

                  <td className="py-3 px-4 text-gunmetal-muted whitespace-nowrap">
                    <span className="text-slate-200 font-medium block">{formatCurrency(benchmarkPrice)}</span>
                    <span className="text-[10px] text-gunmetal-muted block">{isPurchased ? 'Paid' : 'Initial'}</span>
                  </td>

                  <td className="py-3 px-4 whitespace-nowrap">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      flight.status === 'Upcoming'
                        ? 'bg-green-900/30 text-green-400 border border-green-800/40'
                        : flight.status === 'Paused'
                        ? 'bg-amber-900/30 text-amber-400 border border-amber-800/40'
                        : 'bg-slate-800/50 text-slate-400 border border-slate-700/50'
                    }`}>
                      {flight.status}
                    </span>
                  </td>

                  <td 
                    onClick={e => e.stopPropagation()}
                    onMouseEnter={() => setHoveredHistoryFlightId(null)}
                    onMouseLeave={() => setHoveredHistoryFlightId(flight.id)}
                    className="py-3 px-4 text-right whitespace-nowrap cursor-default"
                  >
                    <div className="flex items-center justify-end gap-1">
                      <button
                        title={flight.status === 'Past' ? 'Checks disabled for past flights' : 'Check live price now'}
                        onClick={() => checkNow(flight.id)}
                        disabled={flight.status !== 'Upcoming'}
                        className="p-1.5 text-sky-400 hover:text-sky-300 hover:bg-sky-950/40 rounded disabled:opacity-25 disabled:pointer-events-none transition-colors"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>
                      <button
                        title="View price history & trend graph"
                        onClick={() => onShowHistory(flight)}
                        className={`p-1.5 rounded transition-colors ${
                          isHistoryHovered
                            ? 'text-white bg-slate-700/60 ring-1 ring-slate-400 shadow-sm'
                            : 'text-slate-300 hover:text-white hover:bg-gunmetal-canvas'
                        }`}
                      >
                        <Clock className="w-3.5 h-3.5" />
                      </button>
                      <a
                        href={googleFlightsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Search on Google Flights"
                        className="p-1.5 text-slate-300 hover:text-[#4285F4] hover:bg-blue-950/30 rounded transition-colors"
                      >
                        <GoogleIcon className="w-3.5 h-3.5" />
                      </a>
                      <button
                        title="Edit flight details & preferences"
                        onClick={() => onEdit(flight)}
                        className="p-1.5 text-purple-400 hover:text-purple-300 hover:bg-purple-950/30 rounded transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      {!isPurchased && onConvertToBooked && (
                        <button
                          title="Convert to Booked (I bought this flight)"
                          onClick={() => onConvertToBooked(flight)}
                          className="p-1.5 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/30 rounded transition-colors"
                        >
                          <ShoppingBag className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        title={flight.status === 'Past' ? 'Past flight' : flight.status === 'Upcoming' ? 'Pause automated price checks' : 'Resume automated price checks'}
                        onClick={() => toggleStatus(flight)}
                        disabled={flight.status === 'Past'}
                        className="p-1.5 text-amber-400 hover:text-amber-300 hover:bg-amber-950/30 rounded disabled:opacity-25 disabled:pointer-events-none transition-colors"
                      >
                        {flight.status === 'Upcoming' ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        title="Delete flight"
                        onClick={() => onDelete(flight)}
                        className="p-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 rounded transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
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