'use client';

import { Settings } from '@/types';
import { Clock, ChevronDown } from 'lucide-react';

interface Props {
  settings: Settings;
  onChange: (settings: Settings) => void;
  onSaveSchedule: () => Promise<void>;
  savingSchedule: boolean;
  scheduleStatus: { type: 'success' | 'error'; message: string } | null;
}

function computeCheckSchedule(startTime: string, cadenceHours: number): string[] {
  if (!startTime || !cadenceHours || cadenceHours <= 0) return [];
  const [hStr, mStr] = startTime.split(':');
  const startH = parseInt(hStr || '6', 10);
  const startM = parseInt(mStr || '0', 10);

  if (cadenceHours >= 24) {
    const period = startH >= 12 ? 'PM' : 'AM';
    const displayH = startH % 12 || 12;
    const formatted = `${displayH}:${startM.toString().padStart(2, '0')} ${period}`;
    const days = Math.round(cadenceHours / 24);
    return [`Runs every ${days === 1 ? 'day' : `${days} days`} at ${formatted}`];
  }

  const times: string[] = [];
  const stepMinutes = Math.round(cadenceHours * 60);
  let totalMinutes = 0;
  let currentMinutes = startH * 60 + startM;

  while (totalMinutes < 24 * 60) {
    const normalized = (currentMinutes % (24 * 60) + (24 * 60)) % (24 * 60);
    const hour24 = Math.floor(normalized / 60);
    const min = normalized % 60;
    const period = hour24 >= 12 ? 'PM' : 'AM';
    const hour12 = hour24 % 12 || 12;
    times.push(`${hour12}:${min.toString().padStart(2, '0')} ${period}`);

    totalMinutes += stepMinutes;
    currentMinutes += stepMinutes;
  }

  return times;
}

export const CADENCE_OPTIONS = [
  { value: 0, label: "Do not check (Paused)" },
  { value: 2, label: "Every 2 hours (12 checks/day)" },
  { value: 3, label: "Every 3 hours (8 checks/day)" },
  { value: 4, label: "Every 4 hours (6 checks/day)" },
  { value: 6, label: "Every 6 hours (4 checks/day)" },
  { value: 8, label: "Every 8 hours (3 checks/day)" },
  { value: 12, label: "Every 12 hours (2 checks/day)" },
  { value: 24, label: "Every day (24 hrs)" },
  { value: 48, label: "Every 2 days (48 hrs)" },
  { value: 72, label: "Every 3 days (72 hrs)" },
  { value: 96, label: "Every 4 days (96 hrs)" },
  { value: 168, label: "Every week (168 hrs)" },
];

export default function SchedulingTab({
  settings,
  onChange,
  onSaveSchedule,
  savingSchedule,
  scheduleStatus,
}: Props) {
  const startTime = settings.checkStartTime || '06:00';

  const farOutSchedule = computeCheckSchedule(startTime, settings.scheduleFarOut);
  const standardSchedule = computeCheckSchedule(startTime, settings.scheduleStandard);
  const finalStretchSchedule = computeCheckSchedule(startTime, settings.scheduleFinalStretch);

  return (
    <div className="space-y-6 pt-2">
      <div className="bg-gunmetal-canvas/60 border border-gunmetal-border p-3.5 rounded-lg text-xs text-slate-300">
        <p className="font-semibold text-slate-200 mb-0.5">Global Check Cadence Defaults</p>
        These cadences establish the global default check frequency for all tracked flights based on departure proximity. All flights inherit these intervals unless customized individually in flight settings.
      </div>

      {/* Start Time Configuration */}
      <div className="bg-gunmetal-canvas/60 border border-gunmetal-border p-4 rounded-lg space-y-2">
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
          <Clock className="w-4 h-4 text-slate-400" />
          Daily Check Start Time (Local)
        </label>
        <div className="max-w-xs">
          <input
            type="time"
            value={startTime}
            onChange={e => onChange({ ...settings, checkStartTime: e.target.value })}
            className="w-full border border-gunmetal-border p-2.5 rounded-md bg-gunmetal-canvas text-slate-200 focus:outline-none focus:border-slate-500 text-sm [color-scheme:dark]"
          />
        </div>
        <p className="text-[11px] text-gunmetal-muted">
          The reference start time for automated checks. Daily intervals (24h/48h) run at this time; cadences under 24 hours anchor to this time and cycle throughout the day.
        </p>
      </div>

      {/* 3 Proximity Cadences */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Far Out (>90 days) */}
        <div className="bg-gunmetal-canvas/40 border border-gunmetal-border p-4 rounded-lg flex flex-col justify-between space-y-3">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Far Out (&gt;90 days)
            </label>
            <div className="relative">
              <select
                value={settings.scheduleFarOut}
                onChange={e => onChange({ ...settings, scheduleFarOut: Number(e.target.value) })}
                className="w-full appearance-none border border-gunmetal-border p-2.5 pr-10 rounded-md bg-gunmetal-canvas text-slate-200 focus:outline-none focus:border-slate-500 text-sm cursor-pointer"
              >
                {CADENCE_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gunmetal-muted pointer-events-none" />
            </div>
          </div>

          <div>
            {settings.scheduleFarOut === 0 ? (
              <p className="text-[11px] text-amber-400/90 font-medium">
                No checks performed while &gt;90 days out. Resumes when within 90 days.
              </p>
            ) : settings.scheduleFarOut < 24 ? (
              <div className="p-2.5 rounded bg-gunmetal-card border border-slate-700/60 text-[11px]">
                <span className="text-slate-300 font-semibold block mb-1">Checks Done At:</span>
                <span className="text-sky-400 font-mono leading-relaxed block">
                  {farOutSchedule.join(' → ')}
                </span>
              </div>
            ) : (
              <p className="text-[11px] text-gunmetal-muted">
                {farOutSchedule[0] || `Runs every ${Math.round(settings.scheduleFarOut / 24)} days`}
              </p>
            )}
          </div>
        </div>

        {/* Standard (14-90 days) */}
        <div className="bg-gunmetal-canvas/40 border border-gunmetal-border p-4 rounded-lg flex flex-col justify-between space-y-3">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Standard (14–90 days)
            </label>
            <div className="relative">
              <select
                value={settings.scheduleStandard}
                onChange={e => onChange({ ...settings, scheduleStandard: Number(e.target.value) })}
                className="w-full appearance-none border border-gunmetal-border p-2.5 pr-10 rounded-md bg-gunmetal-canvas text-slate-200 focus:outline-none focus:border-slate-500 text-sm cursor-pointer"
              >
                {CADENCE_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gunmetal-muted pointer-events-none" />
            </div>
          </div>

          <div>
            {settings.scheduleStandard === 0 ? (
              <p className="text-[11px] text-amber-400/90 font-medium">
                No checks performed between 14–90 days. Resumes when within 14 days.
              </p>
            ) : settings.scheduleStandard < 24 ? (
              <div className="p-2.5 rounded bg-gunmetal-card border border-slate-700/60 text-[11px]">
                <span className="text-slate-300 font-semibold block mb-1">Checks Done At:</span>
                <span className="text-sky-400 font-mono leading-relaxed block">
                  {standardSchedule.join(' → ')}
                </span>
              </div>
            ) : (
              <p className="text-[11px] text-gunmetal-muted">
                {standardSchedule[0] || `Runs every ${Math.round(settings.scheduleStandard / 24)} days`}
              </p>
            )}
          </div>
        </div>

        {/* Final Stretch (<14 days) */}
        <div className="bg-gunmetal-canvas/40 border border-gunmetal-border p-4 rounded-lg flex flex-col justify-between space-y-3">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Final Stretch (&lt;14 days)
            </label>
            <div className="relative">
              <select
                value={settings.scheduleFinalStretch}
                onChange={e => onChange({ ...settings, scheduleFinalStretch: Number(e.target.value) })}
                className="w-full appearance-none border border-gunmetal-border p-2.5 pr-10 rounded-md bg-gunmetal-canvas text-slate-200 focus:outline-none focus:border-slate-500 text-sm cursor-pointer"
              >
                {CADENCE_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gunmetal-muted pointer-events-none" />
            </div>
          </div>

          <div>
            {settings.scheduleFinalStretch === 0 ? (
              <p className="text-[11px] text-amber-400/90 font-medium">
                No checks performed within 14 days of departure.
              </p>
            ) : settings.scheduleFinalStretch < 24 ? (
              <div className="p-2.5 rounded bg-gunmetal-card border border-slate-700/60 text-[11px]">
                <span className="text-slate-300 font-semibold block mb-1">Checks Done At:</span>
                <span className="text-sky-400 font-mono leading-relaxed block">
                  {finalStretchSchedule.join(' → ')}
                </span>
              </div>
            ) : (
              <p className="text-[11px] text-gunmetal-muted">
                {finalStretchSchedule[0] || `Runs every ${Math.round(settings.scheduleFinalStretch / 24)} days`}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="pt-4 border-t border-gunmetal-border flex flex-wrap items-center justify-between gap-2">
        <div className="text-xs">
          {scheduleStatus && (
            <span className={scheduleStatus.type === 'success' ? 'text-green-400 font-medium' : 'text-red-400 font-medium'}>
              {scheduleStatus.message}
            </span>
          )}
        </div>
        <button
          type="button"
          disabled={savingSchedule}
          onClick={onSaveSchedule}
          className="text-xs font-semibold px-4 py-2 bg-gunmetal-canvas hover:bg-gunmetal-border text-slate-200 border border-gunmetal-border rounded-md transition-colors disabled:opacity-50 shadow-sm"
        >
          {savingSchedule ? 'Saving Schedule...' : 'Save Schedule Settings'}
        </button>
      </div>
    </div>
  );
}