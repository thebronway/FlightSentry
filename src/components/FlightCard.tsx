'use client';
import { Flight } from '@/types';
import { RefreshCw, Clock, Pause, Play, Trash2 } from 'lucide-react';
import { formatCurrency } from '@/utils/format';

interface Props {
  flight: Flight;
  onRefresh: () => void;
  onShowHistory: () => void;
}

export default function FlightCard({ flight, onRefresh, onShowHistory }: Props) {
  const isDrop = flight.currentPrice < flight.baselinePrice;
  const delta = flight.baselinePrice - flight.currentPrice;

  const toggleStatus = async () => {
    const newStatus = flight.status === 'Active' ? 'Paused' : 'Active';
    await fetch(`/api/flights/${flight.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    });
    onRefresh();
  };

  const deleteFlight = async () => {
    if (!confirm('Are you sure you want to delete this flight?')) return;
    await fetch(`/api/flights/${flight.id}`, { method: 'DELETE' });
    onRefresh();
  };

  const checkNow = async () => {
    const res = await fetch(`/api/flights/${flight.id}/check`, { method: 'POST' });
    if (res.ok) onRefresh();
    else alert('Check failed. Ensure API quota is not exceeded.');
  };

  return (
    <div className={`bg-gunmetal-card rounded-lg shadow-sm border ${flight.status === 'Expired' ? 'border-red-900/50 opacity-75' : 'border-gunmetal-border'} p-5 flex flex-col`}>
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-xl font-bold text-slate-200 tracking-tight">
            {flight.origin} ➔ {flight.destination}
          </h3>
          <p className="text-sm text-gunmetal-muted">{flight.airline} {flight.flightNumber} • {flight.departureDate}</p>
        </div>
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
          flight.status === 'Active' ? 'bg-green-900/30 text-green-400' :
          flight.status === 'Paused' ? 'bg-amber-900/30 text-amber-400' : 'bg-red-900/30 text-red-400'
        }`}>
          {flight.status}
        </span>
      </div>
      <div className="flex items-center gap-2 mb-4">
        <span className="bg-gunmetal-canvas text-gunmetal-muted border border-gunmetal-border px-2 py-1 rounded text-xs font-semibold">{flight.fareTier}</span>
        {flight.pnr && <span className="bg-gunmetal-canvas text-slate-300 border border-gunmetal-border px-2 py-1 rounded text-xs font-semibold">PNR: {flight.pnr}</span>}
      </div>
      <div className="flex justify-between items-end mb-6">
        <div>
          <p className="text-xs text-gunmetal-muted uppercase tracking-wide">Current Price</p>
          <p className="text-3xl font-black text-slate-200">{formatCurrency(flight.currentPrice)}</p>
        </div>
        {delta !== 0 && (
          <div className={`text-sm font-bold flex items-center ${isDrop ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
            {isDrop ? '↓' : '↑'} {formatCurrency(Math.abs(delta))}
          </div>
        )}
      </div>

      <div className="mt-auto grid grid-cols-4 gap-2 pt-4 border-t border-gunmetal-border">
        <button onClick={checkNow} disabled={flight.status !== 'Active'} className="col-span-1 flex justify-center items-center p-2 text-sky-400 hover:text-sky-300 hover:bg-sky-950/30 rounded-md disabled:opacity-50 transition-colors">
          <RefreshCw className="w-4 h-4" />
        </button>
        <button onClick={onShowHistory} className="col-span-1 flex justify-center items-center p-2 text-gray-600 dark:text-gunmetal-muted hover:bg-gray-100 dark:hover:bg-gunmetal-canvas rounded-md">
          <Clock className="w-4 h-4" />
        </button>
        <button onClick={toggleStatus} disabled={flight.status === 'Expired'} className="col-span-1 flex justify-center items-center p-2 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/30 rounded-md disabled:opacity-50">
          {flight.status === 'Active' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        </button>
        <button onClick={deleteFlight} className="col-span-1 flex justify-center items-center p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-md">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}