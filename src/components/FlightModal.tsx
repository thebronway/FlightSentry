'use client';

import { useState, useEffect } from 'react';
import { X, Search, PlaneTakeoff, Compass } from 'lucide-react';
import { FareTier, CabinClass, SearchMode, Flight } from '@/types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialFlight?: Flight | null;
}

const DEFAULT_STATE = {
  searchMode: 'Route' as SearchMode,
  origin: '',
  destination: '',
  departureDate: '',
  airline: '',
  flightNumber: '',
  includedAirlines: '',
  excludedAirlines: '',
  pnr: '',
  fareTier: 'Standard' as FareTier,
  cabinClass: 'economy' as CabinClass,
  baselinePrice: '',
  notes: '',
  overrideFarOut: '',
  overrideStandard: '',
  overrideFinalStretch: '',
  disableNotifications: false,
};

export default function FlightModal({ isOpen, onClose, onSuccess, initialFlight }: Props) {
  const [formData, setFormData] = useState(DEFAULT_STATE);
  const [loading, setLoading] = useState(false);
  const [lookingUpPrice, setLookingUpPrice] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Strict state reset on modal open/close to prevent metric or date carry-over
  useEffect(() => {
    if (isOpen) {
      if (initialFlight) {
        let farOut = '';
        let standard = '';
        let finalStretch = '';
        if (initialFlight.scheduleOverride) {
          try {
            const override = JSON.parse(initialFlight.scheduleOverride);
            farOut = override.farOut ? String(override.farOut) : '';
            standard = override.standard ? String(override.standard) : '';
            finalStretch = override.finalStretch ? String(override.finalStretch) : '';
          } catch (e) {
            console.error('Failed to parse scheduleOverride', e);
          }
        }
        setFormData({
          searchMode: initialFlight.searchMode || 'Route',
          origin: initialFlight.origin || '',
          destination: initialFlight.destination || '',
          departureDate: initialFlight.departureDate || '',
          airline: initialFlight.airline || '',
          flightNumber: initialFlight.flightNumber || '',
          includedAirlines: initialFlight.includedAirlines || '',
          excludedAirlines: initialFlight.excludedAirlines || '',
          pnr: initialFlight.pnr || '',
          fareTier: initialFlight.fareTier || 'Standard',
          cabinClass: initialFlight.cabinClass || 'economy',
          baselinePrice: initialFlight.baselinePrice ? String(initialFlight.baselinePrice) : '',
          notes: initialFlight.notes || '',
          overrideFarOut: farOut,
          overrideStandard: standard,
          overrideFinalStretch: finalStretch,
          disableNotifications: initialFlight.disableNotifications === 1,
        });
      } else {
        setFormData(DEFAULT_STATE);
      }
      setError(null);
    }
  }, [isOpen, initialFlight]);

  if (!isOpen) return null;

  const handleClose = () => {
    setFormData(DEFAULT_STATE);
    setError(null);
    onClose();
  };

  const handleLookupPrice = async () => {
    if (!formData.origin || !formData.destination || !formData.departureDate) {
      setError('Origin, Destination, and Departure Date are required to check price.');
      return;
    }
    setLookingUpPrice(true);
    setError(null);
    try {
      const res = await fetch('/api/flights/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          searchMode: formData.searchMode,
          origin: formData.origin.trim().toUpperCase(),
          destination: formData.destination.trim().toUpperCase(),
          departureDate: formData.departureDate,
          airline: formData.airline ? formData.airline.trim().toUpperCase() : '',
          flightNumber: formData.flightNumber ? formData.flightNumber.trim() : null,
          includedAirlines: formData.includedAirlines ? formData.includedAirlines.trim().toUpperCase() : null,
          excludedAirlines: formData.excludedAirlines ? formData.excludedAirlines.trim().toUpperCase() : null,
          fareTier: formData.fareTier,
          cabinClass: formData.cabinClass,
        }),
      });
      const data = await res.json();
      if (res.ok && data.price !== null) {
        setFormData(prev => ({ ...prev, baselinePrice: String(data.price) }));
      } else {
        setError(data.error || 'Live price search did not return a valid fare.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to lookup current price.');
    } finally {
      setLookingUpPrice(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const scheduleOverride = (formData.overrideFarOut || formData.overrideStandard || formData.overrideFinalStretch)
      ? JSON.stringify({
          farOut: formData.overrideFarOut ? parseInt(formData.overrideFarOut, 10) : undefined,
          standard: formData.overrideStandard ? parseInt(formData.overrideStandard, 10) : undefined,
          finalStretch: formData.overrideFinalStretch ? parseInt(formData.overrideFinalStretch, 10) : undefined,
        })
      : null;

    const payload = {
      searchMode: formData.searchMode,
      origin: formData.origin.trim().toUpperCase(),
      destination: formData.destination.trim().toUpperCase(),
      airline: formData.airline ? formData.airline.trim().toUpperCase() : '',
      flightNumber: formData.searchMode === 'FlightNumber' && formData.flightNumber ? formData.flightNumber.trim() : null,
      includedAirlines: formData.includedAirlines ? formData.includedAirlines.trim().toUpperCase() : null,
      excludedAirlines: formData.excludedAirlines ? formData.excludedAirlines.trim().toUpperCase() : null,
      departureDate: formData.departureDate,
      fareTier: formData.fareTier,
      cabinClass: formData.cabinClass,
      baselinePrice: formData.baselinePrice ? parseFloat(formData.baselinePrice) : null,
      pnr: formData.pnr ? formData.pnr.trim().toUpperCase() : null,
      notes: formData.notes ? formData.notes.trim() : null,
      disableNotifications: formData.disableNotifications ? 1 : 0,
      scheduleOverride,
    };

    try {
      const endpoint = initialFlight ? `/api/flights/${initialFlight.id}` : '/api/flights';
      const method = initialFlight ? 'PUT' : 'POST';

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error?.message || data.error || 'Failed to save flight');
      }

      setFormData(DEFAULT_STATE);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 transition-colors">
      <div className="bg-gunmetal-card rounded-lg shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto border border-gunmetal-border flex flex-col">
        <div className="px-6 py-4 border-b border-gunmetal-border flex justify-between items-center sticky top-0 bg-gunmetal-card z-10">
          <h2 className="text-xl font-bold text-slate-100">
            {initialFlight ? 'Edit Tracked Flight' : 'Track New Flight'}
          </h2>
          <button 
            type="button" 
            onClick={handleClose} 
            className="p-1.5 text-gunmetal-muted hover:text-slate-200 hover:bg-gunmetal-canvas rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="bg-red-950/40 border border-red-800 text-red-300 p-3 rounded-md text-sm font-medium">
              {error}
            </div>
          )}

          {/* Clickable Card Tiles for Search Mode */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setFormData({ ...formData, searchMode: 'Route' })}
              className={`flex items-center gap-3 p-3.5 rounded-lg border text-left transition-all ${
                formData.searchMode === 'Route'
                  ? 'border-slate-400 bg-slate-800/60 text-slate-100 shadow-sm'
                  : 'border-gunmetal-border bg-gunmetal-canvas/40 text-gunmetal-muted hover:text-slate-300 hover:border-slate-600'
              }`}
            >
              <PlaneTakeoff className="w-5 h-5 flex-shrink-0 text-slate-300" />
              <div>
                <p className="text-sm font-semibold text-slate-200">Route (To & From)</p>
                <p className="text-xs text-gunmetal-muted">Monitor entire route for lowest fare</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setFormData({ ...formData, searchMode: 'FlightNumber' })}
              className={`flex items-center gap-3 p-3.5 rounded-lg border text-left transition-all ${
                formData.searchMode === 'FlightNumber'
                  ? 'border-slate-400 bg-slate-800/60 text-slate-100 shadow-sm'
                  : 'border-gunmetal-border bg-gunmetal-canvas/40 text-gunmetal-muted hover:text-slate-300 hover:border-slate-600'
              }`}
            >
              <Compass className="w-5 h-5 flex-shrink-0 text-slate-300" />
              <div>
                <p className="text-sm font-semibold text-slate-200">Specific Flight Number</p>
                <p className="text-xs text-gunmetal-muted">Track a specific carrier & flight #</p>
              </div>
            </button>
          </div>

          {/* Origin and Destination */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Origin Airport (IATA)
              </label>
              <input
                required
                maxLength={3}
                placeholder="DCA"
                value={formData.origin}
                onChange={e => setFormData({ ...formData, origin: e.target.value.toUpperCase() })}
                className="w-full h-10 px-3 py-2 text-sm uppercase rounded-md bg-gunmetal-canvas text-slate-200 border border-gunmetal-border focus:border-slate-500 focus:outline-none placeholder-zinc-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Destination Airport (IATA)
              </label>
              <input
                required
                maxLength={3}
                placeholder="LAS"
                value={formData.destination}
                onChange={e => setFormData({ ...formData, destination: e.target.value.toUpperCase() })}
                className="w-full h-10 px-3 py-2 text-sm uppercase rounded-md bg-gunmetal-canvas text-slate-200 border border-gunmetal-border focus:border-slate-500 focus:outline-none placeholder-zinc-500"
              />
            </div>
          </div>

          {formData.searchMode === 'Route' ? (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Airline Inclusions (Optional)
                </label>
                <input
                  placeholder="DL, AA"
                  value={formData.includedAirlines}
                  onChange={e => setFormData({ ...formData, includedAirlines: e.target.value })}
                  className="w-full h-10 px-3 py-2 text-sm uppercase rounded-md bg-gunmetal-canvas text-slate-200 border border-gunmetal-border focus:border-slate-500 focus:outline-none placeholder-zinc-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Airline Exclusions (Optional)
                </label>
                <input
                  placeholder="NK, F9"
                  value={formData.excludedAirlines}
                  onChange={e => setFormData({ ...formData, excludedAirlines: e.target.value })}
                  className="w-full h-10 px-3 py-2 text-sm uppercase rounded-md bg-gunmetal-canvas text-slate-200 border border-gunmetal-border focus:border-slate-500 focus:outline-none placeholder-zinc-500"
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Carrier Code
                </label>
                <input
                  required={formData.searchMode === 'FlightNumber'}
                  placeholder="AA"
                  maxLength={3}
                  value={formData.airline}
                  onChange={e => setFormData({ ...formData, airline: e.target.value })}
                  className="w-full h-10 px-3 py-2 text-sm uppercase rounded-md bg-gunmetal-canvas text-slate-200 border border-gunmetal-border focus:border-slate-500 focus:outline-none placeholder-zinc-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Flight Number
                </label>
                <input
                  required={formData.searchMode === 'FlightNumber'}
                  pattern="\d+"
                  placeholder="2859"
                  value={formData.flightNumber}
                  onChange={e => setFormData({ ...formData, flightNumber: e.target.value })}
                  className="w-full h-10 px-3 py-2 text-sm rounded-md bg-gunmetal-canvas text-slate-200 border border-gunmetal-border focus:border-slate-500 focus:outline-none placeholder-zinc-500"
                />
              </div>
            </div>
          )}

          {/* Date, Fare Restriction, Cabin Class */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Departure Date
              </label>
              <input
                required
                type="date"
                value={formData.departureDate}
                onChange={e => setFormData({ ...formData, departureDate: e.target.value })}
                className="w-full h-10 px-3 py-2 text-sm rounded-md bg-gunmetal-canvas text-slate-200 border border-gunmetal-border focus:border-slate-500 focus:outline-none [color-scheme:dark]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Fare Restrictions
              </label>
              <select
                value={formData.fareTier}
                onChange={e => setFormData({ ...formData, fareTier: e.target.value as FareTier })}
                className="w-full h-10 px-3 py-2 text-sm rounded-md bg-gunmetal-canvas text-slate-200 border border-gunmetal-border focus:border-slate-500 focus:outline-none"
              >
                <option value="Standard">Standard Fare (Exclude Basic)</option>
                <option value="Basic Economy">Basic Economy (Restricted)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Cabin Class
              </label>
              <select
                value={formData.cabinClass}
                onChange={e => setFormData({ ...formData, cabinClass: e.target.value as CabinClass })}
                className="w-full h-10 px-3 py-2 text-sm rounded-md bg-gunmetal-canvas text-slate-200 border border-gunmetal-border focus:border-slate-500 focus:outline-none"
              >
                <option value="economy">Economy</option>
                <option value="premium_economy">Premium Economy</option>
                <option value="business">Business</option>
                <option value="first">First Class</option>
              </select>
            </div>
          </div>

          {/* Initial Price & PNR */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Initial Price ($)
                </label>
                <button
                  type="button"
                  onClick={handleLookupPrice}
                  disabled={lookingUpPrice}
                  className="text-xs text-sky-400 hover:text-sky-300 flex items-center gap-1 disabled:opacity-50 transition-colors font-medium"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>{lookingUpPrice ? 'Searching...' : 'Lookup Price Now'}</span>
                </button>
              </div>
              <input
                type="number"
                step="0.01"
                min="1"
                placeholder="Auto-detected on save if blank"
                value={formData.baselinePrice}
                onChange={e => setFormData({ ...formData, baselinePrice: e.target.value })}
                className="w-full h-10 px-3 py-2 text-sm rounded-md bg-gunmetal-canvas text-slate-200 border border-gunmetal-border focus:border-slate-500 focus:outline-none placeholder-zinc-500"
              />
              <p className="text-[11px] text-gunmetal-muted mt-1">
                Leave blank to auto-populate from a fresh search when saved.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                PNR / Booking Code (Optional)
              </label>
              <input
                maxLength={8}
                placeholder="ABCDEF"
                value={formData.pnr}
                onChange={e => setFormData({ ...formData, pnr: e.target.value })}
                className="w-full h-10 px-3 py-2 text-sm uppercase rounded-md bg-gunmetal-canvas text-slate-200 border border-gunmetal-border focus:border-slate-500 focus:outline-none placeholder-zinc-500"
              />
              <p className="text-[11px] text-gunmetal-muted mt-1">
                Useful if you already bought this ticket and are watching for refund drops.
              </p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Notes (Optional)
            </label>
            <textarea
              rows={2}
              value={formData.notes}
              onChange={e => setFormData({ ...formData, notes: e.target.value })}
              className="w-full p-2.5 text-sm rounded-md bg-gunmetal-canvas text-slate-200 border border-gunmetal-border focus:border-slate-500 focus:outline-none placeholder-zinc-500"
              placeholder="e.g. Wedding trip, checked bags included..."
            />
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.disableNotifications}
                onChange={e => setFormData({ ...formData, disableNotifications: e.target.checked })}
                className="w-4 h-4 accent-slate-500 rounded"
              />
              Mute alerts for this specific flight
            </label>
          </div>

          <div className="pt-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-gunmetal-border pb-1.5 mb-2.5">
              Schedule Cadence Overrides (Leave blank for global settings)
            </h3>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gunmetal-muted mb-1">Far Out (&gt;90d hrs)</label>
                <input
                  type="number"
                  placeholder="48"
                  value={formData.overrideFarOut}
                  onChange={e => setFormData({ ...formData, overrideFarOut: e.target.value })}
                  className="w-full h-10 px-3 py-2 text-sm rounded-md bg-gunmetal-canvas text-slate-200 border border-gunmetal-border focus:border-slate-500 focus:outline-none placeholder-zinc-600"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gunmetal-muted mb-1">Standard (14-90d hrs)</label>
                <input
                  type="number"
                  placeholder="24"
                  value={formData.overrideStandard}
                  onChange={e => setFormData({ ...formData, overrideStandard: e.target.value })}
                  className="w-full h-10 px-3 py-2 text-sm rounded-md bg-gunmetal-canvas text-slate-200 border border-gunmetal-border focus:border-slate-500 focus:outline-none placeholder-zinc-600"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gunmetal-muted mb-1">Final Stretch (&lt;14d hrs)</label>
                <input
                  type="number"
                  placeholder="12"
                  value={formData.overrideFinalStretch}
                  onChange={e => setFormData({ ...formData, overrideFinalStretch: e.target.value })}
                  className="w-full h-10 px-3 py-2 text-sm rounded-md bg-gunmetal-canvas text-slate-200 border border-gunmetal-border focus:border-slate-500 focus:outline-none placeholder-zinc-600"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-gunmetal-border flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-xs text-sky-400 flex items-center gap-1.5 font-medium">
              {loading && !formData.baselinePrice && (
                <span className="flex items-center gap-2 animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-sky-400"></span>
                  Querying data sources for live initial fare...
                </span>
              )}
            </div>

            <div className="flex justify-end gap-3 w-full sm:w-auto">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 text-sm font-medium text-slate-300 bg-gunmetal-canvas border border-gunmetal-border hover:bg-gunmetal-border rounded-md transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || lookingUpPrice}
                className="px-5 py-2 text-sm font-medium bg-gunmetal-border border border-slate-500 text-slate-100 hover:bg-slate-700 hover:border-slate-400 rounded-md disabled:opacity-50 shadow-sm transition-colors flex items-center gap-2"
              >
                {loading ? (
                  !formData.baselinePrice ? 'Querying Fares & Saving...' : 'Saving Flight...'
                ) : initialFlight ? (
                  'Update Flight'
                ) : (
                  'Track Flight'
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}