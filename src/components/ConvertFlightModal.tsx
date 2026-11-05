'use client';

import { useState, useEffect } from 'react';
import { Flight } from '@/types';
import { X, ShoppingBag, Loader2, AlertCircle } from 'lucide-react';
import { formatCurrency, getCurrencySymbol } from '@/utils/format';

interface Props {
  isOpen: boolean;
  flight: Flight | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ConvertFlightModal({
  isOpen,
  flight,
  onClose,
  onSuccess,
}: Props) {
  const [purchasePrice, setPurchasePrice] = useState('');
  const [airline, setAirline] = useState('');
  const [flightNumber, setFlightNumber] = useState('');
  const [pnr, setPnr] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && flight) {
      setPurchasePrice(flight.currentPrice ? String(flight.currentPrice) : '');
      setAirline(flight.airline || '');
      setFlightNumber(flight.flightNumber || '');
      setPnr(flight.pnr || '');
      setError(null);
    }
  }, [isOpen, flight]);

  if (!isOpen || !flight) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const priceNum = parseFloat(purchasePrice);
    if (isNaN(priceNum) || priceNum <= 0) {
      setError('Please enter a valid purchase price.');
      setLoading(false);
      return;
    }

    if (!airline.trim()) {
      setError('Please enter the airline carrier code.');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`/api/flights/${flight.id}/convert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          purchasePrice: priceNum,
          airline: airline.trim().toUpperCase(),
          flightNumber: flightNumber.trim() || null,
          pnr: pnr.trim().toUpperCase() || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to convert flight to booked');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error converting flight');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="bg-gunmetal-card border border-gunmetal-border rounded-xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-gunmetal-border flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-950/60 border border-emerald-800/60 text-emerald-400">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-100">
                Mark Flight as Booked
              </h3>
              <p className="text-xs text-gunmetal-muted">
                {flight.origin} → {flight.destination} · {flight.departureDate}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-gunmetal-muted hover:text-slate-200 hover:bg-gunmetal-canvas rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="bg-red-950/40 border border-red-800/70 p-3 rounded-md text-xs text-red-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="bg-gunmetal-canvas/60 border border-gunmetal-border rounded-lg p-3.5 text-xs text-slate-300 space-y-1">
            <span className="font-semibold text-emerald-300 block">
              Transition to Rebooking Savings Monitoring
            </span>
            <p className="text-gunmetal-muted leading-relaxed">
              Converting records what you paid and locks tracking strictly to price drop alerts. If fares drop below your purchase price, FlightSentry will alert you to rebook and secure airline savings. All previous price history remains intact.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
              Purchase Price (Amount Paid) *
            </label>
            <div className="flex items-center gap-2">
              <span className="text-gunmetal-muted font-mono text-sm">{getCurrencySymbol()}</span>
              <input
                required
                type="number"
                step="0.01"
                min="1"
                placeholder={flight.currentPrice ? String(flight.currentPrice) : '349.00'}
                value={purchasePrice}
                onChange={e => setPurchasePrice(e.target.value)}
                className="w-full h-10 px-3 py-2 text-sm rounded-md bg-gunmetal-canvas text-slate-200 border border-gunmetal-border focus:border-slate-500 focus:outline-none placeholder-zinc-500 font-mono"
              />
            </div>
            <p className="text-[11px] text-gunmetal-muted mt-1">
              Fares dropping below this price will trigger drop alerts.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Booked Carrier *
              </label>
              <input
                required
                maxLength={3}
                placeholder="e.g. DL, AA, F9"
                value={airline}
                onChange={e => setAirline(e.target.value.toUpperCase())}
                className="w-full h-10 px-3 py-2 text-sm uppercase rounded-md bg-gunmetal-canvas text-slate-200 border border-gunmetal-border focus:border-slate-500 focus:outline-none placeholder-zinc-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Flight # (Optional)
              </label>
              <input
                pattern="\d*"
                placeholder="e.g. 523"
                value={flightNumber}
                onChange={e => setFlightNumber(e.target.value)}
                className="w-full h-10 px-3 py-2 text-sm rounded-md bg-gunmetal-canvas text-slate-200 border border-gunmetal-border focus:border-slate-500 focus:outline-none placeholder-zinc-500 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Confirmation Code / PNR (Optional)
            </label>
            <input
              maxLength={8}
              placeholder="e.g. K9XZ4B"
              value={pnr}
              onChange={e => setPnr(e.target.value.toUpperCase())}
              className="w-full h-10 px-3 py-2 text-sm uppercase rounded-md bg-gunmetal-canvas text-slate-200 border border-gunmetal-border focus:border-slate-500 focus:outline-none placeholder-zinc-500 font-mono"
            />
          </div>

          <div className="pt-3 border-t border-gunmetal-border flex items-center justify-end gap-2.5">
            <button
              type="button"
              disabled={loading}
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold bg-gunmetal-canvas hover:bg-gunmetal-border text-slate-300 border border-gunmetal-border rounded-md transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-xs font-semibold bg-emerald-950/70 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-700/70 rounded-md transition-colors flex items-center gap-1.5 disabled:opacity-50 shadow-sm"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Converting...</span>
                </>
              ) : (
                <>
                  <ShoppingBag className="w-3.5 h-3.5" />
                  <span>Confirm Booking</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}