'use client';

import { Pause, Play } from 'lucide-react';
import { getQuotaThresholdLevel, QuotaPauseKey, QuotaSourceItem } from './types';

interface QuotaSourceCardProps {
  source: QuotaSourceItem;
  isLastOdd: boolean;
  onTogglePause: (pauseKey: QuotaPauseKey) => void;
}

const getBarColor = (isPaused: boolean, threshold: 'normal' | 'warning' | 'critical') => {
  if (isPaused) return 'bg-amber-600';
  if (threshold === 'critical') return 'bg-red-500';
  if (threshold === 'warning') return 'bg-yellow-400';
  return 'bg-sky-500';
};

const getCountColor = (isPaused: boolean, threshold: 'normal' | 'warning' | 'critical') => {
  if (isPaused) return 'text-slate-200';
  if (threshold === 'critical') return 'text-red-400';
  if (threshold === 'warning') return 'text-yellow-300';
  return 'text-slate-200';
};

const getRemainingBadgeClass = (
  isExhausted: boolean,
  threshold: 'normal' | 'warning' | 'critical'
) => {
  if (isExhausted) return 'bg-red-950/60 text-red-400 border-red-800/60';
  if (threshold === 'critical') return 'bg-red-950/50 text-red-300 border-red-500/70';
  if (threshold === 'warning') return 'bg-yellow-950/50 text-yellow-300 border-yellow-500/70';
  return 'bg-gunmetal-card text-slate-300 border-gunmetal-border';
};

export default function QuotaSourceCard({
  source,
  isLastOdd,
  onTogglePause,
}: QuotaSourceCardProps) {
  const isLocallyPaused = source.paused === 1;
  const isRemotelyPaused = source.remotePaused === true;
  const isPaused = isLocallyPaused || isRemotelyPaused;
  const hideActionButton = isRemotelyPaused && !isLocallyPaused;

  const hasRollingQuotas =
    source.isScraper &&
    typeof source.hourlyLimit === 'number' &&
    source.hourlyLimit > 0 &&
    typeof source.dailyLimit === 'number' &&
    source.dailyLimit > 0;

  const isUnlimited = !source.isScraper && source.quota === 0;
  const usagePercent = isUnlimited ? 0 : Math.min((source.used / Math.max(1, source.quota)) * 100, 100);
  const threshold = isUnlimited ? 'normal' : getQuotaThresholdLevel(source.used, source.quota);
  const remainingCount = !isUnlimited ? Math.max(0, source.quota - source.used) : null;
  const isExhausted = !isUnlimited && source.used >= source.quota;

  const progressBarColor = getBarColor(isPaused, threshold);
  const usedCountColor = getCountColor(isPaused, threshold);

  // Rolling window metrics for self-hosted scraper
  const hourlyUsed = source.hourlyUsed ?? 0;
  const hourlyLimit = source.hourlyLimit ?? 0;
  const hourlyPercent = hourlyLimit > 0 ? Math.min((hourlyUsed / hourlyLimit) * 100, 100) : 0;
  const hourlyThreshold = getQuotaThresholdLevel(hourlyUsed, hourlyLimit);
  const hourlyRemaining = Math.max(0, hourlyLimit - hourlyUsed);
  const hourlyExhausted = hourlyLimit > 0 && hourlyUsed >= hourlyLimit;

  const dailyUsed = source.dailyUsed ?? 0;
  const dailyLimit = source.dailyLimit ?? 0;
  const dailyPercent = dailyLimit > 0 ? Math.min((dailyUsed / dailyLimit) * 100, 100) : 0;
  const dailyThreshold = getQuotaThresholdLevel(dailyUsed, dailyLimit);
  const dailyRemaining = Math.max(0, dailyLimit - dailyUsed);
  const dailyExhausted = dailyLimit > 0 && dailyUsed >= dailyLimit;

  return (
    <div
      className={`p-3 sm:p-3.5 rounded-md border bg-gunmetal-canvas/60 flex flex-col justify-between gap-2.5 transition-colors ${
        isLastOdd ? 'md:col-span-2' : ''
      } ${isPaused ? 'border-amber-900/40 opacity-75' : 'border-gunmetal-border'}`}
    >
      <div className="flex items-start justify-between gap-2.5">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-bold text-sm text-slate-200 truncate">
              {source.name}
            </span>
            {isPaused && (
              <span
                title={
                  isRemotelyPaused && !isLocallyPaused
                    ? source.remoteStatusReason || 'Paused remotely on FlightSentry-Scraper'
                    : undefined
                }
                className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-950/60 text-amber-400 border border-amber-800/50 flex-shrink-0"
              >
                {isRemotelyPaused && !isLocallyPaused ? 'PAUSED (REMOTE)' : 'PAUSED'}
              </span>
            )}
          </div>

          {!source.isScraper ? (
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 mt-1 text-xs text-gunmetal-muted">
              <span className="font-mono whitespace-nowrap">
                <span className={`${usedCountColor} font-semibold`}>{source.used}</span> /{' '}
                {isUnlimited ? 'Unlimited' : source.quota} queries
              </span>
              {remainingCount !== null && (
                <span
                  className={`px-2 py-0.5 rounded border text-[11px] font-mono font-semibold whitespace-nowrap ${getRemainingBadgeClass(
                    isExhausted,
                    threshold
                  )}`}
                >
                  {isExhausted ? '0 left (Exhausted)' : `${remainingCount} left`}
                </span>
              )}
              {source.quotaMode === 'one-time' ? (
                <span className="text-[11px] text-gunmetal-muted font-mono whitespace-nowrap">
                  One-time credits
                </span>
              ) : source.resetDate ? (
                <span className="text-[11px] text-gunmetal-muted font-mono whitespace-nowrap">
                  Resets: {source.resetDate}
                </span>
              ) : null}
            </div>
          ) : !hasRollingQuotas ? (
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 mt-1 text-xs text-gunmetal-muted">
              <span className="font-mono whitespace-nowrap">
                <span className="text-slate-200 font-semibold">{source.used}</span> tracked queries
              </span>
              <span className="text-[11px] text-gunmetal-muted">
                Rolling limits unavailable
              </span>
            </div>
          ) : null}
        </div>

        {!hideActionButton && (
          <button
            type="button"
            onClick={() => onTogglePause(source.pauseKey)}
            title={isLocallyPaused ? `Resume ${source.name}` : `Pause ${source.name}`}
            aria-label={isLocallyPaused ? `Resume ${source.name}` : `Pause ${source.name}`}
            className={`min-h-[44px] min-w-[44px] px-3 py-2 rounded-md text-xs flex items-center justify-center gap-1.5 font-semibold transition-colors border flex-shrink-0 cursor-pointer ${
              isLocallyPaused
                ? 'bg-amber-950/50 text-amber-400 border-amber-700 hover:bg-amber-900/50'
                : 'bg-gunmetal-card text-gunmetal-muted border-gunmetal-border hover:text-slate-200 hover:border-slate-500'
            }`}
          >
            {isLocallyPaused ? (
              <Play className="w-3.5 h-3.5 flex-shrink-0" />
            ) : (
              <Pause className="w-3.5 h-3.5 flex-shrink-0" />
            )}
            <span className="text-[11px]">{isLocallyPaused ? 'Resume' : 'Pause'}</span>
          </button>
        )}
      </div>

      {source.isScraper && hasRollingQuotas ? (
        <div className="space-y-2 pt-0.5">
          {/* Hourly Rolling Quota Bar */}
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-2 text-[11px] text-gunmetal-muted">
              <span className="font-mono">
                <span className="font-sans font-medium text-slate-300">Hourly:</span>{' '}
                <span className={`${getCountColor(isPaused, hourlyThreshold)} font-semibold`}>
                  {hourlyUsed}
                </span>{' '}
                / {hourlyLimit}
              </span>
              <span
                className={`px-1.5 py-0.2 rounded border text-[10px] font-mono font-semibold ${getRemainingBadgeClass(
                  hourlyExhausted,
                  hourlyThreshold
                )}`}
              >
                {hourlyExhausted ? '0 left' : `${hourlyRemaining} left`}
              </span>
            </div>
            <div className="w-full bg-gunmetal-card border border-gunmetal-border rounded-full h-1.5 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${getBarColor(isPaused, hourlyThreshold)}`}
                style={{ width: `${hourlyPercent}%` }}
              />
            </div>
          </div>

          {/* Daily Rolling Quota Bar */}
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-2 text-[11px] text-gunmetal-muted">
              <span className="font-mono">
                <span className="font-sans font-medium text-slate-300">Daily:</span>{' '}
                <span className={`${getCountColor(isPaused, dailyThreshold)} font-semibold`}>
                  {dailyUsed}
                </span>{' '}
                / {dailyLimit}
              </span>
              <span
                className={`px-1.5 py-0.2 rounded border text-[10px] font-mono font-semibold ${getRemainingBadgeClass(
                  dailyExhausted,
                  dailyThreshold
                )}`}
              >
                {dailyExhausted ? '0 left' : `${dailyRemaining} left`}
              </span>
            </div>
            <div className="w-full bg-gunmetal-card border border-gunmetal-border rounded-full h-1.5 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${getBarColor(isPaused, dailyThreshold)}`}
                style={{ width: `${dailyPercent}%` }}
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="w-full bg-gunmetal-card border border-gunmetal-border rounded-full h-2 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${progressBarColor}`}
            style={{ width: `${isUnlimited ? 100 : usagePercent}%` }}
          />
        </div>
      )}
    </div>
  );
}