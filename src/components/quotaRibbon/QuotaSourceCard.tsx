'use client';

import { Pause, Play } from 'lucide-react';
import { getQuotaThresholdLevel, QuotaPauseKey, QuotaSourceItem } from './types';

interface QuotaSourceCardProps {
  source: QuotaSourceItem;
  isLastOdd: boolean;
  onTogglePause: (pauseKey: QuotaPauseKey) => void;
}

export default function QuotaSourceCard({
  source,
  isLastOdd,
  onTogglePause,
}: QuotaSourceCardProps) {
  const isUnlimited = source.quota === 0;
  const usagePercent = isUnlimited ? 0 : Math.min((source.used / source.quota) * 100, 100);
  const isPaused = source.paused === 1;
  const threshold = isUnlimited ? 'normal' : getQuotaThresholdLevel(source.used, source.quota);
  const remainingCount = !isUnlimited ? Math.max(0, source.quota - source.used) : null;
  const isExhausted = !isUnlimited && source.used >= source.quota;

  const progressBarColor = isPaused
    ? 'bg-amber-600'
    : threshold === 'critical'
    ? 'bg-red-500'
    : threshold === 'warning'
    ? 'bg-yellow-400'
    : 'bg-sky-500';

  const usedCountColor = isPaused
    ? 'text-slate-200'
    : threshold === 'critical'
    ? 'text-red-400'
    : threshold === 'warning'
    ? 'text-yellow-300'
    : 'text-slate-200';

  return (
    <div
      className={`p-3 sm:p-3.5 rounded-md border bg-gunmetal-canvas/60 flex flex-col justify-between gap-2.5 transition-colors ${
        isLastOdd ? 'md:col-span-2' : ''
      } ${isPaused ? 'border-amber-900/40 opacity-75' : 'border-gunmetal-border'}`}
    >
      <div className="flex items-center justify-between gap-2.5">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-bold text-sm text-slate-200 truncate">
              {source.name}
            </span>
            {isPaused && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-950/60 text-amber-400 border border-amber-800/50 flex-shrink-0">
                PAUSED
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 mt-1 text-xs text-gunmetal-muted">
            <span className="font-mono whitespace-nowrap">
              <span className={`${usedCountColor} font-semibold`}>{source.used}</span> /{' '}
              {isUnlimited ? 'Unlimited' : source.quota} queries
            </span>
            {remainingCount !== null && (
              <span
                className={`px-2 py-0.5 rounded border text-[11px] font-mono font-semibold whitespace-nowrap ${
                  isExhausted
                    ? 'bg-red-950/60 text-red-400 border-red-800/60'
                    : threshold === 'critical'
                    ? 'bg-red-950/50 text-red-300 border-red-500/70'
                    : threshold === 'warning'
                    ? 'bg-yellow-950/50 text-yellow-300 border-yellow-500/70'
                    : 'bg-gunmetal-card text-slate-300 border-gunmetal-border'
                }`}
              >
                {isExhausted ? '0 left (Exhausted)' : `${remainingCount} left`}
              </span>
            )}
            {!source.isScraper && source.resetDate && (
              <span className="text-[11px] text-gunmetal-muted font-mono whitespace-nowrap">
                Resets: {source.resetDate}
              </span>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={() => onTogglePause(source.pauseKey)}
          title={isPaused ? `Resume ${source.name}` : `Pause ${source.name}`}
          aria-label={isPaused ? `Resume ${source.name}` : `Pause ${source.name}`}
          className={`min-h-[44px] min-w-[44px] px-3 py-2 rounded-md text-xs flex items-center justify-center gap-1.5 font-semibold transition-colors border flex-shrink-0 cursor-pointer ${
            isPaused
              ? 'bg-amber-950/50 text-amber-400 border-amber-700 hover:bg-amber-900/50'
              : 'bg-gunmetal-card text-gunmetal-muted border-gunmetal-border hover:text-slate-200 hover:border-slate-500'
          }`}
        >
          {isPaused ? (
            <Play className="w-3.5 h-3.5 flex-shrink-0" />
          ) : (
            <Pause className="w-3.5 h-3.5 flex-shrink-0" />
          )}
          <span className="text-[11px]">{isPaused ? 'Resume' : 'Pause'}</span>
        </button>
      </div>

      <div className="w-full bg-gunmetal-card border border-gunmetal-border rounded-full h-2 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${progressBarColor}`}
          style={{ width: `${isUnlimited ? 100 : usagePercent}%` }}
        />
      </div>
    </div>
  );
}