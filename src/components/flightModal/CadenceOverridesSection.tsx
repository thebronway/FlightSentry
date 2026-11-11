'use client';

import { Settings } from '@/types';
import { ChevronDown } from 'lucide-react';

interface Props {
  overrideFarOut: string;
  overrideStandard: string;
  overrideFinalStretch: string;
  defaultSettings: Settings | null;
  onFarOutChange: (val: string) => void;
  onStandardChange: (val: string) => void;
  onFinalStretchChange: (val: string) => void;
}

const OVERRIDE_OPTIONS = [
  { value: '0', label: "Do not check (Paused)" },
  { value: '1', label: "Every 1 hour" },
  { value: '2', label: "Every 2 hours" },
  { value: '3', label: "Every 3 hours" },
  { value: '4', label: "Every 4 hours" },
  { value: '6', label: "Every 6 hours" },
  { value: '8', label: "Every 8 hours" },
  { value: '10', label: "Every 10 hours" },
  { value: '11', label: "Every 11 hours" },
  { value: '12', label: "Every 12 hours" },
  { value: '24', label: "Every day (24 hrs)" },
  { value: '48', label: "Every 2 days (48 hrs)" },
  { value: '72', label: "Every 3 days (72 hrs)" },
  { value: '96', label: "Every 4 days (96 hrs)" },
  { value: '168', label: "Every week (168 hrs)" },
];

const renderOverrideOptions = (currentValue: string) => {
  const isCustom = currentValue !== '' && !OVERRIDE_OPTIONS.some(opt => opt.value === currentValue);
  return (
    <>
      {isCustom && (
        <option key={currentValue} value={currentValue}>
          {Number(currentValue) < 24
            ? `Every ${currentValue} hours`
            : `Every ${Math.round(Number(currentValue) / 24)} days (${currentValue} hrs)`}
        </option>
      )}
      {OVERRIDE_OPTIONS.map(opt => (
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
  const formatDefaultLabel = (val?: number) => {
    if (val === undefined || val === null) return 'Default (Settings)';
    if (val === 0) return 'Default (Paused)';
    if (val < 24) return `Default (${val} hrs)`;
    return `Default (${Math.round(val / 24)}d)`;
  };

  return (
    <div className="pt-2">
      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-gunmetal-border pb-1.5 mb-2.5">
        Schedule Cadence Overrides (Optional)
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
    </div>
  );
}