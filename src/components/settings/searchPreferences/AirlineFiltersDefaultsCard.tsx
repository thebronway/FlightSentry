'use client';

import { ShieldAlert } from 'lucide-react';
import AirlineTagInput from '../../common/AirlineTagInput';
import SettingsCard from '../shared/SettingsCard';

interface Props {
  includedAirlines: string;
  excludedAirlines: string;
  onIncludedChange: (val: string) => Promise<void>;
  onExcludedChange: (val: string) => Promise<void>;
}

export default function AirlineFiltersDefaultsCard({
  includedAirlines,
  excludedAirlines,
  onIncludedChange,
  onExcludedChange,
}: Props) {
  return (
    <SettingsCard className="space-y-4">
      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
        <ShieldAlert className="w-3.5 h-3.5 text-slate-400" />
        <span>Global Airline Inclusions & Exclusions</span>
      </h4>
      <p className="text-[11px] text-gunmetal-muted">
        Establish default carrier inclusions or exclusions. New flight tracking monitors will inherit these filters automatically.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
            Default Included Airlines
          </label>
          <AirlineTagInput
            value={includedAirlines}
            onChange={onIncludedChange}
            placeholder="e.g. DL, AA (type & press space or comma)"
          />
          <p className="text-[11px] text-gunmetal-muted mt-1">
            Restrict route searches to specific airlines by default.
          </p>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
            Default Excluded Airlines
          </label>
          <AirlineTagInput
            value={excludedAirlines}
            onChange={onExcludedChange}
            placeholder="e.g. NK, F9 (type & press space or comma)"
          />
          <p className="text-[11px] text-gunmetal-muted mt-1">
            Exclude specific airlines (e.g. ultra-low-cost carriers) by default.
          </p>
        </div>
      </div>
    </SettingsCard>
  );
}