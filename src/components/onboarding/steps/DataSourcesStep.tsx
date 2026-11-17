'use client';

import { useState } from 'react';
import { ChevronUp, ChevronDown, RefreshCw, CheckCircle2, AlertCircle, Compass, SlidersHorizontal, ExternalLink } from 'lucide-react';
import SettingsCard from '@/components/settings/shared/SettingsCard';
import SettingsSelect from '@/components/settings/shared/SettingsSelect';
import { calculateNextResetDate, formatOrdinalDay } from '@/utils/date';
import { OnboardingStepProps } from '../types';

type ProviderKey = 'openfarescraper' | 'serpapi' | 'searchapi';

const PROVIDER_META: Record<
  ProviderKey,
  {
    name: string;
    badge: string;
    badgeClass: string;
    summary: string;
    docsUrl: string;
    docsLabel: string;
    apiKeyHelp: string;
  }
> = {
  openfarescraper: {
    name: 'OpenFareScraper',
    badge: 'Self-Hosted Scraper',
    badgeClass: 'bg-amber-950/40 text-amber-400 border-amber-800/40',
    summary:
      'Self-hosted Google Flights scraper container with ofs_ API key auth and rolling hourly/daily limits.',
    docsUrl: 'https://hub.docker.com/r/thebronway/openfarescraper',
    docsLabel: 'Docker Hub Setup',
    apiKeyHelp:
      'Run the thebronway/openfarescraper Docker container, open its web UI, and generate an ofs_ API key in its API Keys settings.',
  },
  serpapi: {
    name: 'SerpAPI',
    badge: 'Metered API',
    badgeClass: 'bg-sky-950/40 text-sky-400 border-sky-800/40',
    summary:
      'Hosted Google Flights search API with configurable monthly or one-time search quota tracking.',
    docsUrl: 'https://serpapi.com/manage-api-key',
    docsLabel: 'Get SerpAPI Key',
    apiKeyHelp:
      'Sign up or log in at serpapi.com and copy your Private API Key from Dashboard → Manage API Key.',
  },
  searchapi: {
    name: 'SearchApi.io',
    badge: 'Metered API',
    badgeClass: 'bg-sky-950/40 text-sky-400 border-sky-800/40',
    summary:
      'Hosted Google Flights search API supporting monthly recurring or one-time credit allowances.',
    docsUrl: 'https://www.searchapi.io/dashboard',
    docsLabel: 'Get SearchApi.io Key',
    apiKeyHelp:
      'Sign up or log in at searchapi.io and copy your API key from your Account Dashboard.',
  },
};

export default function DataSourcesStep({
  settings,
  onChange,
  onSkipToSettingsLater,
}: OnboardingStepProps) {
  const [testingScraper, setTestingScraper] = useState(false);
  const [scraperTestResult, setScraperTestResult] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const allKeys: ProviderKey[] = ['serpapi', 'searchapi', 'openfarescraper'];
  const providerOrder = (settings.dataSourceStrategy || 'serpapi,searchapi,openfarescraper')
    .split(',')
    .map((s) => s.trim())
    .filter((k): k is ProviderKey => allKeys.includes(k as ProviderKey));
  allKeys.forEach((k) => {
    if (!providerOrder.includes(k)) providerOrder.push(k);
  });

  const moveProvider = (index: number, dir: -1 | 1) => {
    const next = [...providerOrder];
    const tmp = next[index];
    next[index] = next[index + dir];
    next[index + dir] = tmp;
    onChange({ ...settings, dataSourceStrategy: next.join(',') });
  };

  const handleTestScraper = async () => {
    const url = (settings.openfareScraperUrl || '').trim();
    const apiKey = (settings.openfareScraperApiKey || '').trim();
    if (!url || !apiKey || testingScraper) return;

    setTestingScraper(true);
    setScraperTestResult(null);
    try {
      const res = await fetch('/api/settings/test-scraper', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          openfareScraperUrl: url,
          openfareScraperApiKey: apiKey,
        }),
      });
      const data = await res.json();
      if (res.ok && data.health) {
        setScraperTestResult({
          type: 'success',
          message: `Connected! OpenFareScraper v${data.health.version} (${data.health.state})`,
        });
      } else {
        setScraperTestResult({
          type: 'error',
          message: data.error || `Connection failed (HTTP ${res.status})`,
        });
      }
    } catch (err: any) {
      setScraperTestResult({
        type: 'error',
        message: err?.message || 'Network error connecting to OpenFareScraper',
      });
    } finally {
      setTestingScraper(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Explanation Banner */}
      <div className="p-3.5 rounded-xl bg-amber-950/25 border border-amber-800/50 text-xs text-amber-200/90 leading-relaxed space-y-1">
        <p className="font-bold text-amber-100">
          How Automated Price Checks &amp; Quotas Work
        </p>
        <p>
          To pull live cash fares automatically, enable at least one provider below. Pairing <strong>OpenFareScraper</strong> with a metered API ensures uninterrupted tracking if the scraper enters cooldown or hits its hourly/daily limit. If you have no keys handy yet, skip this step—Manual Mode and Points/Miles tracking still work immediately.
        </p>
      </div>

      {/* Query Routing Strategy */}
      <SettingsCard className="space-y-2.5">
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
          <SlidersHorizontal className="w-4 h-4 text-sky-400" />
          <span>1. Query Routing Strategy</span>
        </label>
        <SettingsSelect
          value={settings.fallbackStrategyMode}
          onChange={(e) => onChange({ ...settings, fallbackStrategyMode: e.target.value })}
        >
          <option value="sequential-query">Round-Robin (Atomic Rotation)</option>
          <option value="balanced-usage">Balanced Usage (% Quota Consumed)</option>
          <option value="exhaust-quota">Exhaust Quota (Priority Failover)</option>
        </SettingsSelect>
        <div className="space-y-1 text-xs text-gunmetal-muted pt-1">
          <p>
            <strong className="text-slate-300">Round-Robin:</strong> Evenly alternates checks across active providers.
          </p>
          <p>
            <strong className="text-slate-300">Balanced Usage:</strong> Directs checks to whichever active provider has consumed the lowest percentage of its quota.
          </p>
          <p>
            <strong className="text-slate-300">Exhaust Quota:</strong> Uses your #1 ranked provider exclusively until its allowance runs out, then fails over to #2.
          </p>
        </div>
      </SettingsCard>

      {/* Provider Priority & Credentials */}
      <div className="space-y-3">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
            2. Flight Search Providers &amp; Priority Rank
          </h3>
          <p className="text-xs text-gunmetal-muted mt-0.5">
            Enable any combination of providers below and use the arrows to set their fallback rank.
          </p>
        </div>

        {providerOrder.map((key, index) => {
          const meta = PROVIDER_META[key];

          if (key === 'openfarescraper') {
            const isEnabled = settings.openfareScraperEnabled === 1;
            const prioritizeFirst = settings.openfareScraperPrioritizeFirst !== 0;
            return (
              <div
                key={key}
                className={`border rounded-xl transition-all ${
                  isEnabled
                    ? 'bg-gunmetal-canvas/70 border-gunmetal-border'
                    : 'bg-gunmetal-canvas/35 border-gunmetal-border/60'
                }`}
              >
                <div className="p-3.5 border-b border-gunmetal-border/70 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="w-6 h-6 rounded bg-gunmetal-card border border-gunmetal-border flex items-center justify-center text-xs font-mono font-bold text-slate-300">
                      #{index + 1}
                    </span>
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={isEnabled}
                        onChange={(e) =>
                          onChange({
                            ...settings,
                            openfareScraperEnabled: e.target.checked ? 1 : 0,
                          })
                        }
                        className="w-4 h-4 accent-slate-500 rounded cursor-pointer"
                      />
                      <span className="font-bold text-sm text-slate-100">{meta.name}</span>
                    </label>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${meta.badgeClass}`}>
                      {meta.badge}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => moveProvider(index, -1)}
                      aria-label="Move OpenFareScraper up"
                      className="p-1.5 text-slate-300 bg-gunmetal-card border border-gunmetal-border hover:bg-gunmetal-border rounded disabled:opacity-25 cursor-pointer"
                    >
                      <ChevronUp className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      disabled={index === providerOrder.length - 1}
                      onClick={() => moveProvider(index, 1)}
                      aria-label="Move OpenFareScraper down"
                      className="p-1.5 text-slate-300 bg-gunmetal-card border border-gunmetal-border hover:bg-gunmetal-border rounded disabled:opacity-25 cursor-pointer"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="p-3.5 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="space-y-0.5">
                      <p className="text-xs text-gunmetal-muted">{meta.summary}</p>
                      <p className="text-[11px] text-slate-300/90">{meta.apiKeyHelp}</p>
                    </div>
                    <a
                      href={meta.docsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="self-start sm:self-center flex-shrink-0 min-h-[34px] px-3 py-1.5 rounded-md bg-gunmetal-card hover:bg-gunmetal-border border border-gunmetal-border text-xs font-semibold text-sky-300 hover:text-white inline-flex items-center gap-1.5 transition-colors"
                    >
                      <span>{meta.docsLabel}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-300 mb-1">
                        Scraper Base URL
                      </label>
                      <input
                        type="url"
                        disabled={!isEnabled}
                        value={settings.openfareScraperUrl || ''}
                        onChange={(e) =>
                          onChange({ ...settings, openfareScraperUrl: e.target.value })
                        }
                        placeholder="http://openfarescraper:4001"
                        className="w-full min-h-[40px] border border-gunmetal-border px-3 py-1.5 rounded-md bg-gunmetal-canvas text-slate-200 focus:outline-none focus:border-slate-500 disabled:opacity-50 text-xs sm:text-sm font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-300 mb-1">
                        Scraper API Key
                      </label>
                      <input
                        type="password"
                        disabled={!isEnabled}
                        value={settings.openfareScraperApiKey || ''}
                        onChange={(e) =>
                          onChange({ ...settings, openfareScraperApiKey: e.target.value })
                        }
                        placeholder="ofs_..."
                        className="w-full min-h-[40px] border border-gunmetal-border px-3 py-1.5 rounded-md bg-gunmetal-canvas text-slate-200 focus:outline-none focus:border-slate-500 disabled:opacity-50 text-xs sm:text-sm font-mono"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1">
                    <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        disabled={!isEnabled}
                        checked={prioritizeFirst}
                        onChange={(e) =>
                          onChange({
                            ...settings,
                            openfareScraperPrioritizeFirst: e.target.checked ? 1 : 0,
                          })
                        }
                        className="w-4 h-4 accent-slate-500 rounded cursor-pointer"
                      />
                      <span>Always run scraper first to preserve metered API quotas</span>
                    </label>

                    <button
                      type="button"
                      disabled={
                        !isEnabled ||
                        testingScraper ||
                        !(settings.openfareScraperUrl || '').trim() ||
                        !(settings.openfareScraperApiKey || '').trim()
                      }
                      onClick={() => void handleTestScraper()}
                      className="min-h-[36px] px-3 py-1.5 rounded-md bg-gunmetal-card hover:bg-gunmetal-border border border-gunmetal-border text-xs font-semibold text-slate-200 inline-flex items-center justify-center gap-1.5 disabled:opacity-40 cursor-pointer"
                    >
                      <RefreshCw
                        className={`w-3.5 h-3.5 text-sky-400 ${testingScraper ? 'animate-spin' : ''}`}
                      />
                      <span>{testingScraper ? 'Testing...' : 'Test Scraper'}</span>
                    </button>
                  </div>

                  {scraperTestResult && (
                    <div
                      className={`p-2.5 rounded-md border text-xs flex items-center gap-2 ${
                        scraperTestResult.type === 'success'
                          ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-200'
                          : 'bg-rose-950/40 border-rose-800/60 text-rose-200'
                      }`}
                    >
                      {scraperTestResult.type === 'success' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                      )}
                      <span>{scraperTestResult.message}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          }

          const isSerp = key === 'serpapi';
          const isEnabled = isSerp ? settings.serpApiEnabled === 1 : settings.searchApiEnabled === 1;
          const apiKey = isSerp ? settings.serpApiKey || '' : settings.searchApiKey || '';
          const quotaMode = (
            isSerp ? settings.serpApiQuotaMode || 'monthly' : settings.searchApiQuotaMode || 'monthly'
          ) as 'monthly' | 'one-time';
          const quota = isSerp ? settings.serpApiQuota : settings.searchApiQuota;
          const resetDay = isSerp ? settings.serpApiResetDay ?? 1 : settings.searchApiResetDay ?? 1;

          return (
            <div
              key={key}
              className={`border rounded-xl transition-all ${
                isEnabled
                  ? 'bg-gunmetal-canvas/70 border-gunmetal-border'
                  : 'bg-gunmetal-canvas/35 border-gunmetal-border/60'
              }`}
            >
              <div className="p-3.5 border-b border-gunmetal-border/70 flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="w-6 h-6 rounded bg-gunmetal-card border border-gunmetal-border flex items-center justify-center text-xs font-mono font-bold text-slate-300">
                    #{index + 1}
                  </span>
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={isEnabled}
                      onChange={(e) => {
                        const val = e.target.checked ? 1 : 0;
                        onChange(
                          isSerp
                            ? { ...settings, serpApiEnabled: val }
                            : { ...settings, searchApiEnabled: val }
                        );
                      }}
                      className="w-4 h-4 accent-slate-500 rounded cursor-pointer"
                    />
                    <span className="font-bold text-sm text-slate-100">{meta.name}</span>
                  </label>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${meta.badgeClass}`}>
                    {meta.badge}
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={index === 0}
                    onClick={() => moveProvider(index, -1)}
                    aria-label={`Move ${meta.name} up`}
                    className="p-1.5 text-slate-300 bg-gunmetal-card border border-gunmetal-border hover:bg-gunmetal-border rounded disabled:opacity-25 cursor-pointer"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    disabled={index === providerOrder.length - 1}
                    onClick={() => moveProvider(index, 1)}
                    aria-label={`Move ${meta.name} down`}
                    className="p-1.5 text-slate-300 bg-gunmetal-card border border-gunmetal-border hover:bg-gunmetal-border rounded disabled:opacity-25 cursor-pointer"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="p-3.5 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="space-y-0.5">
                    <p className="text-xs text-gunmetal-muted">{meta.summary}</p>
                    <p className="text-[11px] text-slate-300/90">{meta.apiKeyHelp}</p>
                  </div>
                  <a
                    href={meta.docsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="self-start sm:self-center flex-shrink-0 min-h-[34px] px-3 py-1.5 rounded-md bg-gunmetal-card hover:bg-gunmetal-border border border-gunmetal-border text-xs font-semibold text-sky-300 hover:text-white inline-flex items-center gap-1.5 transition-colors"
                  >
                    <span>{meta.docsLabel}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-300 mb-1">
                      API Key
                    </label>
                    <input
                      type="password"
                      disabled={!isEnabled}
                      value={apiKey}
                      onChange={(e) =>
                        onChange(
                          isSerp
                            ? { ...settings, serpApiKey: e.target.value }
                            : { ...settings, searchApiKey: e.target.value }
                        )
                      }
                      placeholder="Enter API Key"
                      className="w-full min-h-[40px] border border-gunmetal-border px-3 py-1.5 rounded-md bg-gunmetal-canvas text-slate-200 focus:outline-none focus:border-slate-500 disabled:opacity-50 text-xs sm:text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-300 mb-1">
                      Quota Mode
                    </label>
                    <SettingsSelect
                      compactDesktop
                      disabled={!isEnabled}
                      value={quotaMode}
                      onChange={(e) => {
                        const mode = e.target.value as 'monthly' | 'one-time';
                        onChange(
                          isSerp
                            ? { ...settings, serpApiQuotaMode: mode }
                            : { ...settings, searchApiQuotaMode: mode }
                        );
                      }}
                    >
                      <option value="monthly">Monthly Recurring</option>
                      <option value="one-time">One-Time Credits</option>
                    </SettingsSelect>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-300 mb-1">
                      {quotaMode === 'one-time' ? 'Credit Pool' : 'Monthly Quota'}
                    </label>
                    <input
                      type="number"
                      min={0}
                      disabled={!isEnabled}
                      value={quota}
                      onChange={(e) => {
                        const val = e.target.value === '' ? 0 : Number(e.target.value);
                        onChange(
                          isSerp
                            ? { ...settings, serpApiQuota: val }
                            : { ...settings, searchApiQuota: val }
                        );
                      }}
                      className="w-full min-h-[40px] border border-gunmetal-border px-3 py-1.5 rounded-md bg-gunmetal-canvas text-slate-200 focus:outline-none focus:border-slate-500 disabled:opacity-50 text-xs sm:text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-300 mb-1">
                      Reset Day
                    </label>
                    {quotaMode === 'one-time' ? (
                      <div className="w-full min-h-[40px] border border-gunmetal-border/70 px-3 py-1.5 rounded-md bg-gunmetal-canvas/40 text-gunmetal-muted text-xs flex items-center font-mono">
                        No reset
                      </div>
                    ) : (
                      <SettingsSelect
                        compactDesktop
                        disabled={!isEnabled}
                        value={resetDay}
                        onChange={(e) => {
                          const day = parseInt(e.target.value, 10);
                          const nextReset = calculateNextResetDate(day, settings.timezone);
                          onChange(
                            isSerp
                              ? { ...settings, serpApiResetDay: day, serpApiResetDate: nextReset }
                              : {
                                  ...settings,
                                  searchApiResetDay: day,
                                  searchApiResetDate: nextReset,
                                }
                          );
                        }}
                      >
                        {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                          <option key={d} value={d}>
                            {formatOrdinalDay(d)} of month
                          </option>
                        ))}
                      </SettingsSelect>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Route Auto-Detection Note */}
      <SettingsCard className="space-y-1.5">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-200">
          <Compass className="w-4 h-4 text-emerald-400" />
          <span>Zero-Quota Route Auto-Detection</span>
        </div>
        <p className="text-xs text-gunmetal-muted leading-relaxed">
          Built-in and always active with zero API quota usage: whenever you type an airline code and flight number (e.g., <span className="font-mono text-slate-300">DL 452</span>), FlightSentry automatically resolves the scheduled origin and destination airports.
        </p>
      </SettingsCard>

      </div>
  );
}