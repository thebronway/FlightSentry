'use client';

import { useEffect, useState } from 'react';
import { Settings as SettingsType } from '@/types';
import { PauseCircle, PlayCircle, Pause, Play, ChevronDown, ChevronUp } from 'lucide-react';

interface Props {
  refreshTrigger?: number;
  onSettingsChange?: (settings: SettingsType) => void;
}

export default function QuotaRibbon({ refreshTrigger = 0, onSettingsChange }: Props) {
  const [settings, setSettings] = useState<SettingsType | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('flightsentry_quota_ribbon_collapsed');
      if (stored !== null) {
        setIsCollapsed(stored === 'true');
      }
    } catch {}
  }, []);

  const handleToggleCollapse = () => {
    setIsCollapsed(prev => {
      const next = !prev;
      try {
        localStorage.setItem('flightsentry_quota_ribbon_collapsed', String(next));
      } catch {}
      return next;
    });
  };

  const fetchSettings = async () => {
    const res = await fetch('/api/settings', { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      setSettings(data);
      onSettingsChange?.(data);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, [refreshTrigger]);

  const toggleGlobalPause = async () => {
    if (!settings) return;
    const isCurrentlyAllPaused =
      settings.globalPause === 1 ||
      (sources.length > 0 && sources.every(s => s.paused === 1));

    const nextPauseState = isCurrentlyAllPaused ? 0 : 1;
    const payload = {
      ...settings,
      globalPause: nextPauseState,
      serpApiPaused: nextPauseState,
      searchApiPaused: nextPauseState,
      hasdataPaused: nextPauseState,
      fastFlightsPaused: nextPauseState,
    };

    const res = await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const updated = await res.json();
      setSettings(updated);
      onSettingsChange?.(updated);
    } else {
      fetchSettings();
    }
  };

  const toggleSourcePause = async (pauseKey: 'serpApiPaused' | 'searchApiPaused' | 'hasdataPaused' | 'fastFlightsPaused') => {
    if (!settings) return;
    const nextSourceState = settings[pauseKey] === 1 ? 0 : 1;
    const updatedDraft = {
      ...settings,
      [pauseKey]: nextSourceState,
    };

    // Evaluate whether all enabled data sources are paused after this change
    const checkSources = [
      { enabled: updatedDraft.serpApiEnabled, paused: updatedDraft.serpApiPaused },
      { enabled: updatedDraft.searchApiEnabled, paused: updatedDraft.searchApiPaused },
      { enabled: updatedDraft.hasdataEnabled, paused: updatedDraft.hasdataPaused },
      { enabled: updatedDraft.fastFlightsEnabled, paused: updatedDraft.fastFlightsPaused },
    ].filter(s => s.enabled === 1);

    const willAllBePaused = checkSources.length > 0 && checkSources.every(s => s.paused === 1);
    updatedDraft.globalPause = willAllBePaused ? 1 : 0;

    const res = await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedDraft),
    });
    if (res.ok) {
      const updated = await res.json();
      setSettings(updated);
      onSettingsChange?.(updated);
    } else {
      fetchSettings();
    }
  };

  if (!settings) return null;

  const sources = [
    {
      key: 'serpapi',
      name: 'SerpAPI',
      enabled: settings.serpApiEnabled,
      paused: settings.serpApiPaused,
      pauseKey: 'serpApiPaused' as const,
      used: settings.serpApiUsed,
      quota: settings.serpApiQuota,
      resetDate: settings.serpApiResetDate || settings.quotaResetDate,
      isScraper: false,
    },
    {
      key: 'searchapi',
      name: 'SearchApi.io',
      enabled: settings.searchApiEnabled,
      paused: settings.searchApiPaused,
      pauseKey: 'searchApiPaused' as const,
      used: settings.searchApiUsed,
      quota: settings.searchApiQuota,
      resetDate: settings.searchApiResetDate || settings.quotaResetDate,
      isScraper: false,
    },
    {
      key: 'hasdata',
      name: 'HasData',
      enabled: settings.hasdataEnabled,
      paused: settings.hasdataPaused,
      pauseKey: 'hasdataPaused' as const,
      used: settings.hasdataUsed,
      quota: settings.hasdataQuota,
      resetDate: settings.hasdataResetDate || settings.quotaResetDate,
      isScraper: false,
    },
    {
      key: 'fastflights',
      name: 'Fast-Flights',
      enabled: settings.fastFlightsEnabled,
      paused: settings.fastFlightsPaused,
      pauseKey: 'fastFlightsPaused' as const,
      used: settings.fastFlightsUsed,
      quota: 0,
      resetDate: null,
      isScraper: true,
    },
  ].filter(s => s.enabled === 1);

  const meteredSources = sources.filter(s => !s.isScraper && s.quota > 0);
  const unlimitedSources = sources.filter(s => s.isScraper || s.quota === 0);

  const totalMeteredUsed = meteredSources.reduce((sum, s) => sum + s.used, 0);
  const totalMeteredQuota = meteredSources.reduce((sum, s) => sum + s.quota, 0);
  const totalUnlimitedUsed = unlimitedSources.reduce((sum, s) => sum + s.used, 0);

  const isAllPaused =
    settings.globalPause === 1 ||
    (sources.length > 0 && sources.every(s => s.paused === 1));

  return (
    <div className="bg-gunmetal-card p-4 sm:p-5 rounded-lg shadow-sm border border-gunmetal-border mb-6 flex flex-col transition-colors">
      <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${!isCollapsed ? 'border-b border-gunmetal-border pb-3 mb-4' : ''}`}>
        <div className="flex flex-wrap items-center gap-3">
          <h3 className="text-sm font-bold text-slate-200">Active Data Sources & Monthly Quotas</h3>
          {isCollapsed && (
            <div className="flex flex-wrap items-center gap-2">
              {meteredSources.length > 0 && (
                <span className="text-xs font-mono px-2.5 py-1 rounded-md bg-gunmetal-canvas border border-gunmetal-border text-slate-200">
                  <span className="text-gunmetal-muted mr-1.5 font-sans font-medium">Metered:</span>
                  <span className="font-semibold text-slate-100">{totalMeteredUsed}</span>
                  <span className="text-gunmetal-muted mx-1">/</span>
                  <span>{totalMeteredQuota}</span>
                </span>
              )}
              {unlimitedSources.length > 0 && (
                <span className="text-xs font-mono px-2.5 py-1 rounded-md bg-gunmetal-canvas border border-gunmetal-border text-slate-200">
                  <span className="text-gunmetal-muted mr-1.5 font-sans font-medium">Unlimited:</span>
                  <span className="font-semibold text-slate-100">{totalUnlimitedUsed}</span>
                  <span className="text-gunmetal-muted ml-1 font-sans">{totalUnlimitedUsed === 1 ? 'query' : 'queries'}</span>
                </span>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button 
            type="button"
            onClick={toggleGlobalPause}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors shadow-sm ${
              isAllPaused 
                ? 'bg-amber-950/50 border border-amber-500 text-amber-300 hover:bg-amber-900/60'
                : 'bg-gunmetal-border border border-slate-500 text-slate-100 hover:bg-slate-700'
            }`}
          >
            {isAllPaused ? <PlayCircle className="w-4 h-4" /> : <PauseCircle className="w-4 h-4" />}
            <span>{isAllPaused ? 'Resume All Data Sources' : 'Pause All Data Sources'}</span>
          </button>

          {sources.length > 0 && (
            <button
              type="button"
              onClick={handleToggleCollapse}
              title={isCollapsed ? 'Expand ribbon' : 'Collapse ribbon'}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold bg-gunmetal-card border border-gunmetal-border text-gunmetal-muted hover:text-slate-200 hover:border-slate-500 transition-colors shadow-sm"
            >
              {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
              <span>{isCollapsed ? 'Expand' : 'Collapse'}</span>
            </button>
          )}
        </div>
      </div>
      
      {!isCollapsed && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {sources.map((source, index) => {
            const isUnlimited = source.quota === 0;
            const usagePercent = isUnlimited ? 0 : Math.min((source.used / source.quota) * 100, 100);
            const isPaused = source.paused === 1;
            const isLastOdd = sources.length % 2 !== 0 && index === sources.length - 1;

            return (
              <div 
                key={source.key} 
                className={`p-3 rounded-md border bg-gunmetal-canvas/60 flex flex-col justify-between gap-2.5 transition-colors ${
                  isLastOdd ? 'md:col-span-2' : ''
                } ${isPaused ? 'border-amber-900/40 opacity-70' : 'border-gunmetal-border'}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-bold text-sm text-slate-200 truncate">{source.name}</span>
                    {isPaused && (
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-950/60 text-amber-400 border border-amber-800/50 flex-shrink-0">
                        PAUSED
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 text-xs text-gunmetal-muted">
                    <span className="font-mono whitespace-nowrap">
                      <span className="text-slate-200 font-semibold">{source.used}</span> / {isUnlimited ? 'Unlimited' : source.quota} queries
                    </span>
                    {!source.isScraper && source.resetDate && (
                      <span className="text-[11px] text-gunmetal-muted font-mono hidden sm:inline whitespace-nowrap">
                        Resets: {source.resetDate}
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => toggleSourcePause(source.pauseKey)}
                    title={isPaused ? `Resume ${source.name}` : `Pause ${source.name}`}
                    className={`p-1.5 rounded text-xs flex items-center gap-1 font-medium transition-colors border flex-shrink-0 ${
                      isPaused
                        ? 'bg-amber-950/50 text-amber-400 border-amber-700 hover:bg-amber-900/50'
                        : 'bg-gunmetal-card text-gunmetal-muted border-gunmetal-border hover:text-slate-200 hover:border-slate-500'
                    }`}
                  >
                    {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                    <span className="text-[11px] hidden xs:inline sm:inline">{isPaused ? 'Resume' : 'Pause'}</span>
                  </button>
                </div>

                <div className="w-full bg-gunmetal-card border border-gunmetal-border rounded-full h-1.5 overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all ${
                      isPaused ? 'bg-amber-600' : usagePercent > 90 && !isUnlimited ? 'bg-red-500' : 'bg-sky-500'
                    }`} 
                    style={{ width: `${isUnlimited ? 100 : usagePercent}%` }}
                  />
                </div>
              </div>
            );
          })}
          {sources.length === 0 && (
            <div className="col-span-full text-sm text-gunmetal-muted italic py-2">
              No data sources are currently enabled in Settings.
            </div>
          )}
        </div>
      )}
    </div>
  );
}