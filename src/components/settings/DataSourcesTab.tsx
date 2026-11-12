'use client';

import { useState } from 'react';
import { Settings } from '@/types';
import { ChevronUp, ChevronDown, FileText, Plus } from 'lucide-react';
import { calculateNextResetDate, formatOrdinalDay } from '@/utils/date';
import DataSourceLogsModal from './DataSourceLogsModal';

type MeteredProviderKey = 'serpapi' | 'searchapi' | 'hasdata';

interface Props {
  settings: Settings;
  onChange: (settings: Settings) => void;
  providerStatus: Record<string, { type: 'success' | 'error'; message: string } | null>;
  onAutoSave?: (
    updatedSettings: Settings,
    statusKey: string,
    pillMessage?: string,
    toastMessage?: string
  ) => Promise<void>;
  onAdjustUsage?: (
    provider: MeteredProviderKey,
    mode: 'increment' | 'set',
    value: number
  ) => Promise<void>;
}

export default function DataSourcesTab({
  settings,
  onChange,
  providerStatus,
  onAutoSave,
  onAdjustUsage,
}: Props) {
  const meteredKeys: MeteredProviderKey[] = ['serpapi', 'searchapi', 'hasdata'];
  const meteredOrder = (settings.dataSourceStrategy || 'serpapi,searchapi,hasdata')
    .split(',')
    .map(s => s.trim())
    .filter((k): k is MeteredProviderKey => meteredKeys.includes(k as MeteredProviderKey));

  meteredKeys.forEach(k => {
    if (!meteredOrder.includes(k)) meteredOrder.push(k);
  });

  const nameMap: Record<string, string> = {
    serpapi: 'SerpAPI',
    searchapi: 'SearchApi.io',
    hasdata: 'HasData',
    fastflights: 'Fast-Flights (Scraper)',
    'flight-route-lookup': 'Flight Route Lookup',
  };

  const move = async (index: number, dir: number) => {
    const newOrder = [...meteredOrder];
    const temp = newOrder[index];
    newOrder[index] = newOrder[index + dir];
    newOrder[index + dir] = temp;
    // Programmatically keep fastflights pinned at the end of the strategy order
    const updatedStrategy = [...newOrder, 'fastflights'].join(',');
    const updated = { ...settings, dataSourceStrategy: updatedStrategy };
    onChange(updated);
    if (onAutoSave) {
      await onAutoSave(updated, '', '', 'Metered API priority order updated');
    }
  };

  const [selectedLogsProvider, setSelectedLogsProvider] = useState<string | null>(null);
  const [usageDrafts, setUsageDrafts] = useState<Record<string, string>>({});
  const [adjustingProvider, setAdjustingProvider] = useState<string | null>(null);

  const commitUsageAdjustment = async (
    provider: MeteredProviderKey,
    mode: 'increment' | 'set',
    value: number
  ) => {
    if (!onAdjustUsage || adjustingProvider === provider) return;
    setAdjustingProvider(provider);
    try {
      await onAdjustUsage(provider, mode, value);
    } finally {
      setAdjustingProvider(null);
      setUsageDrafts(prev => {
        const next = { ...prev };
        delete next[provider];
        return next;
      });
    }
  };

  const toggleEnabled = async (key: string, checked: boolean) => {
    const val = checked ? 1 : 0;
    const updated = { ...settings };
    if (key === 'serpapi') updated.serpApiEnabled = val;
    if (key === 'searchapi') updated.searchApiEnabled = val;
    if (key === 'hasdata') updated.hasdataEnabled = val;
    if (key === 'fastflights') updated.fastFlightsEnabled = val;
    onChange(updated);
    if (onAutoSave) {
      const providerLabel = nameMap[key] || key;
      await onAutoSave(updated, key, 'Saved!', `${providerLabel} ${checked ? 'enabled' : 'disabled'}`);
    }
  };

  return (
    <div className="space-y-6 pt-2">
      <div className="bg-gunmetal-canvas/60 border border-gunmetal-border p-3.5 rounded-lg text-xs text-slate-300">
        <p className="font-semibold text-slate-200 mb-0.5">Data Sources & Query Routing</p>
        Configure flight search providers, monthly query allowances, and routing strategies. Flight checks dynamically query active sources based on priority order and configured fallback behavior.
      </div>

      {/* Query Routing Strategy Selector */}
      <div className="bg-gunmetal-canvas/60 border border-gunmetal-border p-4 rounded-lg space-y-2">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-semibold text-slate-200">Query Routing Strategy</label>
          {providerStatus['strategy'] && (
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                providerStatus['strategy']?.type === 'success'
                  ? 'bg-green-950/60 text-green-400 border-green-800/60'
                  : 'bg-red-950/60 text-red-400 border-red-800/60'
              }`}
            >
              {providerStatus['strategy']?.message}
            </span>
          )}
        </div>
        <div className="relative">
          <select
            value={settings.fallbackStrategyMode}
            onChange={async e => {
              const newMode = e.target.value;
              const updated = { ...settings, fallbackStrategyMode: newMode };
              onChange(updated);
              if (onAutoSave) {
                const modeLabels: Record<string, string> = {
                  'sequential-query': 'Round-Robin',
                  'balanced-usage': 'Balanced Usage',
                  'exhaust-quota': 'Exhaust Quota',
                };
                await onAutoSave(
                  updated,
                  'strategy',
                  'Saved!',
                  `Routing strategy set to ${modeLabels[newMode] || newMode}`
                );
              }
            }}
            className="w-full min-h-[44px] appearance-none border border-gunmetal-border p-2.5 pr-10 rounded-md bg-gunmetal-canvas text-slate-200 focus:outline-none focus:border-slate-500 text-sm cursor-pointer"
          >
            <option value="sequential-query">Round-Robin (Atomic Rotation)</option>
            <option value="balanced-usage">Balanced Usage (% Quota Consumed)</option>
            <option value="exhaust-quota">Exhaust Quota (Priority Failover)</option>
          </select>
          <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gunmetal-muted pointer-events-none" />
        </div>
        <div className="space-y-1 text-xs text-gunmetal-muted pt-1">
          <p>
            <strong className="text-slate-300">Round-Robin:</strong> Evenly alternates checks across active data sources to balance quota consumption using an atomic database pointer.
          </p>
          <p>
            <strong className="text-slate-300">Balanced Usage:</strong> Dynamically directs queries to the active provider with the lowest percentage of monthly quota consumed.
          </p>
          <p>
            <strong className="text-slate-300">Exhaust Quota:</strong> Exclusively queries the top-priority active provider until its monthly allowance is exhausted, then falls back to the next provider.
          </p>
        </div>
        <p className="text-[11px] text-amber-400 font-medium pt-1">
          Priority Rule: Any active unmetered data source will automatically be queried first before any metered datasource, regardless of Query Routing Strategy.
        </p>
      </div>

      {/* Reorderable Metered API Provider Stack */}
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-bold text-slate-200">Metered API Priority Order</h3>
          <p className="text-xs text-gunmetal-muted">
            Use the chevrons on each card to adjust priority rank across metered API providers. Inactive providers remain in their fixed rank position but are skipped at runtime.
          </p>
        </div>

        {meteredOrder.map((key, index) => {
          const isEnabled = key === 'serpapi'
            ? settings.serpApiEnabled === 1
            : key === 'searchapi'
            ? settings.searchApiEnabled === 1
            : settings.hasdataEnabled === 1;

          return (
            <div
              key={key}
              className={`border rounded-lg transition-all ${
                isEnabled
                  ? 'bg-gunmetal-canvas/60 border-gunmetal-border shadow-sm'
                  : 'bg-gunmetal-canvas/30 border-gunmetal-border/50 opacity-60'
              }`}
            >
              <div className="p-3.5 sm:p-4 border-b border-gunmetal-border/70 flex flex-wrap items-center justify-between gap-2.5">
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 min-w-0">
                  <span className="w-7 h-7 rounded-md bg-gunmetal-canvas border border-gunmetal-border flex items-center justify-center text-xs font-mono font-bold text-slate-300 flex-shrink-0">
                    #{index + 1}
                  </span>
                  <label className="min-h-[44px] sm:min-h-0 flex items-center gap-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={isEnabled}
                      onChange={e => toggleEnabled(key, e.target.checked)}
                      className="w-4 h-4 accent-slate-500 rounded"
                    />
                    <span className={`font-bold text-sm ${isEnabled ? 'text-slate-100' : 'text-gunmetal-muted'}`}>
                      {nameMap[key]}
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
                  {providerStatus[key] && (
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                        providerStatus[key]?.type === 'success'
                          ? 'bg-green-950/60 text-green-400 border-green-800/60'
                          : 'bg-red-950/60 text-red-400 border-red-800/60'
                      }`}
                    >
                      {providerStatus[key]?.message}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 ml-auto sm:ml-0">
                  <button
                    type="button"
                    onClick={() => setSelectedLogsProvider(key)}
                    title={`View recent query logs for ${nameMap[key] || key}`}
                    className="min-h-[44px] sm:min-h-[34px] flex items-center gap-1.5 px-3 sm:px-2.5 py-2 sm:py-1 text-xs font-semibold bg-gunmetal-canvas border border-gunmetal-border text-slate-300 hover:text-white hover:bg-gunmetal-border rounded-md shadow-sm transition-colors cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5 text-slate-400" />
                    <span>Logs</span>
                  </button>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => move(index, -1)}
                      disabled={index === 0}
                      title="Move up in priority"
                      aria-label={`Move ${nameMap[key]} up in priority`}
                      className="min-h-[44px] min-w-[44px] sm:min-h-[34px] sm:min-w-[34px] flex items-center justify-center p-2 sm:p-1.5 text-slate-300 bg-gunmetal-canvas border border-gunmetal-border hover:bg-gunmetal-border hover:text-white disabled:opacity-20 disabled:pointer-events-none transition-colors rounded-md shadow-sm"
                    >
                      <ChevronUp className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => move(index, 1)}
                      disabled={index === meteredOrder.length - 1}
                      title="Move down in priority"
                      aria-label={`Move ${nameMap[key]} down in priority`}
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
                      value={
                        key === 'serpapi'
                          ? settings.serpApiKey || ''
                          : key === 'searchapi'
                          ? settings.searchApiKey || ''
                          : settings.hasdataApiKey || ''
                      }
                      onChange={e => {
                        if (key === 'serpapi') onChange({ ...settings, serpApiKey: e.target.value });
                        if (key === 'searchapi') onChange({ ...settings, searchApiKey: e.target.value });
                        if (key === 'hasdata') onChange({ ...settings, hasdataApiKey: e.target.value });
                      }}
                      onBlur={() => {
                        if (onAutoSave) {
                          onAutoSave(settings, key, 'Saved!', `${nameMap[key]} API key saved`);
                        }
                      }}
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
                      value={
                        key === 'serpapi'
                          ? settings.serpApiQuota
                          : key === 'searchapi'
                          ? settings.searchApiQuota
                          : settings.hasdataQuota
                      }
                      onChange={e => {
                        const val = e.target.value === '' ? 0 : Number(e.target.value);
                        if (key === 'serpapi') onChange({ ...settings, serpApiQuota: val });
                        if (key === 'searchapi') onChange({ ...settings, searchApiQuota: val });
                        if (key === 'hasdata') onChange({ ...settings, hasdataQuota: val });
                      }}
                      onBlur={() => {
                        if (onAutoSave) {
                          onAutoSave(settings, key, 'Saved!', `${nameMap[key]} monthly quota updated`);
                        }
                      }}
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
                    <div className="relative">
                      <select
                        disabled={!isEnabled}
                        value={
                          (key === 'serpapi'
                            ? settings.serpApiResetDay
                            : key === 'searchapi'
                            ? settings.searchApiResetDay
                            : settings.hasdataResetDay) ?? 1
                        }
                        onChange={async e => {
                          const day = parseInt(e.target.value, 10);
                          const nextReset = calculateNextResetDate(day, settings.timezone);
                          let updated = { ...settings };
                          if (key === 'serpapi') {
                            updated = { ...settings, serpApiResetDay: day, serpApiResetDate: nextReset };
                          } else if (key === 'searchapi') {
                            updated = { ...settings, searchApiResetDay: day, searchApiResetDate: nextReset };
                          } else if (key === 'hasdata') {
                            updated = { ...settings, hasdataResetDay: day, hasdataResetDate: nextReset };
                          }
                          onChange(updated);
                          if (onAutoSave) {
                            await onAutoSave(updated, key, 'Saved!', `${nameMap[key]} monthly reset day updated`);
                          }
                        }}
                        className="w-full min-h-[44px] sm:min-h-[38px] appearance-none border border-gunmetal-border px-3 py-2 pr-8 rounded-md bg-gunmetal-canvas text-slate-200 focus:outline-none focus:border-slate-500 disabled:opacity-50 text-sm cursor-pointer"
                      >
                        {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                          <option key={day} value={day}>
                            {formatOrdinalDay(day)} of every month
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gunmetal-muted pointer-events-none" />
                    </div>
                    <span className="text-[11px] text-gunmetal-muted block mt-1 font-mono">
                      Next reset:{' '}
                      {(() => {
                        const resetDate =
                          key === 'serpapi'
                            ? settings.serpApiResetDate
                            : key === 'searchapi'
                            ? settings.searchApiResetDate
                            : settings.hasdataResetDate;
                        return resetDate || calculateNextResetDate(1, settings.timezone);
                      })()}
                    </span>
                  </div>
                </div>

                {/* Manual Query Usage Tracking & Adjustment */}
                {(() => {
                  const usedCount =
                    key === 'serpapi'
                      ? settings.serpApiUsed ?? 0
                      : key === 'searchapi'
                      ? settings.searchApiUsed ?? 0
                      : settings.hasdataUsed ?? 0;
                  const quotaLimit =
                    key === 'serpapi'
                      ? settings.serpApiQuota ?? 0
                      : key === 'searchapi'
                      ? settings.searchApiQuota ?? 0
                      : settings.hasdataQuota ?? 0;
                  const remainingCount = quotaLimit > 0 ? Math.max(0, quotaLimit - usedCount) : null;
                  const isExhausted = quotaLimit > 0 && usedCount >= quotaLimit;
                  const draftVal = usageDrafts[key] !== undefined ? usageDrafts[key] : String(usedCount);
                  const isBusy = adjustingProvider === key;

                  const handleCommitManualSet = () => {
                    const parsedNum = parseInt(draftVal, 10);
                    if (isNaN(parsedNum) || parsedNum < 0) {
                      setUsageDrafts(prev => {
                        const next = { ...prev };
                        delete next[key];
                        return next;
                      });
                      return;
                    }
                    if (parsedNum === usedCount) {
                      setUsageDrafts(prev => {
                        const next = { ...prev };
                        delete next[key];
                        return next;
                      });
                      return;
                    }
                    commitUsageAdjustment(key, 'set', parsedNum);
                  };

                  return (
                    <div className="pt-3 border-t border-gunmetal-border/70 flex flex-col sm:flex-row sm:items-end justify-between gap-3">
                      <div className="space-y-1">
                        <label
                          htmlFor={`queries-used-${key}`}
                          className="block text-xs font-semibold uppercase tracking-wider text-slate-300"
                        >
                          Queries Used (Manual Adjustment)
                        </label>
                        <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                          <span className="text-slate-200 font-semibold">
                            {usedCount} / {quotaLimit === 0 ? 'Unlimited' : quotaLimit} used
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
                          id={`queries-used-${key}`}
                          type="number"
                          min={0}
                          step={1}
                          disabled={isBusy}
                          value={draftVal}
                          onChange={e => setUsageDrafts(prev => ({ ...prev, [key]: e.target.value }))}
                          onBlur={handleCommitManualSet}
                          onKeyDown={e => {
                            if (e.key === 'Enter') e.currentTarget.blur();
                          }}
                          aria-label={`${nameMap[key]} queries used`}
                          className="w-24 sm:w-28 min-h-[44px] sm:min-h-[38px] border border-gunmetal-border px-3 py-2 rounded-md bg-gunmetal-canvas text-slate-200 focus:outline-none focus:border-slate-500 disabled:opacity-50 text-sm font-mono"
                        />
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => commitUsageAdjustment(key, 'increment', 1)}
                          title={`Log 1 manually used query for ${nameMap[key]}`}
                          className="flex-1 sm:flex-initial min-h-[44px] sm:min-h-[38px] inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold bg-gunmetal-border hover:bg-slate-700 text-slate-100 border border-slate-500 rounded-md shadow-sm transition-colors disabled:opacity-50 cursor-pointer whitespace-nowrap"
                        >
                          <Plus className="w-3.5 h-3.5 text-sky-400" />
                          <span>Log +1 Query</span>
                        </button>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          );
        })}
      </div>

      {/* Unmetered Scraper Tier - Permanent Bottom Position */}
      <div className="pt-6 border-t border-gunmetal-border/80 space-y-4">
        <div>
          <h3 className="text-sm font-bold text-slate-200">Unmetered Web Scraper</h3>
          <p className="text-xs text-gunmetal-muted">
            Fast-Flights operates without an API key.
          </p>
        </div>

        <div
          className={`border rounded-lg transition-all ${
            settings.fastFlightsEnabled === 1
              ? 'bg-gunmetal-canvas/60 border-gunmetal-border shadow-sm'
              : 'bg-gunmetal-canvas/30 border-gunmetal-border/50 opacity-60'
          }`}
        >
          <div className="p-3.5 sm:p-4 border-b border-gunmetal-border/70 flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 min-w-0">
              <label className="min-h-[44px] sm:min-h-0 flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={settings.fastFlightsEnabled === 1}
                  onChange={e => toggleEnabled('fastflights', e.target.checked)}
                  className="w-4 h-4 accent-slate-500 rounded"
                />
                <span className={`font-bold text-sm ${settings.fastFlightsEnabled === 1 ? 'text-slate-100' : 'text-gunmetal-muted'}`}>
                  {nameMap['fastflights']}
                </span>
              </label>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded border bg-amber-950/40 text-amber-400 border-amber-800/40">
                Unlimited Scraper
              </span>
              {settings.fastFlightsEnabled !== 1 && (
                <span className="text-[10px] uppercase font-bold text-gunmetal-muted bg-gunmetal-canvas px-1.5 py-0.5 rounded border border-gunmetal-border">
                  Disabled
                </span>
              )}
              {providerStatus['fastflights'] && (
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                    providerStatus['fastflights']?.type === 'success'
                      ? 'bg-green-950/60 text-green-400 border-green-800/60'
                      : 'bg-red-950/60 text-red-400 border-red-800/60'
                  }`}
                >
                  {providerStatus['fastflights']?.message}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 ml-auto sm:ml-0">
              <button
                type="button"
                onClick={() => setSelectedLogsProvider('fastflights')}
                title={`View recent query logs for ${nameMap['fastflights']}`}
                className="min-h-[44px] sm:min-h-[34px] flex items-center gap-1.5 px-3 sm:px-2.5 py-2 sm:py-1 text-xs font-semibold bg-gunmetal-canvas border border-gunmetal-border text-slate-300 hover:text-white hover:bg-gunmetal-border rounded-md shadow-sm transition-colors cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5 text-slate-400" />
                <span>Logs</span>
              </button>
            </div>
          </div>

          <div className="p-4 space-y-3">
            <div className="bg-amber-950/20 border border-amber-900/40 rounded-md p-3.5 space-y-1.5 text-xs text-amber-300">
              <p className="font-semibold text-amber-200 flex items-center gap-1.5">
                Unlimited Datasource Notice & Disclaimer
              </p>
              <p>
                <strong>Priority:</strong> When enabled, this data source bypasses metered quotas and is executed first before any API-key data sources regardless of the configured Query Routing Strategy.
              </p>
              <p>
                <strong>Volatility:</strong> This scraper reverse-engineers public RPC endpoints without an API key. It is volatile and may encounter CAPTCHAs or bot blocks. Automatic jitter delays (2.0s – 4.5s) are applied to each query. Pairing with at least one official API provider is highly recommended, as it will most likely fail frequently.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Route Auto-Detection Activity Card */}
      <div className="pt-6 border-t border-gunmetal-border/80 space-y-4">
        <div className="border border-gunmetal-border rounded-lg bg-gunmetal-canvas/60 transition-all shadow-sm">
          <div className="p-3.5 sm:p-4 border-b border-gunmetal-border/70 flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 min-w-0">
              <span className="font-bold text-sm text-slate-100">
                Route Auto-Detection Activity
              </span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded border bg-emerald-950/40 text-emerald-400 border-emerald-800/40">
                Zero Quota
              </span>
            </div>
            <div className="flex items-center gap-2 ml-auto sm:ml-0">
              <button
                type="button"
                onClick={() => setSelectedLogsProvider('flight-route-lookup')}
                title="View recent query logs for Flight Route Lookup"
                className="min-h-[44px] sm:min-h-[34px] flex items-center gap-1.5 px-3 sm:px-2.5 py-2 sm:py-1 text-xs font-semibold bg-gunmetal-canvas border border-gunmetal-border text-slate-300 hover:text-white hover:bg-gunmetal-border rounded-md shadow-sm transition-colors cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5 text-slate-400" />
                <span>Logs</span>
              </button>
            </div>
          </div>

          <div className="p-4 space-y-3">
            <p className="text-xs text-gunmetal-muted leading-relaxed">
              When entering carrier and flight numbers on flights, FlightSentry queries zero-quota aviation databases to confirm the scheduled origin and destination.
            </p>
          </div>
        </div>
      </div>

      <DataSourceLogsModal
        isOpen={Boolean(selectedLogsProvider)}
        providerKey={selectedLogsProvider}
        providerName={selectedLogsProvider ? nameMap[selectedLogsProvider] || selectedLogsProvider : ''}
        onClose={() => setSelectedLogsProvider(null)}
      />
    </div>
  );
}