'use client';

import { Clock, Moon, ChevronDown, Timer } from 'lucide-react';

interface Props {
  earliestDeparture: string;
  latestDeparture: string;
  noRedeye: boolean;
  maxStops: number | null;
  maxLayoverMinutes?: number | null;
  excludedConnectingAirports?: string;
  maxTotalDurationMinutes?: number | null;
  onEarliestChange: (val: string) => void;
  onLatestChange: (val: string) => void;
  onNoRedeyeChange: (val: boolean) => void;
  onMaxStopsChange: (val: number | null) => void;
  onMaxLayoverChange?: (val: number | null) => void;
  onExcludedConnectingAirportsChange?: (val: string) => void;
  onMaxTotalDurationChange?: (val: number | null) => void;
}

export default function SearchPreferencesSection({
  earliestDeparture,
  latestDeparture,
  noRedeye,
  maxStops,
  maxLayoverMinutes,
  excludedConnectingAirports = '',
  maxTotalDurationMinutes,
  onEarliestChange,
  onLatestChange,
  onNoRedeyeChange,
  onMaxStopsChange,
  onMaxLayoverChange,
  onExcludedConnectingAirportsChange,
  onMaxTotalDurationChange,
}: Props) {
  const hasActiveFilters = Boolean(
    earliestDeparture ||
    latestDeparture ||
    noRedeye ||
    (maxStops !== null && maxStops !== undefined) ||
    (maxLayoverMinutes !== null && maxLayoverMinutes !== undefined) ||
    excludedConnectingAirports ||
    (maxTotalDurationMinutes !== null && maxTotalDurationMinutes !== undefined)
  );

  const clearFilters = () => {
    onEarliestChange('');
    onLatestChange('');
    onNoRedeyeChange(false);
    onMaxStopsChange(null);
    onMaxLayoverChange?.(null);
    onExcludedConnectingAirportsChange?.('');
    onMaxTotalDurationChange?.(null);
  };

  return (
    <div className="bg-gunmetal-canvas/60 border border-gunmetal-border rounded-xl p-4 sm:p-5 space-y-4">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          <span>Flight Search Preferences (Optional)</span>
        </label>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="text-[11px] text-sky-400 hover:text-sky-300 transition-colors cursor-pointer"
          >
            Clear Preferences
          </button>
        )}
      </div>

      <p className="text-[11px] text-gunmetal-muted">
        Narrow monitored itineraries by number of stops, departure time window, layovers, or trip duration.
      </p>

      {/* Row 1: Stops & Departure Time Windows */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1.5">
            Flight Stops
          </label>
          <div className="relative">
            <select
              value={maxStops !== null && maxStops !== undefined ? String(maxStops) : ''}
              onChange={e => onMaxStopsChange(e.target.value === '' ? null : parseInt(e.target.value, 10))}
              className="w-full h-10 appearance-none border border-gunmetal-border px-3 py-2 pr-10 rounded-md bg-gunmetal-canvas text-slate-200 focus:outline-none focus:border-slate-500 text-sm cursor-pointer"
            >
              <option value="">Any</option>
              <option value="0">Nonstop</option>
              <option value="1">1 stop or fewer</option>
              <option value="2">2+ stops or fewer</option>
            </select>
            <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gunmetal-muted pointer-events-none" />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1.5">
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
          <label className="block text-xs font-medium text-slate-300 mb-1.5">
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

      {/* Row 2: Layover Duration & Total Trip Duration */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-gunmetal-border/70">
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center gap-1.5">
            <Timer className="w-3.5 h-3.5 text-slate-400" />
            <span>Max Layover Duration</span>
          </label>
          <div className="relative">
            <select
              value={maxLayoverMinutes !== null && maxLayoverMinutes !== undefined ? String(maxLayoverMinutes) : ''}
              onChange={e => onMaxLayoverChange?.(e.target.value === '' ? null : parseInt(e.target.value, 10))}
              className="w-full h-10 appearance-none border border-gunmetal-border px-3 py-2 pr-10 rounded-md bg-gunmetal-canvas text-slate-200 focus:outline-none focus:border-slate-500 text-sm cursor-pointer"
            >
              <option value="">Any (No Layover Limit)</option>
              <option value="90">1.5 Hours (90 mins)</option>
              <option value="120">2 Hours (120 mins)</option>
              <option value="180">3 Hours (180 mins)</option>
              <option value="240">4 Hours (240 mins)</option>
              <option value="300">5 Hours (300 mins)</option>
              <option value="360">6 Hours (360 mins)</option>
              <option value="480">8 Hours (480 mins)</option>
            </select>
            <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gunmetal-muted pointer-events-none" />
          </div>
          <span className="text-[11px] text-gunmetal-muted block mt-1">
            Discards itineraries with connection layovers longer than this limit.
          </span>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>Max Total Trip Duration</span>
          </label>
          <div className="relative">
            <select
              value={maxTotalDurationMinutes !== null && maxTotalDurationMinutes !== undefined ? String(maxTotalDurationMinutes) : ''}
              onChange={e => onMaxTotalDurationChange?.(e.target.value === '' ? null : parseInt(e.target.value, 10))}
              className="w-full h-10 appearance-none border border-gunmetal-border px-3 py-2 pr-10 rounded-md bg-gunmetal-canvas text-slate-200 focus:outline-none focus:border-slate-500 text-sm cursor-pointer"
            >
              <option value="">Any (No Trip Duration Limit)</option>
              <option value="240">4 Hours (240 mins)</option>
              <option value="360">6 Hours (360 mins)</option>
              <option value="480">8 Hours (480 mins)</option>
              <option value="600">10 Hours (600 mins)</option>
              <option value="720">12 Hours (720 mins)</option>
              <option value="960">16 Hours (960 mins)</option>
              <option value="1200">20 Hours (1200 mins)</option>
              <option value="1440">24 Hours (1440 mins)</option>
            </select>
            <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gunmetal-muted pointer-events-none" />
          </div>
          <span className="text-[11px] text-gunmetal-muted block mt-1">
            Maximum total travel time including all flight legs and connections.
          </span>
        </div>
      </div>

      {/* Row 3: Excluded Connecting Hubs */}
      <div className="pt-2 border-t border-gunmetal-border/70">
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
          Exclude Connecting Airports (Optional)
        </label>
        <input
          type="text"
          placeholder="e.g. ORD, DEN, MIA (comma-separated IATA codes)"
          value={excludedConnectingAirports}
          onChange={e => onExcludedConnectingAirportsChange?.(e.target.value.toUpperCase())}
          className="w-full h-10 border border-gunmetal-border px-3 py-2 rounded-md bg-gunmetal-canvas text-slate-200 placeholder-zinc-500 focus:outline-none focus:border-slate-500 text-sm font-mono uppercase"
        />
        <span className="text-[11px] text-gunmetal-muted block mt-1">
          Flights connecting through any of these intermediate airport hubs will be excluded.
        </span>
      </div>

      {/* Row 4: Redeye Checkbox */}
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