'use client';

import { GitCommitHorizontal, Info } from 'lucide-react';

interface Props {
  savedMaxStops?: number | null;
  previewOppositeStops: boolean;
  onTogglePreview: (nextPreview: boolean) => void;
}

export default function HistoryStopFilterBar({
  savedMaxStops,
  previewOppositeStops,
  onTogglePreview,
}: Props) {
  const isNonstopSaved = savedMaxStops === 0;

  const savedLabel = isNonstopSaved
    ? 'Non-Stop Only (Saved)'
    : savedMaxStops === 1
    ? '≤ 1 Stop (Saved)'
    : savedMaxStops === 2
    ? '≤ 2 Stops (Saved)'
    : 'All Stops (Saved)';

  const previewLabel = isNonstopSaved ? 'Include Stops' : 'Non-Stop Only';

  return (
    <div className="bg-gunmetal-canvas/70 border border-gunmetal-border rounded-lg p-2.5 sm:px-3.5 sm:py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 inline-flex items-center gap-1.5 select-none">
          <GitCommitHorizontal className="w-3.5 h-3.5 text-sky-400" />
          <span>Stops View:</span>
        </span>

        <div
          role="group"
          aria-label="Toggle stop filter preview"
          className="inline-flex rounded-md bg-gunmetal-card border border-gunmetal-border p-0.5"
        >
          <button
            type="button"
            onClick={() => onTogglePreview(false)}
            className={`min-h-[36px] sm:min-h-[28px] px-2.5 py-1 rounded text-xs font-semibold transition-all cursor-pointer ${
              !previewOppositeStops
                ? 'bg-sky-950/80 text-sky-300 border border-sky-600/70 shadow-sm'
                : 'text-gunmetal-muted hover:text-slate-200 border border-transparent'
            }`}
          >
            {savedLabel}
          </button>
          <button
            type="button"
            onClick={() => onTogglePreview(true)}
            className={`min-h-[36px] sm:min-h-[28px] px-2.5 py-1 rounded text-xs font-semibold transition-all cursor-pointer ${
              previewOppositeStops
                ? 'bg-amber-950/70 text-amber-300 border border-amber-600/70 shadow-sm'
                : 'text-gunmetal-muted hover:text-slate-200 border border-transparent'
            }`}
          >
            {previewLabel}
          </button>
        </div>
      </div>

      {previewOppositeStops ? (
        <div className="inline-flex items-center gap-1.5 text-[11px] text-amber-300/90 bg-amber-950/30 border border-amber-800/50 rounded px-2.5 py-1">
          <Info className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
          <span>
            {isNonstopSaved
              ? 'Previewing all stops. Temporary view only (edit flight to save)'
              : 'Previewing non-stop only. Temporary view only (edit flight to save)'}
          </span>
        </div>
      ) : (
        <span className="text-[11px] text-gunmetal-muted">
          {isNonstopSaved
            ? 'Toggle to compare connecting flights'
            : 'Toggle to isolate non-stop flights'}
        </span>
      )}
    </div>
  );
}