'use client';

import { Settings } from '@/types';

interface Props {
  overrideFarOut: string;
  overrideStandard: string;
  overrideFinalStretch: string;
  defaultSettings: Settings | null;
  onFarOutChange: (val: string) => void;
  onStandardChange: (val: string) => void;
  onFinalStretchChange: (val: string) => void;
}

export default function CadenceOverridesSection({
  overrideFarOut,
  overrideStandard,
  overrideFinalStretch,
  defaultSettings,
  onFarOutChange,
  onStandardChange,
  onFinalStretchChange,
}: Props) {
  return (
    <div className="pt-2">
      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-gunmetal-border pb-1.5 mb-2.5">
        Schedule Cadence Overrides (Leave blank for global settings)
      </h3>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-medium text-gunmetal-muted mb-1">Far Out (&gt;90d hrs)</label>
          <input
            type="number"
            placeholder={defaultSettings?.scheduleFarOut != null ? String(defaultSettings.scheduleFarOut) : '48'}
            value={overrideFarOut}
            onChange={e => onFarOutChange(e.target.value)}
            className="w-full h-10 px-3 py-2 text-sm rounded-md bg-gunmetal-canvas text-slate-200 border border-gunmetal-border focus:border-slate-500 focus:outline-none placeholder-zinc-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gunmetal-muted mb-1">Standard (14-90d hrs)</label>
          <input
            type="number"
            placeholder={defaultSettings?.scheduleStandard != null ? String(defaultSettings.scheduleStandard) : '24'}
            value={overrideStandard}
            onChange={e => onStandardChange(e.target.value)}
            className="w-full h-10 px-3 py-2 text-sm rounded-md bg-gunmetal-canvas text-slate-200 border border-gunmetal-border focus:border-slate-500 focus:outline-none placeholder-zinc-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gunmetal-muted mb-1">Final Stretch (&lt;14d hrs)</label>
          <input
            type="number"
            placeholder={defaultSettings?.scheduleFinalStretch != null ? String(defaultSettings.scheduleFinalStretch) : '12'}
            value={overrideFinalStretch}
            onChange={e => onFinalStretchChange(e.target.value)}
            className="w-full h-10 px-3 py-2 text-sm rounded-md bg-gunmetal-canvas text-slate-200 border border-gunmetal-border focus:border-slate-500 focus:outline-none placeholder-zinc-500"
          />
        </div>
      </div>
    </div>
  );
}