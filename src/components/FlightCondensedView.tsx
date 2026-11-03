'use client';

import { Flight, Settings } from '@/types';
import { RefreshCw, Clock, Pause, Play, Trash2, Pencil, ExternalLink, Bell, BellOff } from 'lucide-react';
import { formatCurrency, computeAlertTargets } from '@/utils/format';
import { useFlightActions, CONDENSED_CABIN_LABEL_MAP } from '@/hooks/useFlightActions';
import { getGoogleFlightsUrl } from '@/utils/airline';

interface Props {
  flights: Flight[];
  settings?: Settings | null;
  onRefresh: () => void;
  onShowHistory: (flight: Flight) => void;
  onEdit: (flight: Flight) => void;
}

export default function FlightCondensedView({ flights, settings, onRefresh, onShowHistory, onEdit }: Props) {
  const { toggleStatus, deleteFlight, checkNow } = useFlightActions(onRefresh);

  return (
    <div className="bg-gunmetal-card rounded-lg border border-gunmetal-border overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-gunmetal-border bg-gunmetal-canvas/60 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              <th className="py-3 px-4">Flight / Route</th>
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
              return (
                <tr key={flight.id} className="hover:bg-gunmetal-canvas/40 transition-colors">
                  <td 
                    onClick={() => onShowHistory(flight)} 
                    className="py-3 px-4 cursor-pointer group"
                    title="Click to view price history"
                  >
                    <div className="font-bold text-slate-100 font-sans group-hover:text-sky-400 transition-colors">
                      {isFlightNumMode ? `${flight.airline} ${flight.flightNumber}` : `${flight.origin} → ${flight.destination}`}
                    </div>
                    <div className="text-xs text-gunmetal-muted">
                      {isFlightNumMode 
                        ? `${flight.origin} → ${flight.destination}` 
                        : flight.airline 
                        ? flight.airline 
                        : flight.includedAirlines 
                        ? `Airlines: ${flight.includedAirlines}` 
                        : 'All Airlines'
                      }
                      {!isFlightNumMode && flight.excludedAirlines && ` (Excl: ${flight.excludedAirlines})`}
                      {flight.pnr && ` • PNR: ${flight.pnr}`}
                    </div>
                  </td>

                  <td className="py-3 px-4 text-slate-200 font-medium whitespace-nowrap">
                    {flight.departureDate}
                  </td>

                  <td className="py-3 px-4">
                    <span className="text-xs text-slate-300 block font-medium">
                      {CONDENSED_CABIN_LABEL_MAP[flight.cabinClass] || 'Economy'}
                    </span>
                    <span className="text-[11px] text-gunmetal-muted block">
                      {flight.fareTier}
                    </span>
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
                      const { effectiveTarget } = computeAlertTargets(
                        flight.currentPrice,
                        effDollar,
                        effPercent
                      );
                      if (effectiveTarget === null) return null;

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
                              : `Alerts at ≤ ${formatCurrency(effectiveTarget)}`
                          }
                        >
                          {flight.disableNotifications === 1 ? (
                            <BellOff className="w-3 h-3 text-gunmetal-muted" />
                          ) : (
                            <Bell className="w-3 h-3 text-sky-400" />
                          )}
                          <span>≤ {formatCurrency(effectiveTarget)}</span>
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

                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        title={flight.status === 'Past' ? 'Checks disabled for past flights' : 'Check Price Now'}
                        onClick={() => checkNow(flight.id)}
                        disabled={flight.status !== 'Upcoming'}
                        className="p-1.5 text-sky-400 hover:text-sky-300 hover:bg-sky-950/30 rounded disabled:opacity-25 disabled:pointer-events-none transition-colors"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>
                      <button
                        title="Price History & Graph"
                        onClick={() => onShowHistory(flight)}
                        className="p-1.5 text-slate-300 hover:text-white hover:bg-gunmetal-canvas rounded transition-colors"
                      >
                        <Clock className="w-3.5 h-3.5" />
                      </button>
                      <a
                        href={googleFlightsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Search on Google Flights"
                        className="p-1.5 text-slate-300 hover:text-sky-400 hover:bg-gunmetal-canvas rounded transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                      <button
                        title="Edit Flight"
                        onClick={() => onEdit(flight)}
                        className="p-1.5 text-slate-300 hover:text-white hover:bg-gunmetal-canvas rounded transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        title={flight.status === 'Past' ? 'Past flight' : flight.status === 'Upcoming' ? 'Pause' : 'Resume'}
                        onClick={() => toggleStatus(flight)}
                        disabled={flight.status === 'Past'}
                        className="p-1.5 text-amber-400 hover:text-amber-300 hover:bg-amber-950/30 rounded disabled:opacity-25 disabled:pointer-events-none transition-colors"
                      >
                        {flight.status === 'Upcoming' ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        title="Delete"
                        onClick={() => deleteFlight(flight.id)}
                        className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-950/30 rounded transition-colors"
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