'use client';

import { Tag, ShoppingBag } from 'lucide-react';
import { getCurrencySymbol } from '@/utils/format';

export type TrackingGoal = 'watching' | 'booked';

interface Props {
  trackingGoal: TrackingGoal;
  purchasePrice: string;
  pnr: string;
  onGoalChange: (goal: TrackingGoal) => void;
  onPurchaseChange: (val: string) => void;
  onPnrChange: (val: string) => void;
}

export default function TrackingGoalSection({
  trackingGoal,
  purchasePrice,
  pnr,
  onGoalChange,
  onPurchaseChange,
  onPnrChange,
}: Props) {
  return (
    <div className="bg-gunmetal-canvas/60 border border-gunmetal-border rounded-lg p-4 space-y-3">
      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
        Tracking Goal
      </label>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => onGoalChange('watching')}
          className={`flex items-center justify-center gap-2 p-2.5 rounded-md text-xs font-semibold transition-colors border ${
            trackingGoal === 'watching'
              ? 'bg-gunmetal-border border-slate-400 text-slate-100 shadow-sm'
              : 'bg-gunmetal-canvas text-gunmetal-muted border-gunmetal-border hover:text-slate-200'
          }`}
        >
          <Tag className="w-3.5 h-3.5" />
          <span>Planning to Book (Watching)</span>
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
          <span>Already Booked (Drop Alerts)</span>
        </button>
      </div>

      {trackingGoal === 'watching' ? (
        <div className="text-xs text-slate-300 bg-gunmetal-canvas/80 border border-gunmetal-border/80 rounded-md p-3">
          <p className="font-semibold text-slate-100 mb-1">Automated Initial Fare Detection</p>
          <p className="text-gunmetal-muted leading-relaxed">
            FlightSentry automatically queries your active data sources to detect and establish the initial baseline fare upon save. Alerts trigger whenever future checks drop below that initial fare.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
              Purchase Price (Amount Paid)
            </label>
            <input
              required={trackingGoal === 'booked'}
              type="number"
              step="0.01"
              min="1"
              placeholder="e.g. 349.00"
              value={purchasePrice}
              onChange={e => onPurchaseChange(e.target.value)}
              className="w-full h-10 px-3 py-2 text-sm rounded-md bg-gunmetal-canvas text-slate-200 border border-gunmetal-border focus:border-slate-500 focus:outline-none placeholder-zinc-500"
            />
            <p className="text-[11px] text-gunmetal-muted mt-1">
              Alerts trigger when fares drop below what you paid.
            </p>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
              PNR / Confirmation Code
            </label>
            <input
              maxLength={8}
              placeholder="e.g. K9XZ4B"
              value={pnr}
              onChange={e => onPnrChange(e.target.value)}
              className="w-full h-10 px-3 py-2 text-sm uppercase rounded-md bg-gunmetal-canvas text-slate-200 border border-gunmetal-border focus:border-slate-500 focus:outline-none placeholder-zinc-500 font-mono"
            />
            <p className="text-[11px] text-gunmetal-muted mt-1">
              Airline booking confirmation reference.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}