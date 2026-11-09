'use client';

import { useState, useEffect, useMemo } from 'react';
import { Flight } from '@/types';
import { X, Calendar, RotateCcw, AlertCircle } from 'lucide-react';
import { getCurrencySymbol, isPointsCurrency, formatCurrency } from '@/utils/format';
import AirlineTagInput from '../common/AirlineTagInput';

interface Props {
  isOpen: boolean;
  flight: Flight | null;
  onClose: () => void;
  onSuccess: (updatedFlight?: Flight) => void;
}

export default function RebookFlightModal({
  isOpen,
  flight,
  onClose,
  onSuccess,
}: Props) {
  const [price, setPrice] = useState('');
  const [entryDate, setEntryDate] = useState('');
  const [airline, setAirline] = useState('');
  const [flightNumber, setFlightNumber] = useState('');
  const [pnr, setPnr] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isPoints = useMemo(() => {
    return isPointsCurrency(flight?.currency);
  }, [flight?.currency]);

  const getNowLocalDatetime = () => {
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    return new Date(now.getTime() - offset).toISOString().slice(0, 16);
  };

  useEffect(() => {
    if (isOpen && flight) {
      setEntryDate(getNowLocalDatetime());
      setAirline(flight.airline || '');
      setFlightNumber(flight.flightNumber || '');
      setPnr(flight.pnr || '');
      setNotes(flight.notes || '');
      setPrice('');
      setError(null);
    }
  }, [isOpen, flight]);

  if (!isOpen || !flight) return null;

  const currentPurchasePrice = flight.purchasePrice || flight.baselinePrice;
  const originalPurchasePrice = flight.originalPurchasePrice || currentPurchasePrice;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum <= 0) {
      setError('Please enter a valid purchase price or points cost.');
      setLoading(false);
      return;
    }

    if (!airline.trim()) {
      setError('Carrier code is required.');
      setLoading(false);
      return;
    }

    const selectedTime = new Date(entryDate).getTime();
    if (isNaN(selectedTime)) {
      setError('Please enter a valid date and time.');
      setLoading(false);
      return;
    }
    if (selectedTime > Date.now()) {
      const isSameDate = new Date(entryDate).toDateString() === new Date().toDateString();
      setError(
        isSameDate
          ? "For today's date, time cannot be in the future."
          : "Date and time cannot be in the future."
      );
      setLoading(false);
      return;
    }

    try {
      const payload = {
        price: priceNum,
        date: new Date(entryDate).toISOString(),
        airline: airline.trim().toUpperCase(),
        flightNumber: flightNumber.trim() || null,
        isRebook: true,
        pnr: pnr.trim().toUpperCase() || null,
        notes: notes.trim() || null,
      };

      const res = await fetch(`/api/history/${flight.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to record rebooked flight.');
      }

      const resData = await res.json();
      onSuccess(resData.flight);
      onClose();
    } catch (err: any) {
      setError(err.message || 'An error occurred recording the rebook.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 sm:p-6 transition-colors">
      <div className="bg-gunmetal-card border border-gunmetal-border rounded-xl shadow-2xl w-full max-w-4xl max-h-[92vh] overflow-y-auto flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gunmetal-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg border bg-emerald-950/60 border-emerald-800/60 text-emerald-400">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-slate-100">
                Log Rebooked Flight / Price Adjustment
              </h3>
              <p className="text-xs text-gunmetal-muted">
                {flight.origin} → {flight.destination} · {flight.departureDate}
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={loading}
            onClick={onClose}
            className="p-1.5 text-gunmetal-muted hover:text-slate-200 hover:bg-gunmetal-canvas rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="bg-red-950/40 border border-red-800/70 p-3.5 rounded-md text-xs text-red-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Milestone Explanation Callout */}
          <div className="bg-emerald-950/20 border border-emerald-900/40 rounded-lg p-4 space-y-2 text-xs text-emerald-300/90 leading-relaxed">
            <span className="font-bold text-emerald-200 block text-sm">
              Rebooking Milestone & Price Paid Adjustment
            </span>
            <p>
              Your initial purchase price ({formatCurrency(originalPurchasePrice, flight.currency)}) remains permanently locked in history for benchmark tracking. Logging a rebook updates what you paid, secures savings, and shifts future price drop alert thresholds to this new lower fare.
            </p>
            <div className="flex items-center gap-3 text-[11px] font-mono text-slate-300 pt-1">
              <span>Original Paid: <strong>{formatCurrency(originalPurchasePrice, flight.currency)}</strong></span>
              <span>•</span>
              <span>Active Prior Benchmark: <strong>{formatCurrency(currentPurchasePrice, flight.currency)}</strong></span>
            </div>
          </div>

          {/* New Price & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                New Purchase Price / Points Paid *
              </label>
              <div className="flex items-center gap-2">
                <span className="text-gunmetal-muted font-mono text-sm">
                  {isPoints ? 'pts' : getCurrencySymbol(flight.currency)}
                </span>
                <input
                  required
                  type="number"
                  step={isPoints ? "1" : "0.01"}
                  min="1"
                  placeholder={flight.currentPrice ? String(flight.currentPrice) : (isPoints ? '35000' : '249.00')}
                  value={price}
                  onChange={e => setPrice(e.target.value)}
                  className="w-full h-10 px-3 py-2 text-sm rounded-md bg-gunmetal-canvas text-slate-200 border border-gunmetal-border focus:border-slate-500 focus:outline-none placeholder-zinc-500 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Rebooked Date & Time
              </label>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gunmetal-muted flex-shrink-0" />
                <input
                  required
                  type="datetime-local"
                  max={getNowLocalDatetime()}
                  value={entryDate}
                  onChange={e => {
                    const val = e.target.value;
                    setEntryDate(val);
                    if (val && new Date(val).getTime() > Date.now()) {
                      const isSameDate = new Date(val).toDateString() === new Date().toDateString();
                      setError(
                        isSameDate
                          ? "For today's date, time cannot be in the future."
                          : "Date and time cannot be in the future."
                      );
                    } else if (error && error.includes('in the future')) {
                      setError(null);
                    }
                  }}
                  className="w-full h-10 px-3 py-2 text-xs rounded-md bg-gunmetal-canvas text-slate-200 border border-gunmetal-border focus:border-slate-500 focus:outline-none [color-scheme:dark] font-mono"
                />
              </div>
            </div>
          </div>

          {/* Carrier & Flight Number (Editable if changed during rebook) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Rebooked Carrier Code *
              </label>
              <AirlineTagInput
                value={airline}
                onChange={setAirline}
                maxTags={1}
                placeholder="e.g. DL, AA, or Delta"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Flight Number *
              </label>
              <input
                required
                pattern="\d*"
                placeholder="e.g. 523"
                value={flightNumber}
                onChange={e => setFlightNumber(e.target.value)}
                className="w-full h-10 px-3 py-2 text-sm rounded-md bg-gunmetal-canvas text-slate-200 border border-gunmetal-border focus:border-slate-500 focus:outline-none placeholder-zinc-500 font-mono"
              />
            </div>
          </div>

          {/* PNR Confirmation Code */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Updated Confirmation Code / PNR (Optional)
            </label>
            <input
              maxLength={10}
              placeholder="e.g. K9XZ4B"
              value={pnr}
              onChange={e => setPnr(e.target.value.toUpperCase())}
              className="w-full h-10 px-3 py-2 text-sm uppercase rounded-md bg-gunmetal-canvas text-slate-200 border border-gunmetal-border focus:border-slate-500 focus:outline-none placeholder-zinc-500 font-mono"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Rebooking Notes (Optional)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="e.g. Claimed $45 travel credit via airline app..."
              className="w-full p-2.5 text-sm rounded-md bg-gunmetal-canvas text-slate-200 border border-gunmetal-border focus:border-slate-500 focus:outline-none placeholder-zinc-500"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-gunmetal-border flex items-center justify-end gap-3">
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
              className="px-5 py-2 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50 bg-emerald-950/80 hover:bg-emerald-900 text-emerald-200 border border-emerald-700/80"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{loading ? 'Recording...' : 'Record Rebook'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}