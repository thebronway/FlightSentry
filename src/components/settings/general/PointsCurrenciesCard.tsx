'use client';

import { useState, useMemo } from 'react';
import { Coins, Plus, X } from 'lucide-react';
import SettingsCard from '../shared/SettingsCard';

export const POPULAR_POINTS_PRESETS = [
  'AAvantage miles',
  'TrueBlue points',
  'Delta SkyMiles',
  'United MileagePlus',
  'Southwest Rapid Rewards',
];

interface Props {
  pointsList: string[];
  onAdd: (name: string) => Promise<void>;
  onRemove: (name: string) => Promise<void>;
}

export default function PointsCurrenciesCard({ pointsList, onAdd, onRemove }: Props) {
  const [newPointsName, setNewPointsName] = useState('');

  const availablePresets = useMemo(() => {
    return POPULAR_POINTS_PRESETS.filter(
      preset => !pointsList.some(p => p.toLowerCase() === preset.toLowerCase())
    );
  }, [pointsList]);

  const handleSubmit = async () => {
    if (!newPointsName.trim()) return;
    await onAdd(newPointsName);
    setNewPointsName('');
  };

  return (
    <SettingsCard className="space-y-3">
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5 mb-1">
          <Coins className="w-4 h-4 text-amber-400" />
          Points & Miles Currencies
        </label>
        <p className="text-[11px] text-gunmetal-muted mb-2.5">
          Configure award mileage or points currencies (e.g. AAvantage miles, TrueBlue points). Only configured currencies will show when tracking award flights.
        </p>
      </div>

      {/* Existing Points Badges */}
      <div className="flex flex-wrap items-center gap-2">
        {pointsList.map(curr => (
          <span
            key={curr}
            className="min-h-[36px] inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-md text-xs font-semibold bg-gunmetal-card border border-gunmetal-border text-slate-200 shadow-sm"
          >
            <span className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" />
            <span>{curr}</span>
            <button
              type="button"
              onClick={() => onRemove(curr)}
              title={`Remove ${curr}`}
              aria-label={`Remove ${curr}`}
              className="min-w-[28px] min-h-[28px] inline-flex items-center justify-center text-gunmetal-muted hover:text-slate-100 hover:bg-gunmetal-canvas rounded transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </span>
        ))}
        {pointsList.length === 0 && (
          <span className="text-xs text-gunmetal-muted italic">
            No points currencies configured yet.
          </span>
        )}
      </div>

      {/* Add Input & Button */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 max-w-full sm:max-w-md pt-1">
        <input
          type="text"
          placeholder="e.g. AAvantage miles, TrueBlue points"
          value={newPointsName}
          onChange={e => setNewPointsName(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleSubmit();
            }
          }}
          className="flex-1 min-h-[44px] border border-gunmetal-border px-3 py-2 rounded-md bg-gunmetal-canvas text-slate-200 placeholder-zinc-500 focus:outline-none focus:border-slate-500 text-sm"
        />
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!newPointsName.trim()}
          className="min-h-[44px] px-4 py-2 text-xs font-semibold bg-gunmetal-border hover:bg-slate-700 text-slate-100 border border-slate-500 rounded-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add</span>
        </button>
      </div>

      {/* Suggested Quick Presets */}
      {availablePresets.length > 0 && (
        <div className="pt-2 border-t border-gunmetal-border/70">
          <span className="text-[11px] font-semibold text-gunmetal-muted uppercase tracking-wider block mb-1.5">
            Suggested Presets:
          </span>
          <div className="flex flex-wrap items-center gap-1.5">
            {availablePresets.map(preset => (
              <button
                key={preset}
                type="button"
                onClick={() => onAdd(preset)}
                className="min-h-[36px] sm:min-h-[28px] text-xs sm:text-[11px] px-2.5 py-1.5 sm:py-0.5 rounded border border-gunmetal-border bg-gunmetal-canvas hover:bg-gunmetal-border text-slate-300 hover:text-white transition-colors flex items-center gap-1"
              >
                <Plus className="w-3 h-3 text-amber-400" />
                <span>{preset}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </SettingsCard>
  );
}