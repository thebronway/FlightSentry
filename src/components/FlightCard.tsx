'use client';

import { Flight } from '@/types';
import { RefreshCw, Clock, Pause, Play, Trash2, Pencil } from 'lucide-react';
import { formatCurrency } from '@/utils/format';
import RouteCorridorSummary from './RouteCorridorSummary';

interface Props {
  flight: Flight;
  onRefresh: () => void;
  onShowHistory: () => void;
  onEdit: (flight: Flight) => void;
}

export default function FlightCard({ flight, onRefresh, onShowHistory, onEdit }: Props) {
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

  const cabinLabelMap: Record<string, string> = {
    economy: 'Economy',
    premium_economy: 'Prem Econ',
    business: 'Business',
    first: 'First Class',
  };

  const toggleStatus = async () => {
    const newStatus = flight.status === 'Active' ? 'Paused' : 'Active';
    await fetch(`/api/flights/${flight.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
    onRefresh();
  };

  const deleteFlight = async () => {
    if (!confirm('Are you sure you want to delete this tracked flight?')) return;
    await fetch(`/api/flights/${flight.id}`, { method: 'DELETE' });
    onRefresh();
  };

  const checkNow = async () => {
    const res = await fetch(`/api/flights/${flight.id}/check`, { method: 'POST' });
    if (res.ok) onRefresh();
    else alert('Check failed. Ensure API quota is not exceeded.');
  };

  return (
    <div className={`bg-gunmetal-card rounded-lg shadow-sm border ${flight.status === 'Expired' ? 'border-red-900/50 opacity-75' : 'border-gunmetal-border'} p-5 flex flex-col justify-between transition-colors`}>
      <div>
        <div className="flex justify-between items-start mb-2">
          <div>
            <h3 className="text-2xl font-black text-slate-100 tracking-tight font-sans">
              {primaryHeadline}
            </h3>
            <p className="text-sm font-medium text-slate-300 mt-0.5">
              {flight.departureDate} <span className="text-gunmetal-muted font-normal">• {secondaryDetail}</span>
            </p>
          </div>
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
            flight.status === 'Active' ? 'bg-green-900/30 text-green-400 border border-green-800/40' :
            flight.status === 'Paused' ? 'bg-amber-900/30 text-amber-400 border border-amber-800/40' : 'bg-red-900/30 text-red-400 border border-red-800/40'
          }`}>
            {flight.status}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 my-3">
          <span className="bg-gunmetal-canvas text-slate-300 border border-gunmetal-border px-2 py-0.5 rounded text-xs font-medium">
            {cabinLabelMap[flight.cabinClass] || 'Economy'}
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

      <div className="mt-auto grid grid-cols-5 gap-1.5 pt-3 border-t border-gunmetal-border">
        <button
          title="Check Price Now"
          onClick={checkNow}
          disabled={flight.status !== 'Active'}
          className="flex justify-center items-center p-2 text-sky-400 hover:text-sky-300 hover:bg-sky-950/30 rounded-md disabled:opacity-40 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
        <button
          title="Price History & Graph"
          onClick={onShowHistory}
          className="flex justify-center items-center p-2 text-slate-300 hover:text-white hover:bg-gunmetal-canvas rounded-md transition-colors"
        >
          <Clock className="w-4 h-4" />
        </button>
        <button
          title="Edit Flight"
          onClick={() => onEdit(flight)}
          className="flex justify-center items-center p-2 text-slate-300 hover:text-white hover:bg-gunmetal-canvas rounded-md transition-colors"
        >
          <Pencil className="w-4 h-4" />
        </button>
        <button
          title={flight.status === 'Active' ? 'Pause Monitoring' : 'Resume Monitoring'}
          onClick={toggleStatus}
          disabled={flight.status === 'Expired'}
          className="flex justify-center items-center p-2 text-amber-400 hover:text-amber-300 hover:bg-amber-950/30 rounded-md disabled:opacity-40 transition-colors"
        >
          {flight.status === 'Active' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        </button>
        <button
          title="Delete Flight"
          onClick={deleteFlight}
          className="flex justify-center items-center p-2 text-red-400 hover:text-red-300 hover:bg-red-950/30 rounded-md transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}