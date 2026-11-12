'use client';

import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import SettingsCard from '../shared/SettingsCard';

interface Props {
  timezone: string;
}

export default function SystemTimezoneCard({ timezone }: Props) {
  const [currentTime, setCurrentTime] = useState<string>('');

  useEffect(() => {
    const updateClock = () => {
      try {
        const formatted = new Intl.DateTimeFormat('en-US', {
          timeZone: timezone,
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        }).format(new Date());
        setCurrentTime(formatted);
      } catch {
        setCurrentTime(new Date().toUTCString());
      }
    };

    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, [timezone]);

  return (
    <SettingsCard className="space-y-3">
      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
        <Clock className="w-4 h-4 text-slate-400" />
        Application Timezone & Environment Time
      </label>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
        <div className="p-3 rounded-md bg-gunmetal-canvas border border-gunmetal-border">
          <span className="text-[11px] font-semibold text-gunmetal-muted block uppercase tracking-wider">
            Configured Timezone
          </span>
          <span className="text-sm font-bold text-slate-100 font-mono mt-0.5 block">
            {timezone}
          </span>
          <span className="text-[10px] text-gunmetal-muted block mt-1">
            Set via Docker container TZ environment variable.
          </span>
        </div>

        <div className="p-3 rounded-md bg-gunmetal-canvas border border-gunmetal-border">
          <span className="text-[11px] font-semibold text-gunmetal-muted block uppercase tracking-wider">
            Current Local Time
          </span>
          <span className="text-sm font-bold text-sky-400 font-mono mt-0.5 block">
            {currentTime || 'Resolving clock...'}
          </span>
          <span className="text-[10px] text-gunmetal-muted block mt-1">
            Synchronized reference time used for scheduling cadences.
          </span>
        </div>
      </div>
    </SettingsCard>
  );
}