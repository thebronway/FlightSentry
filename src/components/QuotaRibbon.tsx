'use client';

import { useEffect, useState } from 'react';
import { Settings as SettingsType } from '@/types';
import { PauseCircle, PlayCircle, Pause, Play } from 'lucide-react';

interface Props {
  refreshTrigger?: number;
}

export default function QuotaRibbon({ refreshTrigger = 0 }: Props) {
  const [settings, setSettings] = useState<SettingsType | null>(null);

  const fetchSettings = async () => {
    const res = await fetch('/api/settings');
    if (res.ok) setSettings(await res.json());
  };

  useEffect(() => {
    fetchSettings();
  }, [refreshTrigger]);

  const toggleGlobalPause = async () => {
    if (!settings) return;
    const newPauseState = settings.globalPause === 1 ? 0 : 1;
    await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...settings, globalPause: newPauseState }),
    });
    fetchSettings();
  };

  const toggleSourcePause = async (pauseKey: 'serpApiPaused' | 'searchApiPaused' | 'fastFlightsPaused') => {
    if (!settings) return;
    const currentState = settings[pauseKey] === 1;
    await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...settings, [pauseKey]: currentState ? 0 : 1 }),
    });
    fetchSettings();
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
    },
    {
      key: 'searchapi',
      name: 'SearchApi.io',
      enabled: settings.searchApiEnabled,
      paused: settings.searchApiPaused,
      pauseKey: 'searchApiPaused' as const,
      used: settings.searchApiUsed,
      quota: settings.searchApiQuota,
    },
    {
      key: 'fastflights',
      name: 'Fast-Flights',
      enabled: settings.fastFlightsEnabled,
      paused: settings.fastFlightsPaused,
      pauseKey: 'fastFlightsPaused' as const,
      used: settings.fastFlightsUsed,
      quota: settings.fastFlightsQuota,
    },
  ].filter(s => s.enabled === 1);

  // Dynamic grid fitting up to 3 per line, wrapping onto second line if 4-6
  const gridLayoutClass = sources.length === 1
    ? 'grid-cols-1'
    : sources.length === 2
    ? 'grid-cols-1 md:grid-cols-2'
    : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3';

  return (
    <div className="bg-gunmetal-card p-5 rounded-lg shadow-sm border border-gunmetal-border mb-6 flex flex-col transition-colors">
      <div className="flex justify-between items-center border-b border-gunmetal-border pb-3 mb-4">
        <div>
          <h3 className="text-sm font-bold text-slate-200">Active Data Sources & Monthly Quotas</h3>
          <p className="text-xs text-gunmetal-muted mt-0.5">Quota reset date: {settings.quotaResetDate}</p>
        </div>
        <button 
          onClick={toggleGlobalPause}
          className={`flex items-center space-x-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors shadow-sm ${
            settings.globalPause === 1 
              ? 'bg-amber-950/50 border border-amber-500 text-amber-300 hover:bg-amber-900/60'
              : 'bg-gunmetal-border border border-slate-500 text-slate-100 hover:bg-slate-700'
          }`}
        >
          {settings.globalPause === 1 ? <PlayCircle className="w-4 h-4" /> : <PauseCircle className="w-4 h-4" />}
          <span>{settings.globalPause === 1 ? 'All Data Sources Paused (Resume)' : 'Pause All Data Sources'}</span>
        </button>
      </div>
      
      <div className={`grid ${gridLayoutClass} gap-4`}>
        {sources.map(source => {
          const isUnlimited = source.quota === 0;
          const usagePercent = isUnlimited ? 0 : Math.min((source.used / source.quota) * 100, 100);
          const isPaused = source.paused === 1;

          return (
            <div 
              key={source.key} 
              className={`p-3.5 rounded-md border bg-gunmetal-canvas/60 flex flex-col justify-between transition-colors ${
                isPaused ? 'border-amber-900/40 opacity-70' : 'border-gunmetal-border'
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-200">{source.name}</span>
                    {isPaused && (
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-950/60 text-amber-400 border border-amber-800/50">
                        PAUSED
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-gunmetal-muted">
                    {source.used} / {isUnlimited ? 'Unlimited' : source.quota} queries
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => toggleSourcePause(source.pauseKey)}
                  title={isPaused ? `Resume ${source.name}` : `Pause ${source.name}`}
                  className={`p-1.5 rounded text-xs flex items-center gap-1 font-medium transition-colors border ${
                    isPaused
                      ? 'bg-amber-950/50 text-amber-400 border-amber-700 hover:bg-amber-900/50'
                      : 'bg-gunmetal-card text-gunmetal-muted border-gunmetal-border hover:text-slate-200 hover:border-slate-500'
                  }`}
                >
                  {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                  <span className="text-[11px]">{isPaused ? 'Resume' : 'Pause'}</span>
                </button>
              </div>

              <div className="w-full bg-gunmetal-card border border-gunmetal-border rounded-full h-2 overflow-hidden mt-1">
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
    </div>
  );
}