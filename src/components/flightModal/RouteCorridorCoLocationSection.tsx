'use client';

import { useMemo } from 'react';
import { Compass, Check } from 'lucide-react';
import { getCorridorScopeOptions } from '@/utils/coLocations';

interface Props {
  origin: string;
  destination: string;
  physicalOrigin?: string | null;
  physicalDestination?: string | null;
  onScopeChange: (updates: { origin?: string; destination?: string }) => void;
}

export default function RouteCorridorCoLocationSection({
  origin,
  destination,
  physicalOrigin,
  physicalDestination,
  onScopeChange,
}: Props) {
  const originOption = useMemo(
    () => getCorridorScopeOptions(origin, physicalOrigin),
    [origin, physicalOrigin]
  );

  const destOption = useMemo(
    () => getCorridorScopeOptions(destination, physicalDestination),
    [destination, physicalDestination]
  );

  if (!originOption && !destOption) {
    return null;
  }

  const activeOriginLabel = originOption
    ? originOption.isAreaActive
      ? originOption.areaLabel
      : originOption.exactCode
    : origin || 'Origin';

  const activeDestLabel = destOption
    ? destOption.isAreaActive
      ? destOption.areaLabel
      : destOption.exactCode
    : destination || 'Destination';

  return (
    <div className="bg-gunmetal-canvas/80 border border-gunmetal-border rounded-lg p-3.5 space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
          <Compass className="w-3.5 h-3.5 text-sky-400" />
          <span>Alternative Route Scope (Airport Co-Locations)</span>
        </label>
        <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-sky-950/60 text-sky-300 border border-sky-800/50">
          Corridor: {activeOriginLabel} → {activeDestLabel}
        </span>
      </div>

      <p className="text-[11px] text-gunmetal-muted">
        Select whether alternative flight monitoring is restricted to the specific flight&apos;s exact airport or expanded to metropolitan and regional sister airports.
      </p>

      <div className={`grid grid-cols-1 ${originOption && destOption ? 'md:grid-cols-2' : ''} gap-3 pt-1`}>
        {originOption && (
          <div className="space-y-1.5">
            <span className="text-xs font-medium text-slate-300 block">
              Origin Scope (Departure)
            </span>
            <div className="grid grid-cols-1 gap-1.5">
              <button
                type="button"
                onClick={() => onScopeChange({ origin: originOption.exactCode })}
                className={`p-2.5 rounded-md border text-left transition-all flex items-center justify-between ${
                  !originOption.isAreaActive
                    ? 'border-sky-500/80 bg-sky-950/40 text-slate-100 shadow-sm'
                    : 'border-gunmetal-border bg-gunmetal-canvas text-gunmetal-muted hover:text-slate-300 hover:border-slate-600'
                }`}
              >
                <div>
                  <span className="font-bold text-xs text-slate-200 block">
                    {originOption.exactCode} (Exact Airport Only)
                  </span>
                  <span className="text-[11px] text-gunmetal-muted block mt-0.5">
                    Only check alternative flights departing {originOption.exactCode}
                  </span>
                </div>
                {!originOption.isAreaActive && (
                  <Check className="w-4 h-4 text-sky-400 flex-shrink-0 ml-2" />
                )}
              </button>

              <button
                type="button"
                onClick={() => onScopeChange({ origin: originOption.areaCode })}
                className={`p-2.5 rounded-md border text-left transition-all flex items-center justify-between ${
                  originOption.isAreaActive
                    ? 'border-sky-500/80 bg-sky-950/40 text-slate-100 shadow-sm'
                    : 'border-gunmetal-border bg-gunmetal-canvas text-gunmetal-muted hover:text-slate-300 hover:border-slate-600'
                }`}
              >
                <div>
                  <span className="font-bold text-xs text-slate-200 block">
                    {originOption.areaLabel}
                  </span>
                  <span className="text-[11px] text-gunmetal-muted block mt-0.5">
                    {originOption.areaDescription}
                  </span>
                </div>
                {originOption.isAreaActive && (
                  <Check className="w-4 h-4 text-sky-400 flex-shrink-0 ml-2" />
                )}
              </button>
            </div>
          </div>
        )}

        {destOption && (
          <div className="space-y-1.5">
            <span className="text-xs font-medium text-slate-300 block">
              Destination Scope (Arrival)
            </span>
            <div className="grid grid-cols-1 gap-1.5">
              <button
                type="button"
                onClick={() => onScopeChange({ destination: destOption.exactCode })}
                className={`p-2.5 rounded-md border text-left transition-all flex items-center justify-between ${
                  !destOption.isAreaActive
                    ? 'border-sky-500/80 bg-sky-950/40 text-slate-100 shadow-sm'
                    : 'border-gunmetal-border bg-gunmetal-canvas text-gunmetal-muted hover:text-slate-300 hover:border-slate-600'
                }`}
              >
                <div>
                  <span className="font-bold text-xs text-slate-200 block">
                    {destOption.exactCode} (Exact Airport Only)
                  </span>
                  <span className="text-[11px] text-gunmetal-muted block mt-0.5">
                    Only check alternative flights arriving {destOption.exactCode}
                  </span>
                </div>
                {!destOption.isAreaActive && (
                  <Check className="w-4 h-4 text-sky-400 flex-shrink-0 ml-2" />
                )}
              </button>

              <button
                type="button"
                onClick={() => onScopeChange({ destination: destOption.areaCode })}
                className={`p-2.5 rounded-md border text-left transition-all flex items-center justify-between ${
                  destOption.isAreaActive
                    ? 'border-sky-500/80 bg-sky-950/40 text-slate-100 shadow-sm'
                    : 'border-gunmetal-border bg-gunmetal-canvas text-gunmetal-muted hover:text-slate-300 hover:border-slate-600'
                }`}
              >
                <div>
                  <span className="font-bold text-xs text-slate-200 block">
                    {destOption.areaLabel}
                  </span>
                  <span className="text-[11px] text-gunmetal-muted block mt-0.5">
                    {destOption.areaDescription}
                  </span>
                </div>
                {destOption.isAreaActive && (
                  <Check className="w-4 h-4 text-sky-400 flex-shrink-0 ml-2" />
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}