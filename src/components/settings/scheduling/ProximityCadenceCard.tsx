'use client';

import SettingsSelect from '../shared/SettingsSelect';
import { CADENCE_OPTIONS, formatCustomCadenceLabel } from '../shared/cadenceOptions';

interface Props {
  label: string;
  cadenceHours: number;
  schedulePreview: string[];
  pausedMessage: string;
  onChangeCadence: (hours: number) => void;
}

export default function ProximityCadenceCard({
  label,
  cadenceHours,
  schedulePreview,
  pausedMessage,
  onChangeCadence,
}: Props) {
  const hasMatch = CADENCE_OPTIONS.some(opt => opt.value === cadenceHours);

  return (
    <div className="bg-gunmetal-canvas/40 border border-gunmetal-border p-4 rounded-lg flex flex-col justify-between space-y-3">
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
          {label}
        </label>
        <SettingsSelect
          value={cadenceHours}
          onChange={e => onChangeCadence(Number(e.target.value))}
        >
          {!hasMatch && cadenceHours !== undefined && cadenceHours !== null && (
            <option key={cadenceHours} value={cadenceHours}>
              {formatCustomCadenceLabel(cadenceHours)}
            </option>
          )}
          {CADENCE_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </SettingsSelect>
      </div>

      <div>
        {cadenceHours === 0 ? (
          <p className="text-[11px] text-amber-400/90 font-medium">
            {pausedMessage}
          </p>
        ) : cadenceHours < 24 ? (
          <div className="p-2.5 rounded bg-gunmetal-card border border-slate-700/60 text-[11px]">
            <span className="text-slate-300 font-semibold block mb-1">Checks Done At:</span>
            <span className="text-sky-400 font-mono leading-relaxed block">
              {schedulePreview.join(' → ')}
            </span>
          </div>
        ) : (
          <p className="text-[11px] text-gunmetal-muted">
            {schedulePreview[0] || `Runs every ${Math.round(cadenceHours / 24)} days`}
          </p>
        )}
      </div>
    </div>
  );
}