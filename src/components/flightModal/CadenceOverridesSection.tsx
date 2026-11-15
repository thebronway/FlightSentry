'use client';

import { useState, useEffect } from 'react';
import { Settings } from '@/types';
import { ChevronDown, Clock } from 'lucide-react';
import { OVERRIDE_CADENCE_OPTIONS, formatCustomCadenceLabel } from '@/components/settings/shared/cadenceOptions';

interface Props {
  overrideFarOut: string;
  overrideStandard: string;
  overrideFinalStretch: string;
  defaultSettings: Settings | null;
  onFarOutChange: (val: string) => void;
  onStandardChange: (val: string) => void;
  onFinalStretchChange: (val: string) => void;
}

const renderOverrideOptions = (currentValue: string) => {
  const isCustom = currentValue !== '' && !OVERRIDE_CADENCE_OPTIONS.some(opt => opt.value === currentValue);
  return (
    <>
      {isCustom && (
        <option key={currentValue} value={currentValue}>
          {formatCustomCadenceLabel(Number(currentValue))}
        </option>
      )}
      {OVERRIDE_CADENCE_OPTIONS.map(opt => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </>
  );
};

export default function CadenceOverridesSection({
  overrideFarOut,
  overrideStandard,
  overrideFinalStretch,
  defaultSettings,
  onFarOutChange,
  onStandardChange,
  onFinalStretchChange,
}: Props) {
  const hasCustomOverrides = Boolean(
    overrideFarOut !== '' || overrideStandard !== '' || overrideFinalStretch !== ''
  );
  const [isExpanded, setIsExpanded] = useState(hasCustomOverrides);

  useEffect(() => {
    if (hasCustomOverrides) {
      setIsExpanded(true);
    }
  }, [hasCustomOverrides]);

  const formatShortCadence = (val?: number, fallback?: string) => {
    if (val === undefined || val === null) return fallback || 'Default';
    if (val === 0) return 'Paused';
    if (val < 24) return `${val}h`;
    return `${Math.round(val / 24)}d`;
  };

  const formatDefaultLabel = (val?: number) => {
    if (val === undefined || val === null) return 'Default (Settings)';
    if (val === 0) return 'Default (Paused)';
    if (val < 24) return `Default (${val} hrs)`;
    return `Default (${Math.round(val / 24)}d)`;
  };

  const summaryText = hasCustomOverrides
    ? 'Custom schedule active'
    : `Global defaults (${formatShortCadence(defaultSettings?.scheduleFarOut, '48h')} / ${formatShortCadence(defaultSettings?.scheduleStandard, '24h')} / ${formatShortCadence(defaultSettings?.scheduleFinalStretch, '12h')})`;

  return (
    <div>
      <button
        type="button"
        onClick={() => setIsExpanded(prev => !prev)}
        aria-expanded={isExpanded}
        className="w-full flex items-center justify-between gap-3 text-left cursor-pointer select-none group"
      >
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <Clock className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-300 group-hover:text-white transition-colors">
            Schedule Cadence Overrides (Optional)
          </span>
          <span
            className={`text-[11px] px-2 py-0.5 rounded border font-medium ${
              hasCustomOverrides
                ? 'bg-sky-950/60 text-sky-300 border-sky-800/60'
                : 'bg-gunmetal-card text-gunmetal-muted border-gunmetal-border'
            }`}
          >
            {summaryText}
          </span>
        </div>
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-sky-400 group-hover:text-sky-300 flex-shrink-0">
          <span>{isExpanded ? 'Hide' : 'Customize'}</span>
          <ChevronDown
            className={`w-4 h-4 transition-transform duration-150 ${isExpanded ? 'rotate-180' : ''}`}
          />
        </span>
      </button>

      {isExpanded && (
        <div className="pt-3 mt-3 border-t border-gunmetal-border/70 grid grid-cols-1 sm:grid-cols-3 gap-3 animate-in fade-in duration-150">
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">Far Out (&gt;90d)</label>
          <div className="relative">
            <select
              value={overrideFarOut}
              onChange={e => onFarOutChange(e.target.value)}
              className="w-full h-10 appearance-none border border-gunmetal-border px-3 py-2 pr-10 rounded-md bg-gunmetal-canvas text-slate-200 focus:outline-none focus:border-slate-500 text-xs cursor-pointer"
            >
              <option value="">{formatDefaultLabel(defaultSettings?.scheduleFarOut)}</option>
              {renderOverrideOptions(overrideFarOut)}
            </select>
            <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gunmetal-muted pointer-events-none" />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">Standard (14–90d)</label>
          <div className="relative">
            <select
              value={overrideStandard}
              onChange={e => onStandardChange(e.target.value)}
              className="w-full h-10 appearance-none border border-gunmetal-border px-3 py-2 pr-10 rounded-md bg-gunmetal-canvas text-slate-200 focus:outline-none focus:border-slate-500 text-xs cursor-pointer"
            >
              <option value="">{formatDefaultLabel(defaultSettings?.scheduleStandard)}</option>
              {renderOverrideOptions(overrideStandard)}
            </select>
            <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gunmetal-muted pointer-events-none" />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">Final Stretch (&lt;14d)</label>
          <div className="relative">
            <select
              value={overrideFinalStretch}
              onChange={e => onFinalStretchChange(e.target.value)}
              className="w-full h-10 appearance-none border border-gunmetal-border px-3 py-2 pr-10 rounded-md bg-gunmetal-canvas text-slate-200 focus:outline-none focus:border-slate-500 text-xs cursor-pointer"
            >
              <option value="">{formatDefaultLabel(defaultSettings?.scheduleFinalStretch)}</option>
              {renderOverrideOptions(overrideFinalStretch)}
            </select>
            <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gunmetal-muted pointer-events-none" />
          </div>
        </div>
        </div>
      )}
    </div>
  );
}