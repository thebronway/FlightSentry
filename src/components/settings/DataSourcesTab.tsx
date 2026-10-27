'use client';

import { Settings } from '@/types';
import { ChevronUp, ChevronDown } from 'lucide-react';

interface Props {
  settings: Settings;
  onChange: (settings: Settings) => void;
}

export default function DataSourcesTab({ settings, onChange }: Props) {
  const allKeys = ['serpapi', 'searchapi', 'hasdata', 'fastflights'];
  const currentOrder = (settings.dataSourceStrategy || 'serpapi,searchapi,hasdata,fastflights')
    .split(',')
    .map(s => s.trim())
    .filter(k => allKeys.includes(k));

  allKeys.forEach(k => {
    if (!currentOrder.includes(k)) currentOrder.push(k);
  });

  const move = (index: number, dir: number) => {
    const newOrder = [...currentOrder];
    const temp = newOrder[index];
    newOrder[index] = newOrder[index + dir];
    newOrder[index + dir] = temp;
    onChange({ ...settings, dataSourceStrategy: newOrder.join(',') });
  };

  const nameMap: Record<string, string> = {
    serpapi: 'SerpAPI',
    searchapi: 'SearchApi.io',
    hasdata: 'HasData',
    fastflights: 'Fast-Flights (Scraper)',
  };

  const toggleEnabled = (key: string, checked: boolean) => {
    const val = checked ? 1 : 0;
    if (key === 'serpapi') onChange({ ...settings, serpApiEnabled: val });
    if (key === 'searchapi') onChange({ ...settings, searchApiEnabled: val });
    if (key === 'hasdata') onChange({ ...settings, hasdataEnabled: val });
    if (key === 'fastflights') onChange({ ...settings, fastFlightsEnabled: val });
  };

  return (
    <div className="space-y-6 pt-2">
      <div className="bg-gunmetal-canvas/60 border border-gunmetal-border p-3.5 rounded-lg text-xs text-slate-300">
        <p className="font-semibold text-slate-200 mb-0.5">Data Sources & Query Routing</p>
        Configure flight search providers, monthly query allowances, and routing strategies. Flight checks dynamically query active sources based on priority order and configured fallback behavior[cite: 1].
      </div>

      {/* Query Routing Strategy Selector */}
      <div className="bg-gunmetal-canvas/60 border border-gunmetal-border p-4 rounded-lg space-y-2">
        <label className="block text-sm font-semibold text-slate-200">Query Routing Strategy</label>
        <select
          value={settings.fallbackStrategyMode}
          onChange={e => onChange({ ...settings, fallbackStrategyMode: e.target.value })}
          className="w-full border border-gunmetal-border p-2.5 rounded-md bg-gunmetal-canvas text-slate-200 focus:outline-none focus:border-slate-500 text-sm"
        >
          <option value="sequential-query">Round-Robin (Atomic Rotation)</option>
          <option value="balanced-usage">Balanced Usage (% Quota Consumed)</option>
          <option value="exhaust-quota">Exhaust Quota (Priority Failover)</option>
        </select>
        <div className="space-y-1 text-xs text-gunmetal-muted pt-1">
          <p>
            <strong className="text-slate-300">Round-Robin:</strong> Evenly alternates checks across active data sources to balance quota consumption using an atomic database pointer[cite: 1].
          </p>
          <p>
            <strong className="text-slate-300">Balanced Usage:</strong> Dynamically directs queries to the active provider with the lowest percentage of monthly quota consumed[cite: 1].
          </p>
          <p>
            <strong className="text-slate-300">Exhaust Quota:</strong> Exclusively queries the top-priority active provider until its monthly allowance is exhausted, then falls back to the next provider[cite: 1].
          </p>
        </div>
        <p className="text-[11px] text-amber-400 font-medium pt-1">
          Priority Rule: Any active unmetered data source will automatically be queried first before any metered datasource, regardless of Query Routing Strategy[cite: 1].
        </p>
      </div>

      {/* Consolidated Reorderable Stack of Provider Cards */}
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-bold text-slate-200">Data Source Stack & Priority Order</h3>
          <p className="text-xs text-gunmetal-muted">
            Use the chevrons on each card to adjust priority rank. Inactive providers remain in their fixed rank position but are skipped at runtime[cite: 1].
          </p>
        </div>

        {currentOrder.map((key, index) => {
          const isMetered = key === 'serpapi' || key === 'searchapi' || key === 'hasdata';
          const isEnabled = key === 'serpapi'
            ? settings.serpApiEnabled === 1
            : key === 'searchapi'
            ? settings.searchApiEnabled === 1
            : key === 'hasdata'
            ? settings.hasdataEnabled === 1
            : settings.fastFlightsEnabled === 1;

          return (
            <div
              key={key}
              className={`border rounded-lg transition-all ${
                isEnabled
                  ? 'bg-gunmetal-card border-gunmetal-border shadow-sm'
                  : 'bg-gunmetal-canvas/40 border-gunmetal-border/50 opacity-60'
              }`}
            >
              <div className="p-4 border-b border-gunmetal-border flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-md bg-gunmetal-canvas border border-gunmetal-border flex items-center justify-center text-xs font-mono font-bold text-slate-300">
                    #{index + 1}
                  </span>
                  <label className="flex items-center gap-2 cursor-pointer select-none">
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
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${
                      isMetered
                        ? 'bg-sky-950/40 text-sky-400 border-sky-800/40'
                        : 'bg-amber-950/40 text-amber-400 border-amber-800/40'
                    }`}
                  >
                    {isMetered ? 'Metered API' : 'Unlimited Scraper'}
                  </span>
                  {!isEnabled && (
                    <span className="text-[10px] uppercase font-bold text-gunmetal-muted bg-gunmetal-canvas px-1.5 py-0.5 rounded border border-gunmetal-border">
                      Disabled
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => move(index, -1)}
                    disabled={index === 0}
                    title="Move up in priority"
                    className="p-1.5 text-gunmetal-muted hover:text-slate-200 disabled:opacity-20 transition-colors rounded hover:bg-gunmetal-canvas"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => move(index, 1)}
                    disabled={index === currentOrder.length - 1}
                    title="Move down in priority"
                    className="p-1.5 text-gunmetal-muted hover:text-slate-200 disabled:opacity-20 transition-colors rounded hover:bg-gunmetal-canvas"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="p-4 space-y-3">
                {isMetered ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
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
                        placeholder="Enter API Key"
                        className="w-full border border-gunmetal-border p-2 rounded-md bg-gunmetal-canvas text-slate-200 focus:outline-none focus:border-slate-500 disabled:opacity-50 text-sm"
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
                        className="w-full border border-gunmetal-border p-2 rounded-md bg-gunmetal-canvas text-slate-200 focus:outline-none focus:border-slate-500 disabled:opacity-50 text-sm"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="bg-amber-950/20 border border-amber-900/40 rounded-md p-3.5 space-y-1.5 text-xs text-amber-300">
                    <p className="font-semibold text-amber-200 flex items-center gap-1.5">
                      Unlimited Datasource Notice & Disclaimer
                    </p>
                    <p>
                      <strong>Priority:</strong> When enabled, this data source bypasses metered quotas and is executed first before any API-key data sources regardless of the configured Query Routing Strategy[cite: 1].
                    </p>
                    <p>
                      <strong>Volatility:</strong> This scraper reverse-engineers public RPC endpoints without an API key. It is volatile and may encounter CAPTCHAs or bot blocks. Automatic jitter delays (2.0s – 4.5s) are applied to each query[cite: 1]. Pairing with at least one official API provider is recommended[cite: 1].
                    </p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}