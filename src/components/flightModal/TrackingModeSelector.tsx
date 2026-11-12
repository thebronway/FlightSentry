'use client';

import { PlaneTakeoff, Compass, ShoppingBag, Coins, DollarSign, Wrench, Lock } from 'lucide-react';
import { TrackingOption, PaymentType } from './useFlightModalState';
import { getCurrencySymbol } from '@/utils/format';

interface Props {
  trackingType: TrackingOption;
  paymentType: PaymentType;
  isManual: boolean;
  currency: string;
  fiatCurrency: string;
  pointsCurrencies: string[];
  isInitialFlight: boolean;
  automatedUnavailable?: boolean;
  onTrackingTypeChange: (type: TrackingOption) => void;
  onPaymentTypeChange: (type: PaymentType) => void;
  onCurrencyChange: (currency: string) => void;
  onManualChange: (isManual: boolean) => void;
}

export default function TrackingModeSelector({
  trackingType,
  paymentType,
  isManual,
  currency,
  fiatCurrency,
  pointsCurrencies,
  isInitialFlight,
  automatedUnavailable = false,
  onTrackingTypeChange,
  onPaymentTypeChange,
  onCurrencyChange,
  onManualChange,
}: Props) {
  return (
    <div className="bg-gunmetal-canvas/60 border border-gunmetal-border rounded-xl p-4 sm:p-5 space-y-4">
      {/* Three Main Options */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
            Tracking Mode
          </label>
          {isInitialFlight && (
            <span className="flex items-center gap-1 text-[11px] font-semibold text-amber-400 bg-amber-950/40 border border-amber-800/40 px-2 py-0.5 rounded">
              <Lock className="w-3 h-3" /> Mode Locked
            </span>
          )}
        </div>

        {isInitialFlight ? (
          <div className="p-3 rounded-lg border border-gunmetal-border bg-gunmetal-canvas/80 text-xs text-slate-300 flex items-center justify-between">
            <span className="font-semibold text-slate-200">
              {trackingType === 'route_watch'
                ? 'Watching a Route (Origin to Destination)'
                : trackingType === 'flight_watch'
                ? 'Watching a Flight (Specific Flight Number)'
                : 'Booked Flight (Price Paid Benchmark)'}
            </span>
            <span className="text-gunmetal-muted text-[11px]">
              Tracking mode cannot be switched while editing an existing flight.
            </span>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <button
              type="button"
              onClick={() => onTrackingTypeChange('route_watch')}
              className={`min-h-[48px] p-3 rounded-lg border text-left transition-all flex items-start gap-3 cursor-pointer ${
                trackingType === 'route_watch'
                  ? 'bg-slate-800/70 border-slate-400 text-slate-100 ring-1 ring-slate-400/40 shadow-sm'
                  : 'bg-gunmetal-canvas/50 border-gunmetal-border text-gunmetal-muted hover:text-slate-200 hover:border-slate-600'
              }`}
            >
              <PlaneTakeoff className="w-5 h-5 flex-shrink-0 text-sky-400 mt-0.5" />
              <div>
                <span className="font-bold text-xs sm:text-sm text-slate-200 block">
                  Watching Route
                </span>
                <span className="text-[11px] text-gunmetal-muted block mt-0.5 leading-snug">
                  Monitor city pair for lowest fare
                </span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => onTrackingTypeChange('flight_watch')}
              className={`min-h-[48px] p-3 rounded-lg border text-left transition-all flex items-start gap-3 cursor-pointer ${
                trackingType === 'flight_watch'
                  ? 'bg-slate-800/70 border-slate-400 text-slate-100 ring-1 ring-slate-400/40 shadow-sm'
                  : 'bg-gunmetal-canvas/50 border-gunmetal-border text-gunmetal-muted hover:text-slate-200 hover:border-slate-600'
              }`}
            >
              <Compass className="w-5 h-5 flex-shrink-0 text-sky-400 mt-0.5" />
              <div>
                <span className="font-bold text-xs sm:text-sm text-slate-200 block">
                  Watching Flight
                </span>
                <span className="text-[11px] text-gunmetal-muted block mt-0.5 leading-snug">
                  Track specific carrier & flight number
                </span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => onTrackingTypeChange('flight_booked')}
              className={`min-h-[48px] p-3 rounded-lg border text-left transition-all flex items-start gap-3 cursor-pointer ${
                trackingType === 'flight_booked'
                  ? 'bg-emerald-950/40 border-emerald-500 text-slate-100 ring-1 ring-emerald-500/40 shadow-sm'
                  : 'bg-gunmetal-canvas/50 border-gunmetal-border text-gunmetal-muted hover:text-slate-200 hover:border-slate-600'
              }`}
            >
              <ShoppingBag className="w-5 h-5 flex-shrink-0 text-emerald-400 mt-0.5" />
              <div>
                <span className="font-bold text-xs sm:text-sm text-slate-200 block">
                  Booked Flight
                </span>
                <span className="text-[11px] text-gunmetal-muted block mt-0.5 leading-snug">
                  Log purchase & track rebook credits
                </span>
              </div>
            </button>
          </div>
        )}
      </div>

      {/* Payment & Currency Selector + Manual Tracking Toggle */}
      <div className="pt-3 border-t border-gunmetal-border/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Payment Currency Toggle (Cash vs Points) */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center rounded-lg bg-gunmetal-canvas border border-gunmetal-border p-0.5">
            <button
              type="button"
              onClick={() => onPaymentTypeChange('cash')}
              className={`min-h-[36px] px-3 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                paymentType === 'cash'
                  ? 'bg-gunmetal-border text-slate-100 shadow-sm border border-slate-500'
                  : 'text-gunmetal-muted hover:text-slate-300'
              }`}
            >
              <DollarSign className="w-3.5 h-3.5" />
              <span>Cash Fare</span>
            </button>
            <button
              type="button"
              onClick={() => onPaymentTypeChange('points')}
              className={`min-h-[36px] px-3 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                paymentType === 'points'
                  ? 'bg-amber-950/60 text-amber-300 shadow-sm border border-amber-700/60'
                  : 'text-gunmetal-muted hover:text-slate-300'
              }`}
            >
              <Coins className="w-3.5 h-3.5 text-amber-400" />
              <span>Points / Miles</span>
            </button>
          </div>

          {/* Currency dropdown */}
          <div className="flex items-center gap-1.5">
            <select
              value={currency}
              onChange={e => onCurrencyChange(e.target.value)}
              aria-label="Currency"
              className="min-h-[36px] text-xs font-semibold rounded-md bg-gunmetal-canvas text-slate-200 border border-gunmetal-border px-2.5 py-1.5 focus:border-slate-500 focus:outline-none cursor-pointer"
            >
              <option value={fiatCurrency}>
                {fiatCurrency} ({getCurrencySymbol(fiatCurrency)})
              </option>
              {pointsCurrencies.length === 0 && (
                <option value="PTS">PTS (Points)</option>
              )}
              {pointsCurrencies.map(p => (
                <option key={p} value={p}>
                  {p} (Points)
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Manual Tracking Mode Toggle */}
        <div className="flex items-center">
          <label className={`flex items-center gap-2 select-none px-2.5 py-1.5 rounded-lg border transition-colors ${
            paymentType === 'points'
              ? 'border-transparent opacity-60 cursor-not-allowed'
              : automatedUnavailable && !isManual
              ? 'border-amber-600/70 bg-amber-950/30 cursor-pointer'
              : 'border-transparent cursor-pointer'
          }`}>
            <input
              type="checkbox"
              disabled={paymentType === 'points'}
              checked={paymentType === 'points' ? true : isManual}
              onChange={e => onManualChange(e.target.checked)}
              className="w-4 h-4 accent-slate-500 rounded disabled:cursor-not-allowed"
            />
            <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Wrench className="w-3.5 h-3.5 text-slate-400" />
              <span>Manual Tracking Mode</span>
              {paymentType === 'points' ? (
                <span className="text-[10px] text-amber-400 font-normal">
                  (Locked for Points)
                </span>
              ) : automatedUnavailable && !isManual ? (
                <span className="text-[10px] text-amber-300 font-semibold">
                  (Required while paused)
                </span>
              ) : null}
            </span>
          </label>
        </div>
      </div>

      {(isManual || paymentType === 'points') && (
        <div className="p-2.5 rounded-lg bg-gunmetal-card/80 border border-gunmetal-border text-[11px] text-slate-300 flex items-center gap-2 animate-in fade-in duration-150">
          <Wrench className="w-4 h-4 text-sky-400 flex-shrink-0" />
          <span>
            <strong>Manual Mode Active:</strong> {paymentType === 'points' ? 'Points flights cannot be searched via Google Flights and are tracked manually.' : 'Automated scraper searches are disabled. You can log price points or updates manually from the history modal at any time.'}
          </span>
        </div>
      )}
    </div>
  );
}