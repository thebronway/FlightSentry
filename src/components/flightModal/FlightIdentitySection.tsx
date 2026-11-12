'use client';

import { Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import AirlineTagInput from '../common/AirlineTagInput';

interface Props {
  airline: string;
  flightNumber: string;
  departureDate: string;
  minDepartureDate: string;
  showRouteDetails: boolean;
  routeLookupLoading: boolean;
  routeAlert: 'confirmed' | 'mismatch' | null;
  detectedRoute: { origin: string; destination: string; airlineName?: string } | null;
  currentOrigin: string;
  currentDestination: string;
  isBooked: boolean;
  onAirlineChange: (val: string) => void;
  onFlightNumberChange: (val: string) => void;
  onDepartureDateChange: (val: string) => void;
  onShowRouteDetailsChange: (val: boolean) => void;
  onAdoptRoute: () => void;
}

export default function FlightIdentitySection({
  airline,
  flightNumber,
  departureDate,
  minDepartureDate,
  showRouteDetails,
  routeLookupLoading,
  routeAlert,
  detectedRoute,
  currentOrigin,
  currentDestination,
  isBooked,
  onAirlineChange,
  onFlightNumberChange,
  onDepartureDateChange,
  onShowRouteDetailsChange,
  onAdoptRoute,
}: Props) {
  return (
    <div className="bg-gunmetal-canvas/60 border border-gunmetal-border rounded-xl p-4 sm:p-5 space-y-4">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
          Flight Details
        </label>
        {routeLookupLoading && (
          <span className="flex items-center gap-1.5 text-xs text-sky-400 font-medium">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>Detecting route...</span>
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Carrier Code */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
            Carrier Code *
          </label>
          <AirlineTagInput
            value={airline}
            onChange={onAirlineChange}
            maxTags={1}
            placeholder="e.g. DL, AS, or Delta"
          />
        </div>

        {/* Flight Number */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
            Flight Number *
          </label>
          <input
            required
            pattern="\d+"
            placeholder="e.g. 523"
            value={flightNumber}
            onChange={e => onFlightNumberChange(e.target.value)}
            className="w-full h-10 px-3 py-2 text-sm rounded-md bg-gunmetal-canvas text-slate-200 border border-gunmetal-border focus:border-slate-500 focus:outline-none placeholder-zinc-500 font-mono"
          />
        </div>

        {/* Departure Date */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
            Departure Date *
          </label>
          <div className="relative">
            <input
              required
              type="date"
              min={minDepartureDate}
              value={departureDate}
              onChange={e => onDepartureDateChange(e.target.value)}
              className="w-full h-10 px-3 py-2 text-sm rounded-md bg-gunmetal-canvas text-slate-200 border border-gunmetal-border focus:border-slate-500 focus:outline-none [color-scheme:dark]"
            />
          </div>
        </div>
      </div>

      {/* Auto-detected route notification banner */}
      {routeAlert === 'confirmed' && detectedRoute && (
        <div className="flex items-start gap-2.5 p-3 rounded-lg bg-green-950/30 border border-green-800/50 text-xs text-green-300 animate-in fade-in duration-150">
          <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-semibold text-green-200">Route Confirmed: </span>
            Operating <span className="font-bold underline text-white">{detectedRoute.origin} → {detectedRoute.destination}</span> for {airline} {flightNumber}
            {detectedRoute.airlineName ? ` (${detectedRoute.airlineName})` : ''}.
          </div>
        </div>
      )}

      {/* Route Mismatch notification banner */}
      {routeAlert === 'mismatch' && detectedRoute && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 rounded-lg bg-amber-950/30 border border-amber-800/50 text-xs text-amber-300 animate-in fade-in duration-150">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-amber-200">Route Mismatch: </span>
              {airline} {flightNumber} schedule operates{' '}
              <span className="font-bold underline text-white">{detectedRoute.origin} → {detectedRoute.destination}</span>, but you have{' '}
              <span className="font-bold text-slate-200">{currentOrigin || '___'} → {currentDestination || '___'}</span>.
            </div>
          </div>
          <button
            type="button"
            onClick={onAdoptRoute}
            className="flex-shrink-0 px-3 py-1.5 text-xs font-semibold bg-amber-900/50 hover:bg-amber-800/60 text-amber-100 border border-amber-700/60 rounded-md transition-colors cursor-pointer self-end sm:self-center"
          >
            Use {detectedRoute.origin} → {detectedRoute.destination}
          </button>
        </div>
      )}

      {/* Checkbox to specify route details manually */}
      <div className="pt-2 border-t border-gunmetal-border/70 flex items-center justify-between">
        <label className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={showRouteDetails}
            onChange={e => onShowRouteDetailsChange(e.target.checked)}
            className="w-4 h-4 accent-slate-500 rounded cursor-pointer"
          />
          <span className="font-medium">
            Specify route details manually (origin &amp; destination airport)
          </span>
        </label>
      </div>
    </div>
  );
}