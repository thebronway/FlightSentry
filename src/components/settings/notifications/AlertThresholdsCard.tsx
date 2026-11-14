'use client';

import { useState, useEffect } from 'react';
import { getCurrencySymbol } from '@/utils/format';
import SettingsCard from '../shared/SettingsCard';

interface Props {
  notificationsEnabled: boolean;
  currency?: string;
  minDropDollar: number;
  minDropPercent: number;
  minIncreaseDollar: number;
  minIncreasePercent: number;
  onToggleGlobalNotifications: (checked: boolean) => void;
  onMinDropDollarChange: (val: number) => void;
  onMinDropDollarBlur: () => void;
  onMinDropPercentChange: (val: number) => void;
  onMinDropPercentBlur: () => void;
  onDropThresholdModeSave?: (dollar: number, percent: number) => void;
  onMinIncreaseDollarChange: (val: number) => void;
  onMinIncreaseDollarBlur: () => void;
  onMinIncreasePercentChange: (val: number) => void;
  onMinIncreasePercentBlur: () => void;
  onIncreaseThresholdModeSave?: (dollar: number, percent: number) => void;
}

export default function AlertThresholdsCard({
  notificationsEnabled,
  currency,
  minDropDollar,
  minDropPercent,
  minIncreaseDollar,
  minIncreasePercent,
  onToggleGlobalNotifications,
  onMinDropDollarChange,
  onMinDropDollarBlur,
  onMinDropPercentChange,
  onMinDropPercentBlur,
  onDropThresholdModeSave,
  onMinIncreaseDollarChange,
  onMinIncreaseDollarBlur,
  onMinIncreasePercentChange,
  onMinIncreasePercentBlur,
  onIncreaseThresholdModeSave,
}: Props) {
  const symbol = getCurrencySymbol(currency);

  const resolvedDropUnit: 'dollar' | 'percent' =
    minDropDollar <= 0 && minDropPercent > 0 ? 'percent' : 'dollar';
  const resolvedIncUnit: 'dollar' | 'percent' =
    minIncreaseDollar <= 0 && minIncreasePercent > 0 ? 'percent' : 'dollar';

  const [dropUnit, setDropUnit] = useState<'dollar' | 'percent'>(resolvedDropUnit);
  const [increaseUnit, setIncreaseUnit] = useState<'dollar' | 'percent'>(resolvedIncUnit);

  useEffect(() => {
    setDropUnit(resolvedDropUnit);
  }, [resolvedDropUnit]);

  useEffect(() => {
    setIncreaseUnit(resolvedIncUnit);
  }, [resolvedIncUnit]);

  const handleDropUnitChange = (nextUnit: 'dollar' | 'percent') => {
    if (nextUnit === dropUnit) return;
    setDropUnit(nextUnit);
    if (nextUnit === 'dollar') {
      const nextDollar = minDropDollar > 0 ? minDropDollar : 15;
      onMinDropDollarChange(nextDollar);
      onMinDropPercentChange(0);
      onDropThresholdModeSave?.(nextDollar, 0);
    } else {
      const nextPercent = minDropPercent > 0 ? minDropPercent : 5;
      onMinDropPercentChange(nextPercent);
      onMinDropDollarChange(0);
      onDropThresholdModeSave?.(0, nextPercent);
    }
  };

  const handleIncreaseUnitChange = (nextUnit: 'dollar' | 'percent') => {
    if (nextUnit === increaseUnit) return;
    setIncreaseUnit(nextUnit);
    if (nextUnit === 'dollar') {
      const nextDollar = minIncreaseDollar > 0 ? minIncreaseDollar : 50;
      onMinIncreaseDollarChange(nextDollar);
      onMinIncreasePercentChange(0);
      onIncreaseThresholdModeSave?.(nextDollar, 0);
    } else {
      const nextPercent = minIncreasePercent > 0 ? minIncreasePercent : 10;
      onMinIncreasePercentChange(nextPercent);
      onMinIncreaseDollarChange(0);
      onIncreaseThresholdModeSave?.(0, nextPercent);
    }
  };

  return (
    <SettingsCard className="space-y-4">
      <label
        htmlFor="notificationsEnabled"
        className="min-h-[44px] inline-flex items-center gap-2.5 font-bold text-slate-200 text-sm cursor-pointer select-none"
      >
        <input
          type="checkbox"
          id="notificationsEnabled"
          checked={notificationsEnabled}
          onChange={e => onToggleGlobalNotifications(e.target.checked)}
          className="w-4 h-4 accent-slate-500 rounded cursor-pointer"
        />
        <span>Enable Global Notifications</span>
      </label>

      <div>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Price Drop Threshold (Default)
          </h4>
          <div className="inline-flex rounded-lg bg-gunmetal-canvas border border-gunmetal-border p-0.5">
            <button
              type="button"
              onClick={() => handleDropUnitChange('dollar')}
              className={`min-h-[32px] px-2.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                dropUnit === 'dollar'
                  ? 'bg-gunmetal-border text-emerald-300 border border-emerald-500/60 shadow-sm'
                  : 'text-gunmetal-muted hover:text-slate-200'
              }`}
            >
              {symbol} Amount
            </button>
            <button
              type="button"
              onClick={() => handleDropUnitChange('percent')}
              className={`min-h-[32px] px-2.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                dropUnit === 'percent'
                  ? 'bg-gunmetal-border text-emerald-300 border border-emerald-500/60 shadow-sm'
                  : 'text-gunmetal-muted hover:text-slate-200'
              }`}
            >
              % Percent
            </button>
          </div>
        </div>
        <div className="max-w-sm">
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
            {dropUnit === 'dollar' ? `Min ${symbol} Drop to Alert` : 'Min % Drop to Alert'}
          </label>
          <div className="flex items-center gap-2">
            <span className="text-gunmetal-muted text-xs font-mono">
              {dropUnit === 'dollar' ? symbol : '%'}
            </span>
            {dropUnit === 'dollar' ? (
              <input
                type="number"
                min="0"
                step="1"
                value={minDropDollar}
                onChange={e => onMinDropDollarChange(Number(e.target.value))}
                onBlur={onMinDropDollarBlur}
                onKeyDown={e => {
                  if (e.key === 'Enter') e.currentTarget.blur();
                }}
                className="w-full min-h-[44px] border border-gunmetal-border p-2.5 rounded-md bg-gunmetal-canvas text-slate-200 focus:outline-none focus:border-slate-500 text-sm font-mono"
              />
            ) : (
              <input
                type="number"
                min="0"
                step="0.1"
                value={minDropPercent}
                onChange={e => onMinDropPercentChange(Number(e.target.value))}
                onBlur={onMinDropPercentBlur}
                onKeyDown={e => {
                  if (e.key === 'Enter') e.currentTarget.blur();
                }}
                className="w-full min-h-[44px] border border-gunmetal-border p-2.5 rounded-md bg-gunmetal-canvas text-slate-200 focus:outline-none focus:border-slate-500 text-sm font-mono"
              />
            )}
          </div>
        </div>
      </div>

      <div className="pt-2 border-t border-gunmetal-border/70">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Price Surge Threshold (Default)
          </h4>
          <div className="inline-flex rounded-lg bg-gunmetal-canvas border border-gunmetal-border p-0.5">
            <button
              type="button"
              onClick={() => handleIncreaseUnitChange('dollar')}
              className={`min-h-[32px] px-2.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                increaseUnit === 'dollar'
                  ? 'bg-gunmetal-border text-rose-300 border border-rose-500/60 shadow-sm'
                  : 'text-gunmetal-muted hover:text-slate-200'
              }`}
            >
              {symbol} Amount
            </button>
            <button
              type="button"
              onClick={() => handleIncreaseUnitChange('percent')}
              className={`min-h-[32px] px-2.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                increaseUnit === 'percent'
                  ? 'bg-gunmetal-border text-rose-300 border border-rose-500/60 shadow-sm'
                  : 'text-gunmetal-muted hover:text-slate-200'
              }`}
            >
              % Percent
            </button>
          </div>
        </div>
        <div className="max-w-sm">
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
            {increaseUnit === 'dollar' ? `Min ${symbol} Surge to Alert` : 'Min % Surge to Alert'}
          </label>
          <div className="flex items-center gap-2">
            <span className="text-gunmetal-muted text-xs font-mono">
              {increaseUnit === 'dollar' ? symbol : '%'}
            </span>
            {increaseUnit === 'dollar' ? (
              <input
                type="number"
                min="0"
                step="1"
                value={minIncreaseDollar}
                onChange={e => onMinIncreaseDollarChange(Number(e.target.value))}
                onBlur={onMinIncreaseDollarBlur}
                onKeyDown={e => {
                  if (e.key === 'Enter') e.currentTarget.blur();
                }}
                className="w-full min-h-[44px] border border-gunmetal-border p-2.5 rounded-md bg-gunmetal-canvas text-slate-200 focus:outline-none focus:border-slate-500 text-sm font-mono"
              />
            ) : (
              <input
                type="number"
                min="0"
                step="0.1"
                value={minIncreasePercent}
                onChange={e => onMinIncreasePercentChange(Number(e.target.value))}
                onBlur={onMinIncreasePercentBlur}
                onKeyDown={e => {
                  if (e.key === 'Enter') e.currentTarget.blur();
                }}
                className="w-full min-h-[44px] border border-gunmetal-border p-2.5 rounded-md bg-gunmetal-canvas text-slate-200 focus:outline-none focus:border-slate-500 text-sm font-mono"
              />
            )}
          </div>
        </div>
      </div>
    </SettingsCard>
  );
}