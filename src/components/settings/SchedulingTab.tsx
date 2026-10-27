'use client';

import { Settings } from '@/types';

interface Props {
  settings: Settings;
  onChange: (settings: Settings) => void;
}

export default function SchedulingTab({ settings, onChange }: Props) {
  return (
    <div className="space-y-6 pt-2">
      <div className="bg-gunmetal-canvas/60 border border-gunmetal-border p-3.5 rounded-lg text-xs text-slate-300">
        <p className="font-semibold text-slate-200 mb-0.5">Global Check Cadence Defaults</p>
        These cadences establish the global default check frequency for all tracked flights based on departure proximity. All flights inherit these intervals unless customized individually in flight settings[cite: 1].
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1 text-slate-300">Far Out (&gt;90 days)</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={settings.scheduleFarOut}
              onChange={e => onChange({ ...settings, scheduleFarOut: Number(e.target.value) })}
              className="w-full border border-gunmetal-border p-2 rounded-md bg-gunmetal-canvas text-slate-200 focus:outline-none focus:border-slate-500"
            />
            <span className="text-sm text-gunmetal-muted">hrs</span>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1 text-slate-300">Standard (14-90 days)</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={settings.scheduleStandard}
              onChange={e => onChange({ ...settings, scheduleStandard: Number(e.target.value) })}
              className="w-full border border-gunmetal-border p-2 rounded-md bg-gunmetal-canvas text-slate-200 focus:outline-none focus:border-slate-500"
            />
            <span className="text-sm text-gunmetal-muted">hrs</span>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1 text-slate-300">Final Stretch (&lt;14 days)</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={settings.scheduleFinalStretch}
              onChange={e => onChange({ ...settings, scheduleFinalStretch: Number(e.target.value) })}
              className="w-full border border-gunmetal-border p-2 rounded-md bg-gunmetal-canvas text-slate-200 focus:outline-none focus:border-slate-500"
            />
            <span className="text-sm text-gunmetal-muted">hrs</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1 text-slate-300">Operating Start Hour (Local)</label>
          <input
            type="number"
            min="0"
            max="23"
            value={settings.operatingHoursStart}
            onChange={e => onChange({ ...settings, operatingHoursStart: Number(e.target.value) })}
            className="w-full border border-gunmetal-border p-2 rounded-md bg-gunmetal-canvas text-slate-200 focus:outline-none focus:border-slate-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1 text-slate-300">Operating End Hour (Local)</label>
          <input
            type="number"
            min="0"
            max="23"
            value={settings.operatingHoursEnd}
            onChange={e => onChange({ ...settings, operatingHoursEnd: Number(e.target.value) })}
            className="w-full border border-gunmetal-border p-2 rounded-md bg-gunmetal-canvas text-slate-200 focus:outline-none focus:border-slate-500"
          />
        </div>
      </div>
    </div>
  );
}