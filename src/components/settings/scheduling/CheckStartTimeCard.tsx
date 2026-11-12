'use client';

import { Clock } from 'lucide-react';
import SettingsCard from '../shared/SettingsCard';

interface Props {
  startTime: string;
  onChangeStartTime: (val: string) => void;
  onBlurStartTime: () => void;
}

export default function CheckStartTimeCard({
  startTime,
  onChangeStartTime,
  onBlurStartTime,
}: Props) {
  return (
    <SettingsCard className="space-y-2 overflow-hidden">
      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
        <Clock className="w-4 h-4 text-slate-400" />
        Daily Check Start Time (Local)
      </label>
      <div className="w-full min-w-0 max-w-full sm:max-w-xs">
        <input
          type="time"
          value={startTime}
          onChange={e => onChangeStartTime(e.target.value)}
          onBlur={onBlurStartTime}
          onKeyDown={e => {
            if (e.key === 'Enter') e.currentTarget.blur();
          }}
          className="block w-full min-w-0 max-w-full min-h-[44px] appearance-none border border-gunmetal-border p-2.5 rounded-md bg-gunmetal-canvas text-slate-200 focus:outline-none focus:border-slate-500 text-sm [color-scheme:dark]"
        />
      </div>
      <p className="text-[11px] text-gunmetal-muted">
        The reference start time for automated checks. Daily intervals (24h/48h) run at this time; cadences under 24 hours anchor to this time and cycle throughout the day.
      </p>
    </SettingsCard>
  );
}