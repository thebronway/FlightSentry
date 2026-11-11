'use client';

import AirlineTagInput from '../common/AirlineTagInput';
import RouteCorridorCoLocationSection from './RouteCorridorCoLocationSection';

interface Props {
  origin: string;
  destination: string;
  airline?: string;
  flightNumber?: string;
  includedAirlines: string;
  excludedAirlines: string;
  monitorRouteAlternatives: boolean;
  physicalOrigin?: string | null;
  physicalDestination?: string | null;
  onIncludedAirlinesChange: (val: string) => void;
  onExcludedAirlinesChange: (val: string) => void;
  onToggleRouteAlternatives: (enabled: boolean) => void;
  onScopeChange: (updates: { origin?: string; destination?: string }) => void;
}

export default function DualRouteSection({
  origin,
  destination,
  airline,
  flightNumber,
  includedAirlines,
  excludedAirlines,
  monitorRouteAlternatives,
  physicalOrigin,
  physicalDestination,
  onIncludedAirlinesChange,
  onExcludedAirlinesChange,
  onToggleRouteAlternatives,
  onScopeChange,
}: Props) {
  return (
    <div className="bg-gunmetal-canvas/60 border border-gunmetal-border rounded-xl p-4 sm:p-5 space-y-3">
      <label className="flex items-center justify-between cursor-pointer select-none">
        <div className="space-y-0.5">
          <span className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            <span>Also Monitor Route Alternatives</span>
            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-sky-950/60 text-sky-400 border border-sky-800/40 uppercase">
              Dual Tracking
            </span>
          </span>
          <span className="block text-xs text-gunmetal-muted">
            Concurrently check alternative flights on {origin || 'Origin'} → {destination || 'Destination'} while tracking {airline || 'Flight'} #{flightNumber || ''}.
          </span>
        </div>
        <input
          type="checkbox"
          checked={monitorRouteAlternatives}
          onChange={e => onToggleRouteAlternatives(e.target.checked)}
          className="w-4 h-4 accent-slate-500 rounded ml-4 flex-shrink-0 cursor-pointer"
        />
      </label>

      {monitorRouteAlternatives && (
        <div className="pt-3 border-t border-gunmetal-border/70 space-y-4 animate-in fade-in duration-150">
          <RouteCorridorCoLocationSection
            origin={origin}
            destination={destination}
            physicalOrigin={physicalOrigin}
            physicalDestination={physicalDestination}
            onScopeChange={onScopeChange}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Route Airline Inclusions (Optional)
              </label>
              <AirlineTagInput
                value={includedAirlines}
                onChange={onIncludedAirlinesChange}
                placeholder="e.g. DL, AA (type & press space or comma)"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Route Airline Exclusions (Optional)
              </label>
              <AirlineTagInput
                value={excludedAirlines}
                onChange={onExcludedAirlinesChange}
                placeholder="e.g. NK, F9 (type & press space or comma)"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}