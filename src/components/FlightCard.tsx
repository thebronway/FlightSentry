'use client';

import { Flight } from '@/types';
import { RefreshCw, Clock, Pause, Play, Trash2, Pencil, ExternalLink } from 'lucide-react';
import { formatCurrency } from '@/utils/format';
import { useFlightActions, CABIN_LABEL_MAP } from '@/hooks/useFlightActions';
import { getGoogleFlightsUrl } from '@/utils/airline';
import RouteCorridorSummary from './RouteCorridorSummary';

interface Props {
  flight: Flight;
  onRefresh: () => void;
  onShowHistory: () => void;
  onEdit: (flight: Flight) => void;
}

export default function FlightCard({ flight, onRefresh, onShowHistory, onEdit }: Props) {
  const { toggleStatus, deleteFlight, checkNow } = useFlightActions(onRefresh);

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

  let secondaryDetail = '';
  if (isFlightNumMode) {
    secondaryDetail = `${flight.origin} → ${flight.destination}`;
  } else if (flight.airline) {
    secondaryDetail = flight.airline;
  } else if (flight.includedAirlines) {
    secondaryDetail = `Airlines: ${flight.includedAirlines}`;
  } else {
    secondaryDetail = 'All Airlines';
  }

  if (!isFlightNumMode && flight.excludedAirlines) {
    secondaryDetail += ` (Excl: ${flight.excludedAirlines})`;
  }

  const isPast = flight.status === 'Past';
  const googleFlightsUrl = getGoogleFlightsUrl(flight);

  return (
    <div className={`bg-gunmetal-card rounded-lg shadow-sm border ${isPast ? 'border-slate-800/80 bg-gunmetal-card/60 opacity-70' : 'border-gunmetal-border hover:border-slate-600'} p-5 flex flex-col justify-between transition-all group/card`}>
      {/* Top 2/3 Clickable Region -> Directly Opens History Modal */}
      <div
        onClick={onShowHistory}
        className="cursor-pointer select-none"
        title="Click to view flight price history, trend graph & carrier matrix"
      >
        <div className="flex justify-between items-start mb-2">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-2xl font-black text-slate-100 tracking-tight font-sans group-hover/card:text-white transition-colors">
                {primaryHeadline}
              </h3>
              <Clock className="w-3.5 h-3.5 text-gunmetal-muted opacity-0 group-hover/card:opacity-75 transition-opacity" />
            </div>
            <p className="text-sm font-medium text-slate-300 mt-0.5">
              {flight.departureDate} <span className="text-gunmetal-muted font-normal">• {secondaryDetail}</span>
            </p>
          </div>
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
            flight.status === 'Upcoming'
              ? 'bg-green-900/30 text-green-400 border border-green-800/40'
              : flight.status === 'Paused'
              ? 'bg-amber-900/30 text-amber-400 border border-amber-800/40'
              : 'bg-slate-800/50 text-slate-400 border border-slate-700/50'
          }`}>
            {flight.status}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 my-3">
          <span className="bg-gunmetal-canvas text-slate-300 border border-gunmetal-border px-2 py-0.5 rounded text-xs font-medium">
            {CABIN_LABEL_MAP[flight.cabinClass] || 'Economy'}
          </span>
          <span className="bg-gunmetal-canvas text-gunmetal-muted border border-gunmetal-border px-2 py-0.5 rounded text-xs font-medium">
            {flight.fareTier}
          </span>
          {flight.pnr && (
            <span className="bg-gunmetal-canvas text-slate-300 border border-gunmetal-border px-2 py-0.5 rounded text-xs font-medium">
              PNR: {flight.pnr}
            </span>
          )}
        </div>

        <div className="flex justify-between items-end my-4">
          <div>
            <p className="text-[11px] text-gunmetal-muted uppercase tracking-wider font-semibold">Current Price</p>
            <p className="text-3xl font-black text-slate-100">{formatCurrency(flight.currentPrice)}</p>
          </div>
          <div className="text-right">
            <p className="text-[11px] text-gunmetal-muted uppercase tracking-wider font-semibold">{benchmarkLabel}: {formatCurrency(benchmarkPrice)}</p>
            {delta !== 0 && (
              <div className={`text-sm font-bold flex items-center justify-end ${isDrop ? 'text-green-400' : 'text-red-400'}`}>
                {isDrop ? '▼' : '▲'} {formatCurrency(Math.abs(delta))}
              </div>
            )}
          </div>
        </div>

        {/* Route Market Corridor Gauge on Card */}
        {!isFlightNumMode && flight.allTimeLow !== null && flight.allTimeLow !== undefined && flight.allTimeHigh !== null && flight.allTimeHigh !== undefined && (
          <RouteCorridorSummary
            compact
            metrics={{
              currentFloor: flight.currentPrice,
              allTimeLow: flight.allTimeLow,
              allTimeHigh: flight.allTimeHigh,
              spreadPercent: (flight.allTimeHigh - flight.allTimeLow) > 0
                ? Math.min(100, Math.max(0, Math.round(((flight.currentPrice - flight.allTimeLow) / (flight.allTimeHigh - flight.allTimeLow)) * 100)))
                : 50,
              totalChecks: 1,
              hasSpread: flight.allTimeHigh > flight.allTimeLow,
            }}
          />
        )}
      </div>

      {/* Bottom Action Bar (Clicks isolated from triggering history) */}
      <div
        onClick={e => e.stopPropagation()}
        className="mt-auto grid grid-cols-6 gap-1 pt-3 border-t border-gunmetal-border"
      >
        <button
          title={isPast ? "Checks disabled for past flights" : "Check Price Now"}
          onClick={(e) => { e.stopPropagation(); checkNow(flight.id); }}
          disabled={isPast || flight.status === 'Paused'}
          className="flex justify-center items-center p-2 text-sky-400 hover:text-sky-300 hover:bg-sky-950/30 rounded-md disabled:opacity-25 disabled:pointer-events-none transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
        <button
          title="Price History & Graph"
          onClick={(e) => { e.stopPropagation(); onShowHistory(); }}
          className="flex justify-center items-center p-2 text-slate-300 hover:text-white hover:bg-gunmetal-canvas rounded-md transition-colors"
        >
          <Clock className="w-4 h-4" />
        </button>
        <a
          href={googleFlightsUrl}
          target="_blank"
          rel="noopener noreferrer"
          title="Search this route on Google Flights"
          onClick={(e) => e.stopPropagation()}
          className="flex justify-center items-center p-2 text-slate-300 hover:text-sky-400 hover:bg-gunmetal-canvas rounded-md transition-colors"
        >
          <ExternalLink className="w-4 h-4" />
        </a>
        <button
          title="Edit Flight"
          onClick={(e) => { e.stopPropagation(); onEdit(flight); }}
          className="flex justify-center items-center p-2 text-slate-300 hover:text-white hover:bg-gunmetal-canvas rounded-md transition-colors"
        >
          <Pencil className="w-4 h-4" />
        </button>
        <button
          title={isPast ? "Past flight" : flight.status === 'Upcoming' ? 'Pause Monitoring' : 'Resume Monitoring'}
          onClick={(e) => { e.stopPropagation(); toggleStatus(flight); }}
          disabled={isPast}
          className="flex justify-center items-center p-2 text-amber-400 hover:text-amber-300 hover:bg-amber-950/30 rounded-md disabled:opacity-25 disabled:pointer-events-none transition-colors"
        >
          {flight.status === 'Upcoming' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        </button>
        <button
          title="Delete Flight"
          onClick={(e) => { e.stopPropagation(); deleteFlight(flight.id); }}
          className="flex justify-center items-center p-2 text-red-400 hover:text-red-300 hover:bg-red-950/30 rounded-md transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}