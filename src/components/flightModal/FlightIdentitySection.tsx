'use client';

import { Loader2, CheckCircle2, AlertTriangle, Search, GitBranch, ArrowRight } from 'lucide-react';
import AirlineTagInput from '../common/AirlineTagInput';
import type { DetectedRouteCandidate, RouteAlertState } from '@/hooks/useRouteLookup';

interface Props {
  airline: string;
  flightNumber: string;
  departureDate: string;
  minDepartureDate: string;
  showRouteDetails: boolean;
  routeLookupLoading: boolean;
  routeAlert: RouteAlertState;
  detectedRoute: DetectedRouteCandidate | null;
  detectedRoutes: DetectedRouteCandidate[];
  currentOrigin: string;
  currentDestination: string;
  isBooked: boolean;
  onAirlineChange: (val: string) => void;
  onFlightNumberChange: (val: string) => void;
  onDepartureDateChange: (val: string) => void;
  onShowRouteDetailsChange: (val: boolean) => void;
  onSelectRouteCandidate: (index: number) => void;
  onAdoptRoute: (index?: number) => void;
  onFieldBlurLookup: () => void;
  onManualLookup: () => void;
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
  detectedRoutes,
  currentOrigin,
  currentDestination,
  isBooked,
  onAirlineChange,
  onFlightNumberChange,
  onDepartureDateChange,
  onShowRouteDetailsChange,
  onSelectRouteCandidate,
  onAdoptRoute,
  onFieldBlurLookup,
  onManualLookup,
}: Props) {
  const canLookup = airline.trim().length >= 2 && flightNumber.trim().replace(/\D/g, '').length >= 1;

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
            onBlur={onFieldBlurLookup}
            maxTags={1}
            placeholder="e.g. DL, AS, or Delta"
          />
        </div>

        {/* Flight Number */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
            Flight Number *
          </label>
          <div className="relative">
            <input
              required
              pattern="\d+"
              placeholder="e.g. 523"
              value={flightNumber}
              onChange={e => onFlightNumberChange(e.target.value)}
              onBlur={onFieldBlurLookup}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  onManualLookup();
                }
              }}
              className="w-full h-10 pl-3 pr-10 py-2 text-sm rounded-md bg-gunmetal-canvas text-slate-200 border border-gunmetal-border focus:border-slate-500 focus:outline-none placeholder-zinc-500 font-mono"
            />
            <button
              type="button"
              disabled={!canLookup || routeLookupLoading}
              onClick={onManualLookup}
              title="Look up scheduled route now"
              aria-label="Look up scheduled route"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 h-7 w-7 flex items-center justify-center rounded bg-gunmetal-card hover:bg-gunmetal-border border border-gunmetal-border text-slate-300 hover:text-sky-300 transition-colors disabled:opacity-35 disabled:pointer-events-none cursor-pointer"
            >
              {routeLookupLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-400" />
              ) : (
                <Search className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
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

      {/* Multiple Routes Disambiguation Banner */}
      {routeAlert === 'multiple' && detectedRoutes.length > 1 && (
        <div className="p-3 rounded-lg bg-sky-950/35 border border-sky-700/60 text-xs text-sky-200 space-y-2.5 animate-in fade-in duration-150">
          <div className="flex items-start gap-2.5">
            <GitBranch className="w-4 h-4 text-sky-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-semibold text-sky-100 block">
                Multiple Routes Found for {airline.toUpperCase()} {flightNumber.replace(/\D/g, '')}
              </span>
              <span className="text-sky-200/85">
                This flight number operates multiple legs. Select your scheduled leg below:
              </span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 pl-6">
            {detectedRoutes.map((candidate, idx) => (
              <button
                key={`${candidate.origin}-${candidate.destination}`}
                type="button"
                onClick={() => onSelectRouteCandidate(idx)}
                className="min-h-[36px] inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-bold bg-sky-900/50 hover:bg-sky-800/75 text-sky-100 border border-sky-600/70 rounded-md transition-colors cursor-pointer shadow-sm"
              >
                <span>{candidate.origin}</span>
                <ArrowRight className="w-3.5 h-3.5 text-sky-300" />
                <span>{candidate.destination}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Auto-detected route notification banner */}
      {routeAlert === 'confirmed' && detectedRoute && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 rounded-lg bg-green-950/30 border border-green-800/50 text-xs text-green-300 animate-in fade-in duration-150">
          <div className="flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-semibold text-green-200">Route Confirmed: </span>
              Operating <span className="font-bold underline text-white">{detectedRoute.origin} → {detectedRoute.destination}</span> for {airline} {flightNumber}
              {detectedRoute.airlineName ? ` (${detectedRoute.airlineName})` : ''}.
            </div>
          </div>
          {detectedRoutes.length > 1 && (
            <div className="flex flex-wrap items-center gap-1.5 pl-6 sm:pl-0 flex-shrink-0">
              <span className="text-[11px] text-green-300/80">Other legs:</span>
              {detectedRoutes.map((candidate, idx) => {
                if (
                  candidate.origin === detectedRoute.origin &&
                  candidate.destination === detectedRoute.destination
                ) {
                  return null;
                }
                return (
                  <button
                    key={`${candidate.origin}-${candidate.destination}`}
                    type="button"
                    onClick={() => onSelectRouteCandidate(idx)}
                    className="px-2 py-1 text-[11px] font-mono font-semibold bg-green-900/40 hover:bg-green-800/60 text-green-100 border border-green-700/60 rounded transition-colors cursor-pointer"
                  >
                    {candidate.origin} → {candidate.destination}
                  </button>
                );
              })}
            </div>
          )}
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
              <span className="font-bold underline text-white">
                {detectedRoutes.length > 1
                  ? detectedRoutes.map(r => `${r.origin} → ${r.destination}`).join(' or ')
                  : `${detectedRoute.origin} → ${detectedRoute.destination}`}
              </span>
              , but you have{' '}
              <span className="font-bold text-slate-200">{currentOrigin || '___'} → {currentDestination || '___'}</span>.
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 self-end sm:self-center flex-shrink-0">
            {(detectedRoutes.length > 1 ? detectedRoutes : [detectedRoute]).map((candidate, idx) => (
              <button
                key={`${candidate.origin}-${candidate.destination}`}
                type="button"
                onClick={() => onAdoptRoute(idx)}
                className="px-3 py-1.5 text-xs font-semibold bg-amber-900/50 hover:bg-amber-800/60 text-amber-100 border border-amber-700/60 rounded-md transition-colors cursor-pointer"
              >
                Use {candidate.origin} → {candidate.destination}
              </button>
            ))}
          </div>
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