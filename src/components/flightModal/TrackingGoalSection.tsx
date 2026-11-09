'use client';

import { Tag, ShoppingBag, Coins, Lock } from 'lucide-react';
import { getCurrencySymbol } from '@/utils/format';

export type TrackingGoal = 'watching' | 'booked';

interface Props {
  trackingGoal: TrackingGoal;
  purchasePrice: string;
  baselinePrice: string;
  departureDate: string;
  currency: string;
  pointsCurrencies: string[];
  fiatCurrency: string;
  minDepartureDate?: string;
  isPurchasePriceLocked?: boolean;
  onGoalChange: (goal: TrackingGoal) => void;
  onPurchaseChange: (val: string) => void;
  onBaselinePriceChange: (val: string) => void;
  onDepartureDateChange: (val: string) => void;
  onCurrencyChange: (val: string) => void;
}

export default function TrackingGoalSection({
  trackingGoal,
  purchasePrice,
  baselinePrice,
  departureDate,
  currency,
  pointsCurrencies,
  fiatCurrency,
  minDepartureDate,
  isPurchasePriceLocked = false,
  onGoalChange,
  onPurchaseChange,
  onBaselinePriceChange,
  onDepartureDateChange,
  onCurrencyChange,
}: Props) {
  const isPoints = pointsCurrencies.includes(currency);

  return (
    <div className="bg-gunmetal-canvas/60 border border-gunmetal-border rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
          Tracking Goal
        </label>
        {/* Currency Selector */}
        <div className="flex items-center gap-1.5">
          <label htmlFor="flightCurrencySelect" className="text-[11px] font-semibold text-gunmetal-muted uppercase tracking-wider">
            Currency:
          </label>
          <select
            id="flightCurrencySelect"
            value={currency}
            onChange={e => onCurrencyChange(e.target.value)}
            className="text-xs font-semibold rounded bg-gunmetal-card text-slate-200 border border-gunmetal-border px-2 py-1 focus:border-slate-500 focus:outline-none cursor-pointer"
          >
            <option value={fiatCurrency}>
              {fiatCurrency} ({getCurrencySymbol(fiatCurrency)})
            </option>
            {pointsCurrencies.map(p => (
              <option key={p} value={p}>
                {p} (Points)
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          disabled={isPurchasePriceLocked}
          onClick={() => onGoalChange('watching')}
          className={`flex items-center justify-center gap-2 p-2.5 rounded-md text-xs font-semibold transition-colors border ${
            trackingGoal === 'watching'
              ? 'bg-gunmetal-border border-slate-400 text-slate-100 shadow-sm'
              : 'bg-gunmetal-canvas text-gunmetal-muted border-gunmetal-border hover:text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed'
          }`}
        >
          <Tag className="w-3.5 h-3.5" />
          <span>Watching</span>
        </button>
        <button
          type="button"
          onClick={() => onGoalChange('booked')}
          className={`flex items-center justify-center gap-2 p-2.5 rounded-md text-xs font-semibold transition-colors border ${
            trackingGoal === 'booked'
              ? 'bg-gunmetal-border border-slate-400 text-slate-100 shadow-sm'
              : 'bg-gunmetal-canvas text-gunmetal-muted border-gunmetal-border hover:text-slate-200'
          }`}
        >
          <ShoppingBag className="w-3.5 h-3.5" />
          <span>Booked</span>
        </button>
      </div>

      {trackingGoal === 'watching' ? (
        isPoints ? (
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                  Baseline / Initial Points *
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-amber-400 font-mono text-xs flex items-center gap-1 font-semibold">
                    <Coins className="w-3.5 h-3.5" /> pts
                  </span>
                  <input
                    required
                    type="number"
                    step="1"
                    min="100"
                    placeholder="e.g. 25000"
                    value={baselinePrice}
                    onChange={e => onBaselinePriceChange(e.target.value)}
                    className="w-full h-10 px-3 py-2 text-sm rounded-md bg-gunmetal-canvas text-slate-200 border border-gunmetal-border focus:border-slate-500 focus:outline-none placeholder-zinc-500 font-mono"
                  />
                </div>
                <p className="text-[11px] text-gunmetal-muted mt-1">
                  Starting award points rate for this flight.
                </p>
              </div>
              <div className="text-xs text-amber-300/90 bg-amber-950/20 border border-amber-900/40 rounded-md p-3 flex items-start gap-2">
                <Coins className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  <strong>Points Flight:</strong> Automated price check searches are paused because flight search engines do not support loyalty mileage programs.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-xs text-slate-300 bg-gunmetal-canvas/80 border border-gunmetal-border/80 rounded-md p-3">
            <p className="font-semibold text-slate-100 mb-1">Automated Initial Fare Detection</p>
            <p className="text-gunmetal-muted leading-relaxed">
              FlightSentry automatically queries your active data sources to detect and establish the initial baseline fare upon save. Alerts trigger whenever future checks drop below that initial fare.
            </p>
          </div>
        )
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                {isPoints ? 'Points Redeemed *' : 'Purchase Price (Amount Paid)'}
              </label>
              {isPurchasePriceLocked && (
                <span className="flex items-center gap-1 text-[11px] font-semibold text-amber-400">
                  <Lock className="w-3 h-3" /> Locked
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className={`font-mono text-sm ${isPoints ? 'text-amber-400 font-semibold flex items-center gap-1 text-xs' : 'text-gunmetal-muted'}`}>
                {isPoints ? <><Coins className="w-3.5 h-3.5" /> pts</> : getCurrencySymbol(currency)}
              </span>
              <input
                required={trackingGoal === 'booked'}
                disabled={isPurchasePriceLocked}
                readOnly={isPurchasePriceLocked}
                type="number"
                step={isPoints ? "1" : "0.01"}
                min="1"
                placeholder={isPoints ? "e.g. 50000" : "e.g. 349.00"}
                value={purchasePrice}
                onChange={e => onPurchaseChange(e.target.value)}
                className={`w-full h-10 px-3 py-2 text-sm rounded-md bg-gunmetal-canvas text-slate-200 border border-gunmetal-border focus:border-slate-500 focus:outline-none placeholder-zinc-500 font-mono ${
                  isPurchasePriceLocked ? 'opacity-60 cursor-not-allowed bg-gunmetal-card border-gunmetal-border/80' : ''
                }`}
              />
            </div>
            <p className="text-[11px] text-gunmetal-muted mt-1">
              {isPurchasePriceLocked
                ? 'Original purchase price is locked. Use the "Log Flight Rebook" button on the dashboard or history modal to record fare adjustments.'
                : isPoints
                ? 'Recorded points paid for this flight.'
                : 'Alerts trigger when fares drop below what you paid.'}
            </p>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
              Departure Date
            </label>
            <input
              required={trackingGoal === 'booked'}
              type="date"
              min={minDepartureDate}
              value={departureDate}
              onChange={e => onDepartureDateChange(e.target.value)}
              className="w-full h-10 px-3 py-2 text-sm rounded-md bg-gunmetal-canvas text-slate-200 border border-gunmetal-border focus:border-slate-500 focus:outline-none [color-scheme:dark]"
            />
            <p className="text-[11px] text-gunmetal-muted mt-1">
              Flight departure calendar date.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}