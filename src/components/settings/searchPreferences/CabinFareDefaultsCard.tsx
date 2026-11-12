'use client';

import { Sliders } from 'lucide-react';
import { CabinClass, FareTier } from '@/types';
import SettingsCard from '../shared/SettingsCard';
import SettingsSelect from '../shared/SettingsSelect';

interface Props {
  cabinClass: CabinClass;
  fareTier: FareTier;
  onCabinClassChange: (val: CabinClass) => Promise<void>;
  onFareTierChange: (val: FareTier) => Promise<void>;
}

export default function CabinFareDefaultsCard({
  cabinClass,
  fareTier,
  onCabinClassChange,
  onFareTierChange,
}: Props) {
  return (
    <SettingsCard className="space-y-4">
      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
        <Sliders className="w-3.5 h-3.5 text-slate-400" />
        <span>Cabin & Fare Restrictions (Defaults)</span>
      </h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
            Default Cabin Class
          </label>
          <SettingsSelect
            value={cabinClass}
            onChange={e => onCabinClassChange(e.target.value as CabinClass)}
          >
            <option value="economy">Economy</option>
            <option value="premium_economy">Premium Economy</option>
            <option value="business">Business</option>
            <option value="first">First Class</option>
          </SettingsSelect>
          <p className="text-[11px] text-gunmetal-muted mt-1">
            Initial cabin class selected when creating new flight tracking monitors.
          </p>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
            Default Fare Tier
          </label>
          <SettingsSelect
            value={fareTier}
            onChange={e => onFareTierChange(e.target.value as FareTier)}
          >
            <option value="Standard">Standard (No Basic Economy)</option>
            <option value="Basic Economy">Basic Economy / Unbundled</option>
          </SettingsSelect>
          <p className="text-[11px] text-gunmetal-muted mt-1">
            Select Standard to filter out restrictive unbundled basic fares on search queries.
          </p>
        </div>
      </div>
    </SettingsCard>
  );
}