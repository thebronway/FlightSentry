'use client';
import { useEffect, useState } from 'react';
import { Settings as SettingsType } from '@/types';
import { PauseCircle, PlayCircle } from 'lucide-react';

export default function QuotaRibbon() {
  const [settings, setSettings] = useState<SettingsType | null>(null);

  const fetchSettings = async () => {
    const res = await fetch('/api/settings');
    if (res.ok) setSettings(await res.json());
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const toggleGlobalPause = async () => {
    if (!settings) return;
    const newPauseState = settings.globalPause === 1 ? 0 : 1;
    await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...settings, globalPause: newPauseState })
    });
    fetchSettings();
  };

  if (!settings) return null;

  const sources = [
    { name: 'SerpAPI', enabled: settings.serpApiEnabled, used: settings.serpApiUsed, quota: settings.serpApiQuota },
    { name: 'SearchApi.io', enabled: settings.searchApiEnabled, used: settings.searchApiUsed, quota: settings.searchApiQuota },
    { name: 'Fast-Flights', enabled: settings.fastFlightsEnabled, used: settings.fastFlightsUsed, quota: settings.fastFlightsQuota },
  ].filter(s => s.enabled === 1);

  return (
    <div className="bg-white dark:bg-gunmetal-card p-5 rounded-lg shadow-sm border border-gray-200 dark:border-gunmetal-border mb-6 flex flex-col transition-colors">
      <div className="flex justify-between items-center border-b border-gunmetal-border pb-3 mb-4">
        <h3 className="text-sm font-bold text-slate-200">Active Data Sources & Quotas</h3>
        <button 
          onClick={toggleGlobalPause}
          className={`flex items-center space-x-2 px-3 py-1.5 rounded-md text-xs font-medium transition-colors shadow-sm ${
            settings.globalPause === 1 
              ? 'bg-amber-950/40 border border-amber-500 text-amber-300 hover:bg-amber-900/60 hover:border-amber-400'
              : 'bg-gunmetal-border border border-slate-500 text-slate-100 hover:bg-slate-700 hover:border-slate-400'
          }`}
        >
          {settings.globalPause === 1 ? <PlayCircle className="w-4 h-4" /> : <PauseCircle className="w-4 h-4" />}
          <span>{settings.globalPause === 1 ? 'Global Worker Paused' : 'Pause All Worker Jobs'}</span>
        </button>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {sources.map(source => {
          const isUnlimited = source.quota === 0;
          const usagePercent = isUnlimited ? 0 : Math.min((source.used / source.quota) * 100, 100);
          
          return (
            <div key={source.name} className="flex flex-col gap-2">
              <div className="flex justify-between items-end">
                <div>
                  <span className="font-bold text-sm text-slate-200 block">{source.name}</span>
                  <span className="text-xs text-gunmetal-muted">
                    {source.used} / {isUnlimited ? 'Unlimited' : source.quota} (Resets {settings.quotaResetDate})
                  </span>
                </div>
              </div>
              <div className="w-full bg-gunmetal-canvas border border-gunmetal-border rounded-full h-2 overflow-hidden">
                <div className={`h-full rounded-full transition-all ${usagePercent > 90 && !isUnlimited ? 'bg-red-500' : 'bg-sky-500'}`} style={{ width: `${isUnlimited ? 100 : usagePercent}%` }}></div>
              </div>
            </div>
          );
        })}
        {sources.length === 0 && (
          <div className="col-span-full text-sm text-gunmetal-muted italic">
            No data sources are currently enabled.
          </div>
        )}
      </div>
    </div>
  );
}