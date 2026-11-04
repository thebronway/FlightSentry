'use client';

import { Clock, Moon, Sparkles } from 'lucide-react';

interface Props {
  earliestDeparture: string;
  latestDeparture: string;
  noRedeye: boolean;
  maxStops: number | null;
  onEarliestChange: (val: string) => void;
  onLatestChange: (val: string) => void;
  onNoRedeyeChange: (val: boolean) => void;
  onMaxStopsChange: (val: number | null) => void;
}

export default function SearchPreferencesSection({
  earliestDeparture,
  latestDeparture,
  noRedeye,
  maxStops,
  onEarliestChange,
  onLatestChange,
  onNoRedeyeChange,
  onMaxStopsChange,
}: Props) {
  const hasActiveFilters = Boolean(
    earliestDeparture || latestDeparture || noRedeye || (maxStops !== null && maxStops !== undefined)
  );

  const clearFilters = () => {
    onEarliestChange('');
    onLatestChange('');
    onNoRedeyeChange(false);
    onMaxStopsChange(null);
  };

  return (
    <div className="bg-gunmetal-canvas/60 border border-gunmetal-border rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          <span>Flight Search Preferences (Optional)</span>
        </label>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="text-[11px] text-sky-400 hover:text-sky-300 transition-colors"
          >
            Clear Preferences
          </button>
        )}
      </div>

      <p className="text-[11px] text-gunmetal-muted">
        Narrow monitored itineraries by number of stops, departure window, or eliminate overnight flights.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">
            Flight Stops
          </label>
          <select
            value={maxStops !== null && maxStops !== undefined ? String(maxStops) : ''}
            onChange={e => onMaxStopsChange(e.target.value === '' ? null : parseInt(e.target.value, 10))}
            className="w-full h-10 px-3 py-2 text-sm rounded-md bg-gunmetal-canvas text-slate-200 border border-gunmetal-border focus:border-slate-500 focus:outline-none cursor-pointer"
          >
            <option value="">Any</option>
            <option value="0">Nonstop</option>
            <option value="1">1 stop or fewer</option>
            <option value="2">2+ stops or fewer</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">
            Depart After (Earliest)
          </label>
          <input
            type="time"
            step="900"
            value={earliestDeparture}
            onChange={e => onEarliestChange(e.target.value)}
            className="w-full h-10 px-3 py-2 text-sm rounded-md bg-gunmetal-canvas text-slate-200 border border-gunmetal-border focus:border-slate-500 focus:outline-none [color-scheme:dark]"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">
            Depart Before (Latest)
          </label>
          <input
            type="time"
            step="900"
            value={latestDeparture}
            onChange={e => onLatestChange(e.target.value)}
            className="w-full h-10 px-3 py-2 text-sm rounded-md bg-gunmetal-canvas text-slate-200 border border-gunmetal-border focus:border-slate-500 focus:outline-none [color-scheme:dark]"
          />
        </div>
      </div>

      <div className="pt-2 border-t border-gunmetal-border/70">
        <label className="flex items-start gap-2.5 text-xs text-slate-300 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={noRedeye}
            onChange={e => onNoRedeyeChange(e.target.checked)}
            className="w-4 h-4 mt-0.5 accent-slate-500 rounded"
          />
          <div>
            <span className="font-semibold text-slate-200 flex items-center gap-1.5">
              <Moon className="w-3.5 h-3.5 text-amber-400" />
              Exclude Redeye Flights
            </span>
            <span className="block text-[11px] text-gunmetal-muted mt-0.5">
              Filters out overnight flights departing between 9:00 PM and 5:00 AM.
            </span>
          </div>
        </label>
      </div>
    </div>
  );
}