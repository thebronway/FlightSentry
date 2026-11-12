'use client';

import { Moon } from 'lucide-react';
import SettingsCard from '../shared/SettingsCard';
import SettingsSelect from '../shared/SettingsSelect';

interface Props {
  maxStops: number | null | undefined;
  noRedeye: boolean;
  onMaxStopsChange: (val: number | null) => Promise<void>;
  onNoRedeyeToggle: (checked: boolean) => Promise<void>;
}

export default function StopsRedeyeDefaultsCard({
  maxStops,
  noRedeye,
  onMaxStopsChange,
  onNoRedeyeToggle,
}: Props) {
  return (
    <SettingsCard className="space-y-4">
      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
        <Moon className="w-3.5 h-3.5 text-slate-400" />
        <span>Stops & Timing Defaults</span>
      </h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
            Default Maximum Stops
          </label>
          <SettingsSelect
            value={maxStops !== null && maxStops !== undefined ? String(maxStops) : ''}
            onChange={e => onMaxStopsChange(e.target.value === '' ? null : parseInt(e.target.value, 10))}
          >
            <option value="">Any (No Stop Limit)</option>
            <option value="0">Nonstop Only (0 Stops)</option>
            <option value="1">1 Stop or Fewer (≤ 1 Stop)</option>
            <option value="2">2 Stops or Fewer (≤ 2 Stops)</option>
          </SettingsSelect>
          <p className="text-[11px] text-gunmetal-muted mt-1">
            Default stops limit applied to route searches across all search providers.
          </p>
        </div>

        <div className="flex flex-col justify-between">
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
            Default Redeye Filter
          </label>
          <label className="min-h-[44px] p-3 rounded-md bg-gunmetal-canvas border border-gunmetal-border flex items-center justify-between gap-3 cursor-pointer select-none">
            <div>
              <span className="text-xs font-semibold text-slate-200 block">
                Exclude Redeye Flights
              </span>
              <span className="text-[11px] text-gunmetal-muted block mt-0.5">
                Filters out departures between 9:00 PM and 5:00 AM by default.
              </span>
            </div>
            <input
              type="checkbox"
              checked={noRedeye}
              onChange={e => onNoRedeyeToggle(e.target.checked)}
              className="w-5 h-5 sm:w-4 sm:h-4 accent-slate-500 rounded cursor-pointer flex-shrink-0"
            />
          </label>
        </div>
      </div>
    </SettingsCard>
  );
}