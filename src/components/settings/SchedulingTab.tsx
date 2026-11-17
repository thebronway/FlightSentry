'use client';

import { useState } from 'react';
import { CalendarClock } from 'lucide-react';
import { Settings } from '@/types';
import SettingsIntroBanner from './shared/SettingsIntroBanner';
import SettingsCard from './shared/SettingsCard';
import CheckStartTimeCard from './scheduling/CheckStartTimeCard';
import ProximityCadenceCard from './scheduling/ProximityCadenceCard';
import PastFlightsRetentionCard from './general/PastFlightsRetentionCard';
import ScheduledTasksModal from './scheduling/ScheduledTasksModal';

interface Props {
  settings: Settings;
  onChange: (settings: Settings) => void;
  onAutoSave?: (
    updatedSettings: Settings,
    statusKey: string,
    pillMessage?: string,
    toastMessage?: string
  ) => Promise<void>;
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

export default function SchedulingTab({
  settings,
  onChange,
  onAutoSave,
}: Props) {
  const [showScheduledTasksModal, setShowScheduledTasksModal] = useState(false);
  const startTime = settings.checkStartTime || '06:00';

  const farOutSchedule = computeCheckSchedule(startTime, settings.scheduleFarOut);
  const standardSchedule = computeCheckSchedule(startTime, settings.scheduleStandard);
  const finalStretchSchedule = computeCheckSchedule(startTime, settings.scheduleFinalStretch);

  const handleRetentionDaysChange = async (retentionDays: number | null) => {
    const updated = { ...settings, pastFlightRetentionDays: retentionDays };
    onChange(updated);
    if (onAutoSave) {
      await onAutoSave(
        updated,
        'schedule',
        undefined,
        retentionDays === null
          ? 'Past flights retention set to Keep Forever'
          : `Past flights retention set to ${retentionDays} days`
      );
    }
  };

  return (
    <div className="space-y-6 pt-2">
      <SettingsIntroBanner
        title="Global Check Cadence Defaults"
        description="These cadences establish the global default check frequency for all tracked flights based on departure proximity. All flights inherit these intervals unless customized individually in flight settings."
      />

      <CheckStartTimeCard
        startTime={startTime}
        onChangeStartTime={val => onChange({ ...settings, checkStartTime: val })}
        onBlurStartTime={() => {
          if (onAutoSave) onAutoSave(settings, 'schedule', undefined, 'Daily check start time updated');
        }}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ProximityCadenceCard
          label="Far Out (>90 days)"
          cadenceHours={settings.scheduleFarOut}
          schedulePreview={farOutSchedule}
          pausedMessage="No checks performed while >90 days out. Resumes when within 90 days."
          onChangeCadence={val => {
            const updated = { ...settings, scheduleFarOut: val };
            onChange(updated);
            if (onAutoSave) onAutoSave(updated, 'schedule', undefined, 'Far out (>90d) check cadence updated');
          }}
        />

        <ProximityCadenceCard
          label="Standard (14–90 days)"
          cadenceHours={settings.scheduleStandard}
          schedulePreview={standardSchedule}
          pausedMessage="No checks performed between 14–90 days. Resumes when within 14 days."
          onChangeCadence={val => {
            const updated = { ...settings, scheduleStandard: val };
            onChange(updated);
            if (onAutoSave) onAutoSave(updated, 'schedule', undefined, 'Standard (14–90d) check cadence updated');
          }}
        />

        <ProximityCadenceCard
          label="Final Stretch (<14 days)"
          cadenceHours={settings.scheduleFinalStretch}
          schedulePreview={finalStretchSchedule}
          pausedMessage="No checks performed within 14 days of departure."
          onChangeCadence={val => {
            const updated = { ...settings, scheduleFinalStretch: val };
            onChange(updated);
            if (onAutoSave) onAutoSave(updated, 'schedule', undefined, 'Final stretch (<14d) check cadence updated');
          }}
        />
      </div>

      <SettingsCard className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
            <CalendarClock className="w-4 h-4 text-sky-400" />
            <span>Upcoming Scheduled Tasks</span>
          </h3>
          <p className="text-xs text-gunmetal-muted leading-relaxed">
            Inspect the live queue of upcoming automated flight price checks and background maintenance jobs in your configured timezone.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowScheduledTasksModal(true)}
          className="self-start sm:self-center flex-shrink-0 min-h-[44px] sm:min-h-[38px] px-4 py-2 rounded-lg text-xs sm:text-sm inline-flex items-center justify-center gap-1.5 bg-gunmetal-canvas hover:bg-gunmetal-border border border-gunmetal-border text-slate-300 hover:text-white font-semibold transition-colors cursor-pointer"
        >
          <CalendarClock className="w-4 h-4 text-sky-400" />
          <span>View Scheduled Tasks</span>
        </button>
      </SettingsCard>

      <PastFlightsRetentionCard
        retentionDays={settings.pastFlightRetentionDays ?? null}
        onSelectRetentionDays={handleRetentionDaysChange}
      />

      <ScheduledTasksModal
        isOpen={showScheduledTasksModal}
        timezone={settings.timezone || 'UTC'}
        onClose={() => setShowScheduledTasksModal(false)}
      />
    </div>
  );
}