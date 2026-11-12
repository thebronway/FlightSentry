'use client';

import { useState } from 'react';
import { ChevronUp, ChevronDown, FileText, Plus } from 'lucide-react';
import { calculateNextResetDate, formatOrdinalDay } from '@/utils/date';
import SettingsSelect from '../shared/SettingsSelect';

export type MeteredProviderKey = 'serpapi' | 'searchapi' | 'hasdata';

interface Props {
  providerKey: MeteredProviderKey;
  providerName: string;
  rankIndex: number;
  totalCount: number;
  isEnabled: boolean;
  apiKey: string;
  monthlyQuota: number;
  resetDay: number;
  nextResetDate: string;
  timezone: string;
  usedCount: number;
  status?: { type: 'success' | 'error'; message: string } | null;
  onToggleEnabled: (checked: boolean) => void;
  onMove: (direction: -1 | 1) => void;
  onOpenLogs: () => void;
  onApiKeyChange: (val: string) => void;
  onApiKeyBlur: () => void;
  onQuotaChange: (val: number) => void;
  onQuotaBlur: () => void;
  onResetDayChange: (day: number, nextReset: string) => void;
  onAdjustUsage?: (
    provider: MeteredProviderKey,
    mode: 'increment' | 'set',
    value: number
  ) => Promise<void>;
}

export default function MeteredProviderCard({
  providerKey,
  providerName,
  rankIndex,
  totalCount,
  isEnabled,
  apiKey,
  monthlyQuota,
  resetDay,
  nextResetDate,
  timezone,
  usedCount,
  status,
  onToggleEnabled,
  onMove,
  onOpenLogs,
  onApiKeyChange,
  onApiKeyBlur,
  onQuotaChange,
  onQuotaBlur,
  onResetDayChange,
  onAdjustUsage,
}: Props) {
  const [usageDraft, setUsageDraft] = useState<string | null>(null);
  const [isAdjusting, setIsAdjusting] = useState(false);

  const remainingCount = monthlyQuota > 0 ? Math.max(0, monthlyQuota - usedCount) : null;
  const isExhausted = monthlyQuota > 0 && usedCount >= monthlyQuota;
  const displayedUsage = usageDraft !== null ? usageDraft : String(usedCount);

  const commitUsageAdjustment = async (mode: 'increment' | 'set', value: number) => {
    if (!onAdjustUsage || isAdjusting) return;
    setIsAdjusting(true);
    try {
      await onAdjustUsage(providerKey, mode, value);
    } finally {
      setIsAdjusting(false);
      setUsageDraft(null);
    }
  };

  const handleCommitManualSet = () => {
    if (usageDraft === null) return;
    const parsedNum = parseInt(usageDraft, 10);
    if (isNaN(parsedNum) || parsedNum < 0 || parsedNum === usedCount) {
      setUsageDraft(null);
      return;
    }
    commitUsageAdjustment('set', parsedNum);
  };

  return (
    <div
      className={`border rounded-lg transition-all ${
        isEnabled
          ? 'bg-gunmetal-canvas/60 border-gunmetal-border shadow-sm'
          : 'bg-gunmetal-canvas/30 border-gunmetal-border/50 opacity-60'
      }`}
    >
      <div className="p-3.5 sm:p-4 border-b border-gunmetal-border/70 flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 min-w-0">
          <span className="w-7 h-7 rounded-md bg-gunmetal-canvas border border-gunmetal-border flex items-center justify-center text-xs font-mono font-bold text-slate-300 flex-shrink-0">
            #{rankIndex + 1}
          </span>
          <label className="min-h-[44px] sm:min-h-0 flex items-center gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isEnabled}
              onChange={e => onToggleEnabled(e.target.checked)}
              className="w-4 h-4 accent-slate-500 rounded"
            />
            <span className={`font-bold text-sm ${isEnabled ? 'text-slate-100' : 'text-gunmetal-muted'}`}>
              {providerName}
            </span>
          </label>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded border bg-sky-950/40 text-sky-400 border-sky-800/40">
            Metered API
          </span>
          {!isEnabled && (
            <span className="text-[10px] uppercase font-bold text-gunmetal-muted bg-gunmetal-canvas px-1.5 py-0.5 rounded border border-gunmetal-border">
              Disabled
            </span>
          )}
          {status && (
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                status.type === 'success'
                  ? 'bg-green-950/60 text-green-400 border-green-800/60'
                  : 'bg-red-950/60 text-red-400 border-red-800/60'
              }`}
            >
              {status.message}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 ml-auto sm:ml-0">
          <button
            type="button"
            onClick={onOpenLogs}
            title={`View recent query logs for ${providerName}`}
            className="min-h-[44px] sm:min-h-[34px] flex items-center gap-1.5 px-3 sm:px-2.5 py-2 sm:py-1 text-xs font-semibold bg-gunmetal-canvas border border-gunmetal-border text-slate-300 hover:text-white hover:bg-gunmetal-border rounded-md shadow-sm transition-colors cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5 text-slate-400" />
            <span>Logs</span>
          </button>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onMove(-1)}
              disabled={rankIndex === 0}
              title="Move up in priority"
              aria-label={`Move ${providerName} up in priority`}
              className="min-h-[44px] min-w-[44px] sm:min-h-[34px] sm:min-w-[34px] flex items-center justify-center p-2 sm:p-1.5 text-slate-300 bg-gunmetal-canvas border border-gunmetal-border hover:bg-gunmetal-border hover:text-white disabled:opacity-20 disabled:pointer-events-none transition-colors rounded-md shadow-sm"
            >
              <ChevronUp className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => onMove(1)}
              disabled={rankIndex === totalCount - 1}
              title="Move down in priority"
              aria-label={`Move ${providerName} down in priority`}
              className="min-h-[44px] min-w-[44px] sm:min-h-[34px] sm:min-w-[34px] flex items-center justify-center p-2 sm:p-1.5 text-slate-300 bg-gunmetal-canvas border border-gunmetal-border hover:bg-gunmetal-border hover:text-white disabled:opacity-20 disabled:pointer-events-none transition-colors rounded-md shadow-sm"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-1">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
              API Key
            </label>
            <input
              type="password"
              disabled={!isEnabled}
              value={apiKey}
              onChange={e => onApiKeyChange(e.target.value)}
              onBlur={onApiKeyBlur}
              onKeyDown={e => {
                if (e.key === 'Enter') e.currentTarget.blur();
              }}
              placeholder="Enter API Key"
              className="w-full min-h-[44px] sm:min-h-[38px] border border-gunmetal-border px-3 py-2 rounded-md bg-gunmetal-canvas text-slate-200 focus:outline-none focus:border-slate-500 disabled:opacity-50 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
              Monthly Quota (0 = Unlimited)
            </label>
            <input
              type="number"
              disabled={!isEnabled}
              value={monthlyQuota}
              onChange={e => onQuotaChange(e.target.value === '' ? 0 : Number(e.target.value))}
              onBlur={onQuotaBlur}
              onKeyDown={e => {
                if (e.key === 'Enter') e.currentTarget.blur();
              }}
              className="w-full min-h-[44px] sm:min-h-[38px] border border-gunmetal-border px-3 py-2 rounded-md bg-gunmetal-canvas text-slate-200 focus:outline-none focus:border-slate-500 disabled:opacity-50 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
              Monthly Reset Day
            </label>
            <SettingsSelect
              compactDesktop
              disabled={!isEnabled}
              value={resetDay}
              onChange={e => {
                const day = parseInt(e.target.value, 10);
                const nextReset = calculateNextResetDate(day, timezone);
                onResetDayChange(day, nextReset);
              }}
            >
              {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                <option key={day} value={day}>
                  {formatOrdinalDay(day)} of every month
                </option>
              ))}
            </SettingsSelect>
            <span className="text-[11px] text-gunmetal-muted block mt-1 font-mono">
              Next reset: {nextResetDate || calculateNextResetDate(1, timezone)}
            </span>
          </div>
        </div>

        {/* Manual Query Usage Tracking & Adjustment */}
        <div className="pt-3 border-t border-gunmetal-border/70 flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div className="space-y-1">
            <label
              htmlFor={`queries-used-${providerKey}`}
              className="block text-xs font-semibold uppercase tracking-wider text-slate-300"
            >
              Queries Used (Manual Adjustment)
            </label>
            <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
              <span className="text-slate-200 font-semibold">
                {usedCount} / {monthlyQuota === 0 ? 'Unlimited' : monthlyQuota} used
              </span>
              {remainingCount !== null && (
                <span
                  className={`px-2 py-0.5 rounded border text-[11px] font-semibold ${
                    isExhausted
                      ? 'bg-red-950/60 text-red-400 border-red-800/60'
                      : 'bg-gunmetal-card text-slate-300 border-gunmetal-border'
                  }`}
                >
                  {isExhausted ? '0 left (Exhausted)' : `${remainingCount} left`}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <input
              id={`queries-used-${providerKey}`}
              type="number"
              min={0}
              step={1}
              disabled={isAdjusting}
              value={displayedUsage}
              onChange={e => setUsageDraft(e.target.value)}
              onBlur={handleCommitManualSet}
              onKeyDown={e => {
                if (e.key === 'Enter') e.currentTarget.blur();
              }}
              aria-label={`${providerName} queries used`}
              className="w-24 sm:w-28 min-h-[44px] sm:min-h-[38px] border border-gunmetal-border px-3 py-2 rounded-md bg-gunmetal-canvas text-slate-200 focus:outline-none focus:border-slate-500 disabled:opacity-50 text-sm font-mono"
            />
            <button
              type="button"
              disabled={isAdjusting}
              onClick={() => commitUsageAdjustment('increment', 1)}
              title={`Log 1 manually used query for ${providerName}`}
              className="flex-1 sm:flex-initial min-h-[44px] sm:min-h-[38px] inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold bg-gunmetal-border hover:bg-slate-700 text-slate-100 border border-slate-500 rounded-md shadow-sm transition-colors disabled:opacity-50 cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5 text-sky-400" />
              <span>Log +1 Query</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}