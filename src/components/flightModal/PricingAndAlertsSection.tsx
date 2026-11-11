'use client';

import { Settings, PriceTrackingDirection } from '@/types';
import { formatCurrency, computeAlertTargets, computeIncreaseAlertTargets, getCurrencySymbol } from '@/utils/format';
import { Bell, TrendingDown, TrendingUp, ArrowUpDown, Coins } from 'lucide-react';
import { TrackingOption, PaymentType } from './useFlightModalState';

interface Props {
  trackingType: TrackingOption;
  paymentType: PaymentType;
  isManual: boolean;
  baselinePrice: string;
  minDropDollar: string;
  minDropPercent: string;
  priceTrackingDirection: PriceTrackingDirection;
  minIncreaseDollar: string;
  minIncreasePercent: string;
  pauseTracking: boolean;
  disableNotifications: boolean;
  defaultSettings: Settings | null;
  currentPrice?: number | null;
  currency: string;
  onBaselinePriceChange: (val: string) => void;
  onDollarChange: (val: string) => void;
  onPercentChange: (val: string) => void;
  onDirectionChange: (dir: PriceTrackingDirection) => void;
  onIncreaseDollarChange: (val: string) => void;
  onIncreasePercentChange: (val: string) => void;
  onPauseChange: (val: boolean) => void;
  onDisableNotificationsChange: (val: boolean) => void;
}

export default function PricingAndAlertsSection({
  trackingType,
  paymentType,
  isManual,
  baselinePrice,
  minDropDollar,
  minDropPercent,
  priceTrackingDirection,
  minIncreaseDollar,
  minIncreasePercent,
  pauseTracking,
  disableNotifications,
  defaultSettings,
  currentPrice,
  currency,
  onBaselinePriceChange,
  onDollarChange,
  onPercentChange,
  onDirectionChange,
  onIncreaseDollarChange,
  onIncreasePercentChange,
  onPauseChange,
  onDisableNotificationsChange,
}: Props) {
  const isPoints = paymentType === 'points';
  const isBooked = trackingType === 'flight_booked';
  const isAutomatedLockedOff = isPoints || isManual;

  const effectiveDropDollar = minDropDollar !== ''
    ? parseFloat(minDropDollar)
    : defaultSettings?.minDropDollar ?? 15;

  const effectiveDropPercent = minDropPercent !== ''
    ? parseFloat(minDropPercent)
    : defaultSettings?.minDropPercent ?? 5;

  const effectiveIncreaseDollar = minIncreaseDollar !== ''
    ? parseFloat(minIncreaseDollar)
    : defaultSettings?.minIncreaseDollar ?? 50;

  const effectiveIncreasePercent = minIncreasePercent !== ''
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

  const activeDirection: PriceTrackingDirection = isBooked ? 'drop' : priceTrackingDirection;

  return (
    <div className="space-y-4">
      {/* 1. Baseline Price for Watching */}
      {!isBooked && (
        <div className="bg-gunmetal-canvas/60 border border-gunmetal-border rounded-xl p-4 sm:p-5 space-y-3">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 block">
            {isPoints ? 'Baseline / Starting Points Rate' : 'Initial Baseline Fare'}
          </label>

          {isPoints ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 max-w-sm">
                <span className="text-amber-400 font-mono text-xs flex items-center gap-1 font-semibold">
                  <Coins className="w-3.5 h-3.5" /> pts
                </span>
                <input
                  type="number"
                  step="1"
                  min="1"
                  placeholder="e.g. 25000"
                  value={baselinePrice}
                  onChange={e => onBaselinePriceChange(e.target.value)}
                  className="w-full h-10 px-3 py-2 text-sm rounded-md bg-gunmetal-canvas text-slate-200 border border-gunmetal-border focus:border-slate-500 focus:outline-none placeholder-zinc-500 font-mono"
                />
              </div>
              <p className="text-[11px] text-gunmetal-muted">
                Starting award mileage price benchmark for this route or flight.
              </p>
            </div>
          ) : isManual ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 max-w-sm">
                <span className="text-gunmetal-muted text-xs font-mono">{getCurrencySymbol(currency)}</span>
                <input
                  required
                  type="number"
                  step="0.01"
                  min="1"
                  placeholder="e.g. 289.00"
                  value={baselinePrice}
                  onChange={e => onBaselinePriceChange(e.target.value)}
                  className="w-full h-10 px-3 py-2 text-sm rounded-md bg-gunmetal-canvas text-slate-200 border border-gunmetal-border focus:border-slate-500 focus:outline-none placeholder-zinc-500 font-mono"
                />
              </div>
              <p className="text-[11px] text-gunmetal-muted">
                Initial starting price entered manually for benchmark calculations.
              </p>
            </div>
          ) : (
            <div className="text-xs text-slate-300 bg-gunmetal-canvas/80 border border-gunmetal-border/80 rounded-lg p-3.5 space-y-1">
              <span className="font-semibold text-slate-100 block">Automated Live Fare Detection</span>
              <p className="text-gunmetal-muted leading-relaxed">
                FlightSentry automatically queries your active flight search APIs to determine and save the current live fare as your initial baseline upon save.
              </p>
            </div>
          )}
        </div>
      )}

      {/* 2. Points Alert Suppression Banner */}
      {isPoints ? (
        <div className="bg-amber-950/20 border border-amber-900/40 rounded-xl p-4 sm:p-5 space-y-2 text-xs text-amber-200/90 leading-relaxed">
          <div className="flex items-center gap-2 font-bold text-amber-100">
            <Coins className="w-4 h-4 text-amber-400" />
            <span>Award Points Flight Configuration</span>
          </div>
          <p>
            Flight search providers and scrapers only index standard cash fares and do not support dynamic loyalty reward charts or award space availability.
          </p>
          <ul className="list-disc list-inside space-y-1 text-gunmetal-muted text-[11px] pt-1">
            <li>Price drop & surge alerts are hidden</li>
            <li>Notification dispatch is disabled</li>
            <li>Automated price polling is locked to disabled</li>
          </ul>
        </div>
      ) : (
        <>
          {/* 3. Cash Alerts: Price Alert Direction */}
          <div className="bg-gunmetal-canvas/60 border border-gunmetal-border rounded-xl p-4 sm:p-5 space-y-3">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
              Price Alert Direction
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => onDirectionChange('drop')}
                className={`min-h-[44px] flex items-center justify-center gap-1.5 p-2 rounded-lg text-xs font-semibold transition-colors border cursor-pointer ${
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
                className={`min-h-[44px] flex items-center justify-center gap-1.5 p-2 rounded-lg text-xs font-semibold transition-colors border cursor-pointer ${
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
                className={`min-h-[44px] flex items-center justify-center gap-1.5 p-2 rounded-lg text-xs font-semibold transition-colors border cursor-pointer ${
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
                Already booked flights exclusively monitor price drops to alert you for rebooking travel savings.
              </p>
            )}
          </div>

          {/* 4. Price Drop Thresholds Card */}
          {(activeDirection === 'drop' || activeDirection === 'both') && (
            <div className="bg-gunmetal-canvas/60 border border-gunmetal-border rounded-xl p-4 sm:p-5 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <TrendingDown className="w-3.5 h-3.5 text-emerald-400" />
                <span>Price Drop Alert Thresholds (Optional Overrides)</span>
              </h3>
              <p className="text-[11px] text-gunmetal-muted">
                Leave blank to inherit global defaults from Settings. Specify custom limits if you only want alerts above specific thresholds.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                </div>
              </div>

              {hasCurrentPrice && dropTargets.effectiveTarget !== null && (
                <div className="pt-2 border-t border-gunmetal-border/70 flex items-center justify-between text-xs">
                  <span className="text-gunmetal-muted font-medium flex items-center gap-1.5">
                    <Bell className="w-3.5 h-3.5 text-emerald-400" />
                    Drop Alert Target:
                  </span>
                  <span className="text-emerald-400 font-bold font-mono">
                    Triggers at ≤ {formatCurrency(dropTargets.effectiveTarget, currency)}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* 5. Price Increase Thresholds Card */}
          {!isBooked && (activeDirection === 'increase' || activeDirection === 'both') && (
            <div className="bg-gunmetal-canvas/60 border border-gunmetal-border rounded-xl p-4 sm:p-5 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-rose-400" />
                <span>Price Increase Alert Thresholds (Optional Overrides)</span>
              </h3>
              <p className="text-[11px] text-gunmetal-muted">
                Alerts you if fares surge above these limits so you can lock in tickets before prices climb higher.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                </div>
              </div>

              {hasCurrentPrice && increaseTargets.effectiveTarget !== null && (
                <div className="pt-2 border-t border-gunmetal-border/70 flex items-center justify-between text-xs">
                  <span className="text-gunmetal-muted font-medium flex items-center gap-1.5">
                    <Bell className="w-3.5 h-3.5 text-rose-400" />
                    Surge Alert Target:
                  </span>
                  <span className="text-rose-400 font-bold font-mono">
                    Triggers at ≥ {formatCurrency(increaseTargets.effectiveTarget, currency)}
                  </span>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* 6. Polling & Notification Toggles */}
      <div className="bg-gunmetal-canvas/60 border border-gunmetal-border rounded-xl p-4 sm:p-5 space-y-3">
        <label className={`flex items-start gap-2.5 text-sm font-medium ${isAutomatedLockedOff ? 'opacity-60 cursor-not-allowed' : 'text-slate-300 cursor-pointer'}`}>
          <input
            type="checkbox"
            disabled={isAutomatedLockedOff}
            checked={isAutomatedLockedOff ? true : pauseTracking}
            onChange={e => onPauseChange(e.target.checked)}
            className="w-4 h-4 mt-0.5 accent-slate-500 rounded disabled:cursor-not-allowed"
          />
          <div>
            <span className="text-slate-200 font-semibold block">Disable flight price checks</span>
            <span className="block text-xs text-gunmetal-muted mt-0.5">
              {isPoints
                ? 'Checked and locked for points flights (search APIs do not index award programs).'
                : isManual
                ? 'Checked and locked in manual tracking mode.'
                : 'Stops all automated background API polling for this flight.'}
            </span>
          </div>
        </label>

        {!isPoints && (
          <label className="flex items-start gap-2.5 text-sm font-medium text-slate-300 cursor-pointer pt-2 border-t border-gunmetal-border/70">
            <input
              type="checkbox"
              checked={disableNotifications}
              onChange={e => onDisableNotificationsChange(e.target.checked)}
              className="w-4 h-4 mt-0.5 accent-slate-500 rounded cursor-pointer"
            />
            <div>
              <span className="text-slate-200 font-semibold block">Mute notifications</span>
              <span className="block text-xs text-gunmetal-muted mt-0.5">
                Continue checking and recording prices in history, but do not dispatch webhook or email alerts.
              </span>
            </div>
          </label>
        )}
      </div>
    </div>
  );
}