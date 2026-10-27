'use client';

import { Tag, ShoppingBag } from 'lucide-react';

export type TrackingGoal = 'watching' | 'booked';

interface Props {
  trackingGoal: TrackingGoal;
  baselinePrice: string;
  purchasePrice: string;
  pnr: string;
  onGoalChange: (goal: TrackingGoal) => void;
  onBaselineChange: (val: string) => void;
  onPurchaseChange: (val: string) => void;
  onPnrChange: (val: string) => void;
}

export default function TrackingGoalSection({
  trackingGoal,
  baselinePrice,
  purchasePrice,
  pnr,
  onGoalChange,
  onBaselineChange,
  onPurchaseChange,
  onPnrChange,
}: Props) {
  return (
    <div className="border border-gunmetal-border rounded-lg p-3 bg-gunmetal-canvas/30 space-y-3">
      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
        Tracking Goal
      </label>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => onGoalChange('watching')}
          className={`flex items-center justify-center gap-2 p-2 rounded-md text-xs font-semibold transition-colors border ${
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
          className={`flex items-center justify-center gap-2 p-2 rounded-md text-xs font-semibold transition-colors border ${
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
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
            Initial Baseline Price ($)
          </label>
          <input
            type="number"
            step="0.01"
            min="1"
            placeholder="Leave blank to auto-detect from live fare on save"
            value={baselinePrice}
            onChange={e => onBaselineChange(e.target.value)}
            className="w-full h-10 px-3 py-2 text-sm rounded-md bg-gunmetal-canvas text-slate-200 border border-gunmetal-border focus:border-slate-500 focus:outline-none placeholder-zinc-500"
          />
          <p className="text-[11px] text-gunmetal-muted mt-1">
            Alerts trigger when the live price drops below this initial tracked fare[cite: 1].
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
              Purchase Price ($ Paid)
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
              Alerts trigger when fares drop below what you paid[cite: 1].
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
              className="w-full h-10 px-3 py-2 text-sm uppercase rounded-md bg-gunmetal-canvas text-slate-200 border border-gunmetal-border focus:border-slate-500 focus:outline-none placeholder-zinc-500"
            />
            <p className="text-[11px] text-gunmetal-muted mt-1">
              Airline booking confirmation reference[cite: 1].
            </p>
          </div>
        </div>
      )}
    </div>
  );
}