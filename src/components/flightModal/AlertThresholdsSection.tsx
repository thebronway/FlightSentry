'use client';

import { Settings, PriceTrackingDirection } from '@/types';
import { formatCurrency, computeAlertTargets, computeIncreaseAlertTargets, getCurrencySymbol } from '@/utils/format';
import { Bell, TrendingDown, TrendingUp, ArrowUpDown } from 'lucide-react';

interface Props {
  minDropDollar: string;
  minDropPercent: string;
  priceTrackingDirection: PriceTrackingDirection;
  minIncreaseDollar: string;
  minIncreasePercent: string;
  isBooked: boolean;
  pauseTracking: boolean;
  disableNotifications: boolean;
  defaultSettings: Settings | null;
  currentPrice?: number | null;
  onDollarChange: (val: string) => void;
  onPercentChange: (val: string) => void;
  onDirectionChange: (dir: PriceTrackingDirection) => void;
  onIncreaseDollarChange: (val: string) => void;
  onIncreasePercentChange: (val: string) => void;
  onPauseChange: (val: boolean) => void;
  onDisableNotificationsChange: (val: boolean) => void;
}

export default function AlertThresholdsSection({
  minDropDollar,
  minDropPercent,
  priceTrackingDirection,
  minIncreaseDollar,
  minIncreasePercent,
  isBooked,
  pauseTracking,
  disableNotifications,
  defaultSettings,
  currentPrice,
  onDollarChange,
  onPercentChange,
  onDirectionChange,
  onIncreaseDollarChange,
  onIncreasePercentChange,
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

  const effectiveIncreaseDollar =
    minIncreaseDollar !== ''
      ? parseFloat(minIncreaseDollar)
      : defaultSettings?.minIncreaseDollar ?? 50;

  const effectiveIncreasePercent =
    minIncreasePercent !== ''
      ? parseFloat(minIncreasePercent)
      : defaultSettings?.minIncreasePercent ?? 10;

  const hasCurrentPrice = typeof currentPrice === 'number' && currentPrice > 0;

  const dropTargets = computeAlertTargets(
    currentPrice || 0,
    !isNaN(effectiveDropDollar) ? effectiveDropDollar : null,
    !isNaN(effectiveDropPercent) ? effectiveDropPercent : null
  );

  const increaseTargets = computeIncreaseAlertTargets(
    currentPrice || 0,
    !isNaN(effectiveIncreaseDollar) ? effectiveIncreaseDollar : null,
    !isNaN(effectiveIncreasePercent) ? effectiveIncreasePercent : null
  );

  // If booked, direction is strictly drop-only
  const activeDirection: PriceTrackingDirection = isBooked ? 'drop' : priceTrackingDirection;

  return (
    <div className="space-y-4">
      {/* Tracking Direction Selector */}
      <div className="bg-gunmetal-canvas/60 border border-gunmetal-border rounded-lg p-4 space-y-3">
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
          Price Alert Direction
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => onDirectionChange('drop')}
            className={`flex items-center justify-center gap-1.5 p-2 rounded-md text-xs font-semibold transition-colors border ${
              activeDirection === 'drop'
                ? 'bg-gunmetal-border border-emerald-500 text-emerald-300 shadow-sm'
                : 'bg-gunmetal-canvas text-gunmetal-muted border-gunmetal-border hover:text-slate-200'
            }`}
          >
            <TrendingDown className="w-3.5 h-3.5" />
            <span>Drops Only</span>
          </button>
          <button
            type="button"
            disabled={isBooked}
            onClick={() => onDirectionChange('increase')}
            className={`flex items-center justify-center gap-1.5 p-2 rounded-md text-xs font-semibold transition-colors border ${
              activeDirection === 'increase'
                ? 'bg-gunmetal-border border-rose-500 text-rose-300 shadow-sm'
                : 'bg-gunmetal-canvas text-gunmetal-muted border-gunmetal-border hover:text-slate-200 disabled:opacity-40 disabled:pointer-events-none'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Increases Only</span>
          </button>
          <button
            type="button"
            disabled={isBooked}
            onClick={() => onDirectionChange('both')}
            className={`flex items-center justify-center gap-1.5 p-2 rounded-md text-xs font-semibold transition-colors border ${
              activeDirection === 'both'
                ? 'bg-gunmetal-border border-sky-400 text-sky-300 shadow-sm'
                : 'bg-gunmetal-canvas text-gunmetal-muted border-gunmetal-border hover:text-slate-200 disabled:opacity-40 disabled:pointer-events-none'
            }`}
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
            <span>Both (Drops & Surges)</span>
          </button>
        </div>

        {isBooked && (
          <p className="text-[11px] text-gunmetal-muted italic">
            Already booked flights exclusively monitor price drops for rebooking savings.
          </p>
        )}
      </div>

      {/* Price Drop Thresholds Card */}
      {(activeDirection === 'drop' || activeDirection === 'both') && (
        <div className="bg-gunmetal-canvas/60 border border-gunmetal-border rounded-lg p-4 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
            <TrendingDown className="w-3.5 h-3.5 text-emerald-400" />
            <span>Price Drop Alert Thresholds (Optional Overrides)</span>
          </h3>
          <p className="text-[11px] text-gunmetal-muted">
            Leave blank to inherit global defaults from Settings. Specify a custom amount or percentage if you only want alerts above specific thresholds for this flight.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Min {getCurrencySymbol(defaultSettings?.currency)} Drop to Alert
              </label>
              <div className="flex items-center gap-2">
                <span className="text-gunmetal-muted text-xs">{getCurrencySymbol(defaultSettings?.currency)}</span>
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
              {hasCurrentPrice && dropTargets.dollarTarget !== null && (
                <p className="text-[11px] text-sky-400 mt-1 font-mono">
                  Triggers at ≤ {formatCurrency(dropTargets.dollarTarget)} ({formatCurrency(currentPrice!)} - {formatCurrency(effectiveDropDollar)})
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
              {hasCurrentPrice && dropTargets.percentTarget !== null && (
                <p className="text-[11px] text-sky-400 mt-1 font-mono">
                  Triggers at ≤ {formatCurrency(dropTargets.percentTarget)} ({formatCurrency(currentPrice!)} - {effectiveDropPercent}%)
                </p>
              )}
            </div>
          </div>

          {hasCurrentPrice && dropTargets.effectiveTarget !== null && (
            <div className="pt-2 border-t border-gunmetal-border/70 flex items-center justify-between text-xs">
              <span className="text-gunmetal-muted font-medium flex items-center gap-1.5">
                <Bell className="w-3.5 h-3.5 text-emerald-400" />
                Drop Alert Target:
              </span>
              <span className="text-emerald-400 font-bold font-mono">
                Triggers at ≤ {formatCurrency(dropTargets.effectiveTarget)}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Price Surge/Increase Thresholds Card */}
      {!isBooked && (activeDirection === 'increase' || activeDirection === 'both') && (
        <div className="bg-gunmetal-canvas/60 border border-gunmetal-border rounded-lg p-4 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-rose-400" />
            <span>Price Increase Alert Thresholds (Optional Overrides)</span>
          </h3>
          <p className="text-[11px] text-gunmetal-muted">
            Alerts you if fares surge above these limits so you can lock in tickets before prices rise further.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Min {getCurrencySymbol(defaultSettings?.currency)} Surge to Alert
              </label>
              <div className="flex items-center gap-2">
                <span className="text-gunmetal-muted text-xs">{getCurrencySymbol(defaultSettings?.currency)}</span>
                <input
                  type="number"
                  step="1"
                  min="0"
                  placeholder={defaultSettings?.minIncreaseDollar != null ? String(defaultSettings.minIncreaseDollar) : '50'}
                  value={minIncreaseDollar}
                  onChange={e => onIncreaseDollarChange(e.target.value)}
                  className="w-full h-10 px-3 py-2 text-sm rounded-md bg-gunmetal-canvas text-slate-200 border border-gunmetal-border focus:border-slate-500 focus:outline-none placeholder-zinc-500"
                />
              </div>
              {hasCurrentPrice && increaseTargets.dollarTarget !== null && (
                <p className="text-[11px] text-rose-400 mt-1 font-mono">
                  Triggers at ≥ {formatCurrency(increaseTargets.dollarTarget)} ({formatCurrency(currentPrice!)} + {formatCurrency(effectiveIncreaseDollar)})
                </p>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Min % Surge to Alert
              </label>
              <div className="flex items-center gap-2">
                <span className="text-gunmetal-muted text-xs">%</span>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  placeholder={defaultSettings?.minIncreasePercent != null ? String(defaultSettings.minIncreasePercent) : '10'}
                  value={minIncreasePercent}
                  onChange={e => onIncreasePercentChange(e.target.value)}
                  className="w-full h-10 px-3 py-2 text-sm rounded-md bg-gunmetal-canvas text-slate-200 border border-gunmetal-border focus:border-slate-500 focus:outline-none placeholder-zinc-500"
                />
              </div>
              {hasCurrentPrice && increaseTargets.percentTarget !== null && (
                <p className="text-[11px] text-rose-400 mt-1 font-mono">
                  Triggers at ≥ {formatCurrency(increaseTargets.percentTarget)} ({formatCurrency(currentPrice!)} + {effectiveIncreasePercent}%)
                </p>
              )}
            </div>
          </div>

          {hasCurrentPrice && increaseTargets.effectiveTarget !== null && (
            <div className="pt-2 border-t border-gunmetal-border/70 flex items-center justify-between text-xs">
              <span className="text-gunmetal-muted font-medium flex items-center gap-1.5">
                <Bell className="w-3.5 h-3.5 text-rose-400" />
                Surge Alert Target:
              </span>
              <span className="text-rose-400 font-bold font-mono">
                Triggers at ≥ {formatCurrency(increaseTargets.effectiveTarget)}
              </span>
            </div>
          )}
        </div>
      )}

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