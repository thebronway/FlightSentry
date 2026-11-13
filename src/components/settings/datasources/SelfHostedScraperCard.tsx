'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  ChevronUp,
  ChevronDown,
  FileText,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
} from 'lucide-react';
import type { ScraperHealthResponse } from '@/services/flightsentryScraper';

interface Props {
  providerName: string;
  rankIndex: number;
  totalCount: number;
  isEnabled: boolean;
  prioritizeFirst: boolean;
  scraperUrl: string;
  scraperApiKey: string;
  status?: { type: 'success' | 'error'; message: string } | null;
  onToggleEnabled: (checked: boolean) => void;
  onTogglePrioritizeFirst: (checked: boolean) => void;
  onMove: (direction: -1 | 1) => void;
  onUrlChange: (val: string) => void;
  onUrlBlur: () => void;
  onApiKeyChange: (val: string) => void;
  onApiKeyBlur: () => void;
  onOpenLogs: () => void;
}

const STATE_DISPLAY: Record<
  ScraperHealthResponse['state'],
  { label: string; badgeClass: string }
> = {
  ready: {
    label: 'Ready',
    badgeClass: 'bg-green-950/60 text-green-400 border-green-800/60',
  },
  paused: {
    label: 'Paused',
    badgeClass: 'bg-amber-950/60 text-amber-300 border-amber-700/70',
  },
  cooldown: {
    label: 'Cooldown',
    badgeClass: 'bg-amber-950/60 text-amber-300 border-amber-700/70',
  },
  rate_limited: {
    label: 'Rate Limited',
    badgeClass: 'bg-red-950/60 text-red-400 border-red-800/60',
  },
};

export default function SelfHostedScraperCard({
  providerName,
  rankIndex,
  totalCount,
  isEnabled,
  prioritizeFirst,
  scraperUrl,
  scraperApiKey,
  status,
  onToggleEnabled,
  onTogglePrioritizeFirst,
  onMove,
  onUrlChange,
  onUrlBlur,
  onApiKeyChange,
  onApiKeyBlur,
  onOpenLogs,
}: Props) {
  const [testing, setTesting] = useState(false);
  const [healthResult, setHealthResult] = useState<ScraperHealthResponse | null>(null);
  const [testError, setTestError] = useState<string | null>(null);

  const fetchHealthStatus = useCallback(
    async (urlToTest: string, keyToTest: string, showErrors: boolean) => {
      if (!urlToTest.trim() || !keyToTest.trim()) {
        setHealthResult(null);
        if (!showErrors) setTestError(null);
        return;
      }

      setTesting(true);
      if (showErrors) setTestError(null);

      try {
        const res = await fetch('/api/settings/test-scraper', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            flightsentryScraperUrl: urlToTest,
            flightsentryScraperApiKey: keyToTest,
          }),
        });
        const data = await res.json();
        if (res.ok && data.health) {
          setHealthResult(data.health as ScraperHealthResponse);
          setTestError(null);
        } else {
          setHealthResult(null);
          if (showErrors) {
            setTestError(data.error || `Health check failed (HTTP ${res.status})`);
          }
        }
      } catch (err: any) {
        setHealthResult(null);
        if (showErrors) {
          setTestError(err?.message || 'Network error connecting to FlightSentry-Scraper');
        }
      } finally {
        setTesting(false);
      }
    },
    []
  );

  // Automatically load live health & rolling quota telemetry when opening Data Sources
  useEffect(() => {
    if (scraperUrl.trim() && scraperApiKey.trim()) {
      void fetchHealthStatus(scraperUrl, scraperApiKey, false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded border bg-amber-950/40 text-amber-400 border-amber-800/40">
            Self-Hosted Scraper
          </span>
          {isEnabled && prioritizeFirst && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded border bg-sky-950/40 text-sky-300 border-sky-800/40">
              Prioritized First
            </span>
          )}
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
            onClick={() => fetchHealthStatus(scraperUrl, scraperApiKey, true)}
            disabled={testing || !scraperUrl.trim() || !scraperApiKey.trim()}
            title="Test connection and refresh live health, pause state, queue depth, and rolling quotas"
            className="min-h-[44px] sm:min-h-[34px] flex items-center gap-1.5 px-3 sm:px-2.5 py-2 sm:py-1 text-xs font-semibold bg-gunmetal-canvas border border-gunmetal-border text-slate-300 hover:text-white hover:bg-gunmetal-border rounded-md shadow-sm transition-colors disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-sky-400 ${testing ? 'animate-spin' : ''}`} />
            <span>{testing ? 'Checking...' : 'Test & Refresh'}</span>
          </button>
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

      <div className="p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="flightsentry-scraper-url"
              className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1"
            >
              Scraper Base URL
            </label>
            <input
              id="flightsentry-scraper-url"
              type="url"
              disabled={!isEnabled}
              value={scraperUrl}
              onChange={e => onUrlChange(e.target.value)}
              onBlur={() => {
                onUrlBlur();
                if (scraperUrl.trim() && scraperApiKey.trim()) {
                  void fetchHealthStatus(scraperUrl, scraperApiKey, false);
                }
              }}
              onKeyDown={e => {
                if (e.key === 'Enter') e.currentTarget.blur();
              }}
              placeholder="http://flightsentry-scraper:4001"
              className="w-full min-h-[44px] sm:min-h-[38px] border border-gunmetal-border px-3 py-2 rounded-md bg-gunmetal-canvas text-slate-200 focus:outline-none focus:border-slate-500 disabled:opacity-50 text-sm font-mono"
            />
          </div>

          <div>
            <label
              htmlFor="flightsentry-scraper-apikey"
              className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1"
            >
              API Key
            </label>
            <input
              id="flightsentry-scraper-apikey"
              type="password"
              disabled={!isEnabled}
              value={scraperApiKey}
              onChange={e => onApiKeyChange(e.target.value)}
              onBlur={() => {
                onApiKeyBlur();
                if (scraperUrl.trim() && scraperApiKey.trim()) {
                  void fetchHealthStatus(scraperUrl, scraperApiKey, false);
                }
              }}
              onKeyDown={e => {
                if (e.key === 'Enter') e.currentTarget.blur();
              }}
              placeholder="fss_..."
              className="w-full min-h-[44px] sm:min-h-[38px] border border-gunmetal-border px-3 py-2 rounded-md bg-gunmetal-canvas text-slate-200 focus:outline-none focus:border-slate-500 disabled:opacity-50 text-sm font-mono"
            />
          </div>
        </div>

        {/* Hybrid Routing Priority Toggle */}
        <div className="pt-3 border-t border-gunmetal-border/70">
          <label className="min-h-[44px] sm:min-h-0 flex items-start gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              disabled={!isEnabled}
              checked={prioritizeFirst}
              onChange={e => onTogglePrioritizeFirst(e.target.checked)}
              className="w-4 h-4 mt-0.5 accent-slate-500 rounded disabled:opacity-50"
            />
            <div className="space-y-0.5">
              <span className="text-xs font-semibold text-slate-200 block">
                Always run scraper first (override priority rank to preserve API quotas)
              </span>
              <span className="text-[11px] text-gunmetal-muted block">
                When checked, FlightSentry-Scraper is queried before metered APIs regardless of its #{rankIndex + 1} rank. When unchecked, it follows its rank and the active Query Routing Strategy alongside your API providers.
              </span>
            </div>
          </label>
        </div>

        {testError && (
          <div className="p-3 rounded-md bg-red-950/30 border border-red-800/60 flex items-start gap-2.5 text-xs text-red-300">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
            <div className="break-words">{testError}</div>
          </div>
        )}

        {healthResult && (
          <div className="p-3.5 rounded-md bg-gunmetal-card/80 border border-gunmetal-border space-y-3 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold text-slate-200 flex items-center gap-1.5">
                  {healthResult.state === 'ready' ? (
                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                  )}
                  <span>Scraper Telemetry</span>
                </span>
                <span className="px-2 py-0.5 rounded bg-gunmetal-canvas border border-gunmetal-border font-mono text-[11px] text-slate-300">
                  v{healthResult.version}
                </span>
                <span
                  className={`px-2 py-0.5 rounded border text-[11px] font-bold ${
                    STATE_DISPLAY[healthResult.state]?.badgeClass ||
                    'bg-slate-800 text-slate-300 border-slate-700'
                  }`}
                >
                  {STATE_DISPLAY[healthResult.state]?.label || healthResult.state}
                </span>
              </div>
              <span className="text-[11px] font-mono text-gunmetal-muted">
                Queue Depth: <strong className="text-slate-200">{healthResult.queueDepth}</strong>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 font-mono text-[11px]">
              <div className="p-2 rounded bg-gunmetal-canvas/70 border border-gunmetal-border">
                <span className="block text-[10px] font-sans uppercase tracking-wider text-gunmetal-muted">
                  Pause Status
                </span>
                <span className={healthResult.paused ? 'text-amber-300 font-bold' : 'text-slate-200'}>
                  {healthResult.paused ? 'Paused' : 'Active'}
                </span>
                {healthResult.paused && healthResult.statusReason && (
                  <span className="block text-[10px] font-sans text-amber-300/90 mt-0.5 break-words">
                    {healthResult.statusReason}
                  </span>
                )}
              </div>

              <div className="p-2 rounded bg-gunmetal-canvas/70 border border-gunmetal-border">
                <span className="block text-[10px] font-sans uppercase tracking-wider text-gunmetal-muted">
                  Circuit Breaker
                </span>
                <span
                  className={
                    healthResult.circuitBreakerActive ? 'text-amber-300 font-bold' : 'text-slate-200'
                  }
                >
                  {healthResult.circuitBreakerActive ? 'Active (Cooldown)' : 'Inactive'}
                </span>
              </div>

              <div className="p-2 rounded bg-gunmetal-canvas/70 border border-gunmetal-border">
                <span className="block text-[10px] font-sans uppercase tracking-wider text-gunmetal-muted">
                  Rolling Hourly Quota
                </span>
                <span className="text-slate-200 font-semibold">
                  {healthResult.usage.hourlyUsed} / {healthResult.usage.hourlyLimit}
                </span>
              </div>

              <div className="p-2 rounded bg-gunmetal-canvas/70 border border-gunmetal-border">
                <span className="block text-[10px] font-sans uppercase tracking-wider text-gunmetal-muted">
                  Rolling Daily Quota
                </span>
                <span className="text-slate-200 font-semibold">
                  {healthResult.usage.dailyUsed} / {healthResult.usage.dailyLimit}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}