'use client';

import { Clock, CalendarClock, Archive } from 'lucide-react';
import SettingsCard from '@/components/settings/shared/SettingsCard';
import SettingsSelect from '@/components/settings/shared/SettingsSelect';
import { RETENTION_OPTIONS } from '@/components/settings/general/PastFlightsRetentionCard';
import {
  CADENCE_OPTIONS,
  formatCustomCadenceLabel,
} from '@/components/settings/shared/cadenceOptions';
import { OnboardingStepProps } from '../types';

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
    const normalized = ((currentMinutes % (24 * 60)) + 24 * 60) % (24 * 60);
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

export default function SchedulingStep({
  settings,
  onChange,
  onSkipToSettingsLater,
}: OnboardingStepProps) {
  const startTime = settings.checkStartTime || '06:00';

  const tiers: Array<{
    key: 'scheduleFarOut' | 'scheduleStandard' | 'scheduleFinalStretch';
    label: string;
    windowDesc: string;
    whyDesc: string;
    value: number;
  }> = [
    {
      key: 'scheduleFarOut',
      label: 'Far Out',
      windowDesc: '> 90 days before departure',
      whyDesc:
        'Airlines rarely make major fare adjustments months in advance. Checking every 24–48 hours saves API quota for closer trips.',
      value: settings.scheduleFarOut,
    },
    {
      key: 'scheduleStandard',
      label: 'Standard Window',
      windowDesc: '14–90 days before departure',
      whyDesc:
        'The primary booking and rebooking window. Daily checks catch fare sales and schedule shifts reliably.',
      value: settings.scheduleStandard,
    },
    {
      key: 'scheduleFinalStretch',
      label: 'Final Stretch',
      windowDesc: '< 14 days before departure',
      whyDesc:
        'Prices fluctuate rapidly in the final two weeks. Polling every 6–12 hours catches last-minute drops and rebooking credits.',
      value: settings.scheduleFinalStretch,
    },
  ];

  return (
    <div className="space-y-4">
      <SettingsCard className="space-y-2.5">
        <label
          htmlFor="onboarding-check-start-time"
          className="block text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-1.5"
        >
          <Clock className="w-4 h-4 text-sky-400" />
          <span>1. Daily Check Start Time ({settings.timezone || 'UTC'})</span>
        </label>
        <p className="text-xs text-gunmetal-muted leading-relaxed">
          Sets the local anchor time for automated price checks. Daily cadences (24h, 48h, etc.) run at this exact time; sub-daily cadences (e.g., every 12h or 6h) start here and cycle evenly through the day.
        </p>
        <div className="max-w-xs">
          <input
            id="onboarding-check-start-time"
            type="time"
            value={startTime}
            onChange={(e) => onChange({ ...settings, checkStartTime: e.target.value })}
            className="block w-full min-h-[42px] appearance-none border border-gunmetal-border px-3 py-2 rounded-md bg-gunmetal-canvas text-slate-200 focus:outline-none focus:border-slate-500 text-sm [color-scheme:dark]"
          />
        </div>
      </SettingsCard>

      <div className="space-y-2.5">
        <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-200">
          <CalendarClock className="w-4 h-4 text-emerald-400" />
          <span>2. Proximity-Based Check Cadences</span>
        </div>
        <p className="text-xs text-gunmetal-muted leading-relaxed">
          Every flight automatically transitions through these three tiers as its departure date approaches. You can also override cadences on individual flights if needed.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {tiers.map((tier) => {
            const hasMatch = CADENCE_OPTIONS.some((opt) => opt.value === tier.value);
            const preview = computeCheckSchedule(startTime, tier.value);
            return (
              <div
                key={tier.key}
                className="p-4 rounded-xl bg-gunmetal-canvas/60 border border-gunmetal-border flex flex-col justify-between space-y-3"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-100">
                      {tier.label}
                    </span>
                    <span className="text-[11px] font-mono text-sky-400">{tier.windowDesc}</span>
                  </div>

                  <SettingsSelect
                    compactDesktop
                    value={tier.value}
                    onChange={(e) =>
                      onChange({ ...settings, [tier.key]: Number(e.target.value) })
                    }
                  >
                    {!hasMatch && tier.value !== undefined && tier.value !== null && (
                      <option value={tier.value}>{formatCustomCadenceLabel(tier.value)}</option>
                    )}
                    {CADENCE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </SettingsSelect>

                  <p className="text-[11px] text-gunmetal-muted leading-relaxed pt-1">
                    {tier.whyDesc}
                  </p>
                </div>

                <div className="pt-2 border-t border-gunmetal-border/70">
                  {tier.value === 0 ? (
                    <span className="text-[11px] text-amber-400 font-medium">
                      Checks paused in this window.
                    </span>
                  ) : tier.value < 24 ? (
                    <div className="text-[11px]">
                      <span className="text-slate-300 font-semibold block mb-0.5">
                        Daily Schedule Preview:
                      </span>
                      <span className="text-sky-400 font-mono leading-relaxed block">
                        {preview.join(' → ')}
                      </span>
                    </div>
                  ) : (
                    <span className="text-[11px] text-slate-300 font-mono">
                      {preview[0]}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Past Flights Archive & Retention */}
      <SettingsCard className="space-y-2.5">
        <label
          htmlFor="onboarding-retention-days"
          className="block text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-1.5"
        >
          <Archive className="w-4 h-4 text-sky-400" />
          <span>3. Past Flights Archive &amp; Retention</span>
        </label>
        <p className="text-xs text-gunmetal-muted leading-relaxed">
          Departed flights automatically move to <strong>Past</strong> status and stop consuming API checks. Choose whether to keep archived flights forever or auto-purge old records after a set number of days. You can also inspect upcoming jobs anytime in <strong>Settings → Scheduling</strong>.
        </p>
        <SettingsSelect
          id="onboarding-retention-days"
          value={
            settings.pastFlightRetentionDays !== null &&
            settings.pastFlightRetentionDays !== undefined
              ? String(settings.pastFlightRetentionDays)
              : ''
          }
          onChange={(e) => {
            const val = e.target.value;
            onChange({
              ...settings,
              pastFlightRetentionDays: val === '' ? null : parseInt(val, 10),
            });
          }}
          wrapperClassName="max-w-full sm:max-w-sm"
          className="font-medium"
        >
          {RETENTION_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-gunmetal-card text-slate-200">
              {opt.label}
            </option>
          ))}
        </SettingsSelect>
      </SettingsCard>
    </div>
  );
}