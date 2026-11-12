'use client';

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
  onMinIncreaseDollarChange: (val: number) => void;
  onMinIncreaseDollarBlur: () => void;
  onMinIncreasePercentChange: (val: number) => void;
  onMinIncreasePercentBlur: () => void;
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
  onMinIncreaseDollarChange,
  onMinIncreaseDollarBlur,
  onMinIncreasePercentChange,
  onMinIncreasePercentBlur,
}: Props) {
  const symbol = getCurrencySymbol(currency);

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
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
          Price Drop Thresholds (Default)
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
              Min {symbol} Drop to Alert
            </label>
            <div className="flex items-center gap-2">
              <span className="text-gunmetal-muted text-xs">{symbol}</span>
              <input
                type="number"
                value={minDropDollar}
                onChange={e => onMinDropDollarChange(Number(e.target.value))}
                onBlur={onMinDropDollarBlur}
                onKeyDown={e => {
                  if (e.key === 'Enter') e.currentTarget.blur();
                }}
                className="w-full min-h-[44px] border border-gunmetal-border p-2.5 rounded-md bg-gunmetal-canvas text-slate-200 focus:outline-none focus:border-slate-500 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
              Min % Drop to Alert
            </label>
            <div className="flex items-center gap-2">
              <span className="text-gunmetal-muted text-xs">%</span>
              <input
                type="number"
                value={minDropPercent}
                onChange={e => onMinDropPercentChange(Number(e.target.value))}
                onBlur={onMinDropPercentBlur}
                onKeyDown={e => {
                  if (e.key === 'Enter') e.currentTarget.blur();
                }}
                className="w-full min-h-[44px] border border-gunmetal-border p-2.5 rounded-md bg-gunmetal-canvas text-slate-200 focus:outline-none focus:border-slate-500 text-sm"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="pt-2 border-t border-gunmetal-border/70">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
          Price Surge Thresholds (Default)
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
              Min {symbol} Surge to Alert
            </label>
            <div className="flex items-center gap-2">
              <span className="text-gunmetal-muted text-xs">{symbol}</span>
              <input
                type="number"
                value={minIncreaseDollar}
                onChange={e => onMinIncreaseDollarChange(Number(e.target.value))}
                onBlur={onMinIncreaseDollarBlur}
                onKeyDown={e => {
                  if (e.key === 'Enter') e.currentTarget.blur();
                }}
                className="w-full min-h-[44px] border border-gunmetal-border p-2.5 rounded-md bg-gunmetal-canvas text-slate-200 focus:outline-none focus:border-slate-500 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
              Min % Surge to Alert
            </label>
            <div className="flex items-center gap-2">
              <span className="text-gunmetal-muted text-xs">%</span>
              <input
                type="number"
                value={minIncreasePercent}
                onChange={e => onMinIncreasePercentChange(Number(e.target.value))}
                onBlur={onMinIncreasePercentBlur}
                onKeyDown={e => {
                  if (e.key === 'Enter') e.currentTarget.blur();
                }}
                className="w-full min-h-[44px] border border-gunmetal-border p-2.5 rounded-md bg-gunmetal-canvas text-slate-200 focus:outline-none focus:border-slate-500 text-sm"
              />
            </div>
          </div>
        </div>
      </div>
    </SettingsCard>
  );
}