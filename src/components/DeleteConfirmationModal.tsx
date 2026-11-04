'use client';

import { useState, useEffect } from 'react';
import { Flight } from '@/types';
import { X, Trash2, AlertTriangle, Loader2 } from 'lucide-react';
import { formatCurrency } from '@/utils/format';

interface Props {
  isOpen: boolean;
  flight: Flight | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function DeleteConfirmationModal({
  isOpen,
  flight,
  onClose,
  onSuccess,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setError(null);
      setLoading(false);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !loading) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, loading, onClose]);

  if (!isOpen || !flight) return null;

  const isFlightNumMode = flight.searchMode === 'FlightNumber' && flight.flightNumber;
  const headline = isFlightNumMode
    ? `${flight.airline} ${flight.flightNumber}`
    : `${flight.origin} → ${flight.destination}`;

  const handleDelete = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/flights/${flight.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to delete flight');
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'An error occurred while deleting the flight.');
      setLoading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
    >
      <div className="bg-gunmetal-card border border-gunmetal-border rounded-xl shadow-2xl max-w-md w-full overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-gunmetal-border flex items-center justify-between">
          <div className="flex items-center gap-2.5 text-red-400">
            <div className="p-2 rounded-lg bg-red-950/60 border border-red-800/60">
              <Trash2 className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-100">Delete Tracked Flight</h3>
              <p className="text-xs text-gunmetal-muted">Confirm permanent deletion</p>
            </div>
          </div>
          <button
            type="button"
            disabled={loading}
            onClick={onClose}
            className="p-1.5 text-gunmetal-muted hover:text-slate-200 hover:bg-gunmetal-canvas rounded transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {error && (
            <div className="bg-red-950/40 border border-red-800/70 p-3 rounded-md text-xs text-red-300 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="bg-gunmetal-canvas/60 border border-gunmetal-border rounded-lg p-3.5 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-base font-bold text-slate-100 font-sans">{headline}</span>
              <span className="font-mono text-sm font-bold text-slate-200">
                {formatCurrency(flight.currentPrice)}
              </span>
            </div>
            <div className="text-xs text-gunmetal-muted flex items-center gap-2">
              <span>{flight.departureDate}</span>
              <span>•</span>
              <span className="capitalize">{flight.cabinClass.replace('_', ' ')}</span>
              {flight.pnr && (
                <>
                  <span>•</span>
                  <span>PNR: {flight.pnr}</span>
                </>
              )}
            </div>
          </div>

          <p className="text-xs text-gunmetal-muted leading-relaxed">
            Are you sure you want to stop tracking this flight? All recorded price history, competitor checks, and market corridor benchmarks for this flight will be permanently deleted.
          </p>

          <div className="pt-2 border-t border-gunmetal-border flex items-center justify-end gap-2.5">
            <button
              type="button"
              disabled={loading}
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold bg-gunmetal-canvas hover:bg-gunmetal-border text-slate-300 border border-gunmetal-border rounded-md transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={handleDelete}
              className="px-4 py-2 text-xs font-semibold bg-red-950/80 hover:bg-red-900 text-red-200 border border-red-700/80 rounded-md transition-colors flex items-center gap-1.5 disabled:opacity-50 shadow-sm"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Deleting...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Flight</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}