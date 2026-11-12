'use client';

import { Timer } from 'lucide-react';
import SettingsCard from '../shared/SettingsCard';
import SettingsSelect from '../shared/SettingsSelect';

interface Props {
  maxLayoverMinutes: number | null | undefined;
  maxTotalDurationMinutes: number | null | undefined;
  excludedConnectingAirports: string;
  onMaxLayoverChange: (val: number | null) => Promise<void>;
  onMaxTotalDurationChange: (val: number | null) => Promise<void>;
  onExcludedAirportsDraftChange: (val: string) => void;
  onExcludedAirportsCommit: (val: string) => Promise<void>;
}

export default function LayoverDurationDefaultsCard({
  maxLayoverMinutes,
  maxTotalDurationMinutes,
  excludedConnectingAirports,
  onMaxLayoverChange,
  onMaxTotalDurationChange,
  onExcludedAirportsDraftChange,
  onExcludedAirportsCommit,
}: Props) {
  return (
    <SettingsCard className="space-y-4">
      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
        <Timer className="w-3.5 h-3.5 text-slate-400" />
        <span>Layover & Trip Duration Defaults</span>
      </h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
            Default Max Layover Duration
          </label>
          <SettingsSelect
            value={maxLayoverMinutes !== null && maxLayoverMinutes !== undefined ? String(maxLayoverMinutes) : ''}
            onChange={e => onMaxLayoverChange(e.target.value === '' ? null : parseInt(e.target.value, 10))}
          >
            <option value="">Any (No Layover Limit)</option>
            <option value="90">1.5 Hours (90 mins)</option>
            <option value="120">2 Hours (120 mins)</option>
            <option value="180">3 Hours (180 mins)</option>
            <option value="240">4 Hours (240 mins)</option>
            <option value="300">5 Hours (300 mins)</option>
            <option value="360">6 Hours (360 mins)</option>
            <option value="480">8 Hours (480 mins)</option>
          </SettingsSelect>
          <p className="text-[11px] text-gunmetal-muted mt-1">
            Discards flight itineraries with connection layovers longer than this threshold.
          </p>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
            Default Max Total Trip Duration
          </label>
          <SettingsSelect
            value={maxTotalDurationMinutes !== null && maxTotalDurationMinutes !== undefined ? String(maxTotalDurationMinutes) : ''}
            onChange={e => onMaxTotalDurationChange(e.target.value === '' ? null : parseInt(e.target.value, 10))}
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
          </SettingsSelect>
          <p className="text-[11px] text-gunmetal-muted mt-1">
            Filters out itineraries exceeding total travel time (flights + layovers).
          </p>
        </div>
      </div>

      <div className="pt-2 border-t border-gunmetal-border/70">
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
          Default Excluded Connecting Airports
        </label>
        <input
          type="text"
          placeholder="e.g. ORD, DEN, MIA (comma-separated IATA codes)"
          value={excludedConnectingAirports}
          onChange={e => onExcludedAirportsDraftChange(e.target.value.toUpperCase())}
          onBlur={e => onExcludedAirportsCommit(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') e.currentTarget.blur();
          }}
          className="w-full min-h-[44px] border border-gunmetal-border p-2.5 rounded-md bg-gunmetal-canvas text-slate-200 placeholder-zinc-500 focus:outline-none focus:border-slate-500 text-sm font-mono uppercase"
        />
        <p className="text-[11px] text-gunmetal-muted mt-1">
          Itineraries connecting through any of these intermediate airport hubs will be excluded by default.
        </p>
      </div>
    </SettingsCard>
  );
}