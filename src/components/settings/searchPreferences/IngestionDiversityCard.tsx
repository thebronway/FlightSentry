'use client';

import { Layers } from 'lucide-react';
import SettingsCard from '../shared/SettingsCard';

const ITINERARY_PRESETS = [6, 8, 10, 12, 16, 20, 24];

interface Props {
  maxStoredItineraries: number;
  carrierDiversityEnabled: boolean;
  onMaxStoredDraftChange: (val: number) => void;
  onMaxStoredCommit: (val: number) => Promise<void>;
  onCarrierDiversityToggle: (checked: boolean) => Promise<void>;
}

export default function IngestionDiversityCard({
  maxStoredItineraries,
  carrierDiversityEnabled,
  onMaxStoredDraftChange,
  onMaxStoredCommit,
  onCarrierDiversityToggle,
}: Props) {
  const currentPresetIndex = (() => {
    const exact = ITINERARY_PRESETS.indexOf(maxStoredItineraries);
    if (exact !== -1) return exact;
    return ITINERARY_PRESETS.reduce((closestIdx, val, idx) => {
      return Math.abs(val - maxStoredItineraries) < Math.abs(ITINERARY_PRESETS[closestIdx] - maxStoredItineraries)
        ? idx
        : closestIdx;
    }, 3);
  })();

  return (
    <SettingsCard className="space-y-4">
      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
        <Layers className="w-3.5 h-3.5 text-slate-400" />
        <span>Multi-Fare Ingestion & Carrier Diversity Engine</span>
      </h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <div className="flex justify-between items-center mb-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
              Max Stored Itineraries Per Check
            </label>
            <span className="font-mono text-xs font-bold text-sky-400 px-2 py-0.5 rounded bg-sky-950/40 border border-sky-800/40">
              {maxStoredItineraries} itineraries
            </span>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min="0"
              max={ITINERARY_PRESETS.length - 1}
              step="1"
              value={currentPresetIndex}
              onChange={e => {
                const chosen = ITINERARY_PRESETS[Number(e.target.value)] ?? 12;
                onMaxStoredDraftChange(chosen);
              }}
              onMouseUp={e => {
                const chosen = ITINERARY_PRESETS[Number((e.target as HTMLInputElement).value)] ?? 12;
                onMaxStoredCommit(chosen);
              }}
              onTouchEnd={e => {
                const chosen = ITINERARY_PRESETS[Number((e.target as HTMLInputElement).value)] ?? 12;
                onMaxStoredCommit(chosen);
              }}
              className="w-full h-7 accent-sky-500 cursor-pointer"
            />
          </div>
          <div className="flex justify-between text-[10px] text-gunmetal-muted font-mono mt-1">
            <span>6 (Compact)</span>
            <span>12 (Default)</span>
            <span>24 (Maximum)</span>
          </div>
          <p className="text-[11px] text-gunmetal-muted mt-1">
            Number of competitor itineraries saved per price check in history metadata (configurable 6–24).
          </p>
        </div>

        <div className="flex flex-col justify-between">
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
            Carrier Diversity Algorithm
          </label>
          <label className="min-h-[44px] p-3 rounded-md bg-gunmetal-canvas border border-gunmetal-border flex items-center justify-between gap-3 cursor-pointer select-none">
            <div>
              <span className="text-xs font-semibold text-slate-200 block">
                Guarantee Operating Airline Representation
              </span>
              <span className="text-[11px] text-gunmetal-muted block mt-0.5">
                Guarantees at least 1 lowest fare from every operating airline before filling remaining capacity with the cheapest flights.
              </span>
            </div>
            <input
              type="checkbox"
              checked={carrierDiversityEnabled}
              onChange={e => onCarrierDiversityToggle(e.target.checked)}
              className="w-5 h-5 sm:w-4 sm:h-4 accent-slate-500 rounded cursor-pointer flex-shrink-0"
            />
          </label>
        </div>
      </div>
    </SettingsCard>
  );
}