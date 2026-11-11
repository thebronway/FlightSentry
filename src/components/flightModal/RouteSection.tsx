'use client';

import { getCoLocationInfo } from '@/utils/coLocations';
import AirlineTagInput from '../common/AirlineTagInput';
import RouteCorridorCoLocationSection from './RouteCorridorCoLocationSection';
import { TrackingOption } from './useFlightModalState';

interface Props {
  trackingType: TrackingOption;
  showRouteDetails: boolean;
  origin: string;
  destination: string;
  departureDate: string;
  minDepartureDate: string;
  includedAirlines: string;
  excludedAirlines: string;
  onOriginChange: (val: string) => void;
  onDestinationChange: (val: string) => void;
  onDepartureDateChange: (val: string) => void;
  onIncludedAirlinesChange: (val: string) => void;
  onExcludedAirlinesChange: (val: string) => void;
}

export default function RouteSection({
  trackingType,
  showRouteDetails,
  origin,
  destination,
  departureDate,
  minDepartureDate,
  includedAirlines,
  excludedAirlines,
  onOriginChange,
  onDestinationChange,
  onDepartureDateChange,
  onIncludedAirlinesChange,
  onExcludedAirlinesChange,
}: Props) {
  const isRouteWatch = trackingType === 'route_watch';

  if (!isRouteWatch && !showRouteDetails) {
    return null;
  }

  const originInfo = getCoLocationInfo(origin);
  const destInfo = getCoLocationInfo(destination);

  return (
    <div className="bg-gunmetal-canvas/60 border border-gunmetal-border rounded-xl p-4 sm:p-5 space-y-4">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
          Route & Airports
        </label>
        <span className="text-[11px] text-gunmetal-muted">
          {isRouteWatch ? 'Origin and destination airport codes' : 'Customized route parameters'}
        </span>
      </div>

      <div className={`grid ${isRouteWatch ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2'} gap-3`}>
        {/* Departure Date for Route Watch */}
        {isRouteWatch && (
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Departure Date *
            </label>
            <input
              required
              type="date"
              min={minDepartureDate}
              value={departureDate}
              onChange={e => onDepartureDateChange(e.target.value)}
              className="w-full h-10 px-3 py-2 text-sm rounded-md bg-gunmetal-canvas text-slate-200 border border-gunmetal-border focus:border-slate-500 focus:outline-none [color-scheme:dark]"
            />
          </div>
        )}

        {/* Origin */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
            Origin Airport (IATA) *
          </label>
          <input
            required
            maxLength={30}
            placeholder={isRouteWatch ? "e.g. DCA, WAS, or DFW, DAL" : "e.g. DCA"}
            value={origin}
            onChange={e => onOriginChange(e.target.value.toUpperCase())}
            className="w-full h-10 px-3 py-2 text-sm uppercase rounded-md bg-gunmetal-canvas text-slate-200 border border-gunmetal-border focus:border-slate-500 focus:outline-none placeholder-zinc-500 font-mono"
          />
          {originInfo && (
            <div className="flex flex-wrap items-center justify-between gap-1.5 mt-1 text-[11px]">
              <span className="text-gunmetal-muted font-sans">{originInfo.description}</span>
              {originInfo.suggestedCode && originInfo.suggestedActionLabel && (
                <button
                  type="button"
                  onClick={() => onOriginChange(originInfo.suggestedCode!)}
                  className="text-sky-400 hover:text-sky-300 font-semibold underline transition-colors"
                >
                  {originInfo.suggestedActionLabel} &rarr;
                </button>
              )}
            </div>
          )}
        </div>

        {/* Destination */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
            Destination Airport (IATA) *
          </label>
          <input
            required
            maxLength={30}
            placeholder={isRouteWatch ? "e.g. LAX, NYC, or MIA, FLL" : "e.g. LAX"}
            value={destination}
            onChange={e => onDestinationChange(e.target.value.toUpperCase())}
            className="w-full h-10 px-3 py-2 text-sm uppercase rounded-md bg-gunmetal-canvas text-slate-200 border border-gunmetal-border focus:border-slate-500 focus:outline-none placeholder-zinc-500 font-mono"
          />
          {destInfo && (
            <div className="flex flex-wrap items-center justify-between gap-1.5 mt-1 text-[11px]">
              <span className="text-gunmetal-muted font-sans">{destInfo.description}</span>
              {destInfo.suggestedCode && destInfo.suggestedActionLabel && (
                <button
                  type="button"
                  onClick={() => onDestinationChange(destInfo.suggestedCode!)}
                  className="text-sky-400 hover:text-sky-300 font-semibold underline transition-colors"
                >
                  {destInfo.suggestedActionLabel} &rarr;
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Airline Inclusions & Exclusions for Route Watching */}
      {isRouteWatch && (
        <div className="pt-2 border-t border-gunmetal-border/70 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Airline Inclusions (Optional)
            </label>
            <AirlineTagInput
              value={includedAirlines}
              onChange={onIncludedAirlinesChange}
              placeholder="e.g. DL, AA (type & press space or comma)"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Airline Exclusions (Optional)
            </label>
            <AirlineTagInput
              value={excludedAirlines}
              onChange={onExcludedAirlinesChange}
              placeholder="e.g. NK, F9 (type & press space or comma)"
            />
          </div>
        </div>
      )}

      </div>
  );
}