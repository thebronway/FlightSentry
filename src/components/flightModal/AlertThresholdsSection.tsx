'use client';

import { Settings } from '@/types';

import { formatCurrency, computeAlertTargets } from '@/utils/format';
import { Bell, BellOff } from 'lucide-react';

interface Props {
  minDropDollar: string;
  minDropPercent: string;
  pauseTracking: boolean;
  disableNotifications: boolean;
  defaultSettings: Settings | null;
  currentPrice?: number | null;
  onDollarChange: (val: string) => void;
  onPercentChange: (val: string) => void;
  onPauseChange: (val: boolean) => void;
  onDisableNotificationsChange: (val: boolean) => void;
}

export default function AlertThresholdsSection({
  minDropDollar,
  minDropPercent,
  pauseTracking,
  disableNotifications,
  defaultSettings,
  currentPrice,
  onDollarChange,
  onPercentChange,
  onPauseChange,
  onDisableNotificationsChange,
}: Props) {
  const effectiveDropDollar =
    minDropDollar !== ''
      ? parseFloat(minDropDollar)
      : defaultSettings?.minDropDollar ?? 15;

  const effectiveDropPercent =
    minDropPercent !== ''
      ? parseFloat(minDropPercent)
      : defaultSettings?.minDropPercent ?? 5;

  const hasCurrentPrice = typeof currentPrice === 'number' && currentPrice > 0;

  const { dollarTarget, percentTarget, effectiveTarget } = computeAlertTargets(
    currentPrice || 0,
    !isNaN(effectiveDropDollar) ? effectiveDropDollar : null,
    !isNaN(effectiveDropPercent) ? effectiveDropPercent : null
  );

  return (
    <div className="space-y-4">
      {/* Per-Flight Alert Threshold Overrides */}
      <div className="bg-gunmetal-canvas/60 border border-gunmetal-border rounded-lg p-4 space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
          Price Drop Alert Thresholds (Optional Overrides)
        </h3>
        <p className="text-[11px] text-gunmetal-muted">
          Leave blank to inherit global defaults from Settings. Specify a custom amount or percentage if you only want alerts above specific thresholds for this flight.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Min $ Drop to Alert
            </label>
            <div className="flex items-center gap-2">
              <span className="text-gunmetal-muted text-xs">$</span>
              <input
                type="number"
                step="1"
                min="0"
                placeholder={defaultSettings?.minDropDollar != null ? String(defaultSettings.minDropDollar) : '15'}
                value={minDropDollar}
                onChange={e => onDollarChange(e.target.value)}
                className="w-full h-10 px-3 py-2 text-sm rounded-md bg-gunmetal-canvas text-slate-200 border border-gunmetal-border focus:border-slate-500 focus:outline-none placeholder-zinc-500"
              />
            </div>
            {hasCurrentPrice && dollarTarget !== null && (
              <p className="text-[11px] text-sky-400 mt-1 font-mono">
                Triggers at ≤ {formatCurrency(dollarTarget)} ({formatCurrency(currentPrice!)} - {formatCurrency(effectiveDropDollar)})
              </p>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Min % Drop to Alert
            </label>
            <div className="flex items-center gap-2">
              <span className="text-gunmetal-muted text-xs">%</span>
              <input
                type="number"
                step="0.1"
                min="0"
                placeholder={defaultSettings?.minDropPercent != null ? String(defaultSettings.minDropPercent) : '5'}
                value={minDropPercent}
                onChange={e => onPercentChange(e.target.value)}
                className="w-full h-10 px-3 py-2 text-sm rounded-md bg-gunmetal-canvas text-slate-200 border border-gunmetal-border focus:border-slate-500 focus:outline-none placeholder-zinc-500"
              />
            </div>
            {hasCurrentPrice && percentTarget !== null && (
              <p className="text-[11px] text-sky-400 mt-1 font-mono">
                Triggers at ≤ {formatCurrency(percentTarget)} ({formatCurrency(currentPrice!)} - {effectiveDropPercent}%)
              </p>
            )}
          </div>
        </div>

        {hasCurrentPrice && effectiveTarget !== null && (
          <div className="pt-2 border-t border-gunmetal-border/70 flex items-center justify-between text-xs">
            <span className="text-gunmetal-muted font-medium flex items-center gap-1.5">
              <Bell className="w-3.5 h-3.5 text-sky-400" />
              Target Alert Threshold:
            </span>
            <span className="text-emerald-400 font-bold font-mono">
              Triggers at ≤ {formatCurrency(effectiveTarget)}
            </span>
          </div>
        )}
      </div>

      {/* Tracking & Alert Control Toggles */}
      <div className="space-y-2.5 pt-1">
        <label className="flex items-start gap-2.5 text-sm font-medium text-slate-300 cursor-pointer">
          <input
            type="checkbox"
            checked={pauseTracking}
            onChange={e => onPauseChange(e.target.checked)}
            className="w-4 h-4 mt-0.5 accent-slate-500 rounded"
          />
          <div>
            <span>Pause price checks</span>
            <span className="block text-xs text-gunmetal-muted">Stops all automated API polling for this flight.</span>
          </div>
        </label>
        <label className="flex items-start gap-2.5 text-sm font-medium text-slate-300 cursor-pointer">
          <input
            type="checkbox"
            checked={disableNotifications}
            onChange={e => onDisableNotificationsChange(e.target.checked)}
            className="w-4 h-4 mt-0.5 accent-slate-500 rounded"
          />
          <div>
            <span>Mute notifications</span>
            <span className="block text-xs text-gunmetal-muted">Continue checking and recording prices in history, but do not dispatch alerts.</span>
          </div>
        </label>
      </div>
    </div>
  );
}