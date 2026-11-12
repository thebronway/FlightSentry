'use client';

import { Pause } from 'lucide-react';
import Tooltip from '@/components/common/Tooltip';
import {
  getQuotaThresholdLevel,
  QuotaCategorySummary,
  QuotaThresholdLevel,
} from './types';

interface QuotaCategorySummaryPillProps {
  label: 'Metered' | 'Unlimited';
  kind: 'metered' | 'unlimited';
  summary: QuotaCategorySummary;
  isGloballyPaused: boolean;
}

const THRESHOLD_STYLES: Record<
  QuotaThresholdLevel,
  { container: string; label: string; count: string }
> = {
  normal: {
    container: 'bg-gunmetal-canvas border-gunmetal-border text-slate-200',
    label: 'text-gunmetal-muted',
    count: 'text-slate-100 font-semibold',
  },
  warning: {
    container: 'bg-yellow-950/50 border-yellow-500/70 text-yellow-200',
    label: 'text-yellow-300/80',
    count: 'text-yellow-300 font-bold',
  },
  critical: {
    container: 'bg-red-950/50 border-red-500/70 text-red-200',
    label: 'text-red-300/80',
    count: 'text-red-300 font-bold',
  },
};

export default function QuotaCategorySummaryPill({
  label,
  kind,
  summary,
  isGloballyPaused,
}: QuotaCategorySummaryPillProps) {
  if (summary.sources.length === 0) return null;

  const threshold: QuotaThresholdLevel =
    kind === 'metered' && !summary.allPaused
      ? getQuotaThresholdLevel(summary.activeUsed, summary.activeQuota)
      : 'normal';

  const style = summary.allPaused
    ? {
        container: 'bg-amber-950/60 border-amber-500/70 text-amber-200',
        label: 'text-amber-300/80',
        count: 'text-amber-300 font-bold',
      }
    : THRESHOLD_STYLES[threshold];

  const isMeteredExhausted =
    kind === 'metered' &&
    !summary.allPaused &&
    summary.activeQuota > 0 &&
    summary.activeUsed >= summary.activeQuota;

  const tooltipContent = (
    <div className="py-0.5 text-left space-y-1">
      <div className="font-bold text-slate-100 text-[11px]">
        {label} Data Sources ({summary.activeSources.length}/{summary.sources.length} Active)
      </div>
      <div className="space-y-0.5 font-mono text-[10px]">
        {summary.sources.map(src => {
          const paused = isGloballyPaused || src.paused === 1;
          const usageText =
            kind === 'metered'
              ? `${src.used}/${src.quota}`
              : `${src.used} ${src.used === 1 ? 'query' : 'queries'}`;
          return (
            <div
              key={src.key}
              className={`flex items-center justify-between gap-3 ${
                paused ? 'text-amber-300' : 'text-slate-300'
              }`}
            >
              <span className="flex items-center gap-1.5 font-sans">
                <span
                  className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                    paused ? 'bg-amber-400' : 'bg-emerald-400'
                  }`}
                />
                <span>{src.name}</span>
              </span>
              <span>{paused ? `PAUSED (${usageText})` : usageText}</span>
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <Tooltip content={tooltipContent} position="bottom" align="left">
      <span
        tabIndex={0}
        className={`inline-flex items-center flex-wrap gap-1 text-xs font-mono px-2.5 py-1 rounded-md border transition-colors cursor-help ${style.container}`}
      >
        <span className={`${style.label} mr-0.5 font-sans font-medium`}>
          {label}:
        </span>

        {summary.allPaused ? (
          <span className="inline-flex items-center gap-1 font-sans font-bold text-amber-300">
            <Pause className="w-3 h-3 text-amber-400 flex-shrink-0" />
            <span>Paused</span>
          </span>
        ) : kind === 'metered' ? (
          <>
            <span className={style.count}>{summary.activeUsed}</span>
            <span className={style.label}>/</span>
            <span>{summary.activeQuota}</span>
            {isMeteredExhausted && (
              <span className="ml-1 font-semibold text-red-400">
                • 0 left (Exhausted)
              </span>
            )}
          </>
        ) : (
          <>
            <span className={style.count}>{summary.activeUsed}</span>
            <span className={`${style.label} font-sans`}>
              {summary.activeUsed === 1 ? 'query' : 'queries'}
            </span>
          </>
        )}

        {summary.hasPartialPause && (
          <span className="ml-1 inline-flex items-center gap-1 px-1.5 py-0.2 rounded bg-amber-950/70 border border-amber-600/60 text-amber-300 font-sans text-[10px] font-semibold">
            <Pause className="w-2.5 h-2.5 text-amber-400 flex-shrink-0" />
            <span>{summary.pausedSources.length} paused</span>
          </span>
        )}
      </span>
    </Tooltip>
  );
}