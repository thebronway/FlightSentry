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
    <div className="bg-white dark:bg-gray-900 p-5 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 mb-6 flex flex-col transition-colors">
      <div className="flex justify-between items-center border-b border-gray-100 dark:border-gray-800 pb-3 mb-4">
        <h3 className="text-sm font-bold text-gray-900 dark:text-white">Active Data Sources & Quotas</h3>
        <button 
          onClick={toggleGlobalPause}
          className={`flex items-center space-x-2 px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${
            settings.globalPause === 1 
              ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-400 hover:bg-amber-200 dark:hover:bg-amber-900/50' 
              : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
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
                  <span className="font-bold text-sm text-gray-800 dark:text-gray-200 block">{source.name}</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {source.used} / {isUnlimited ? 'Unlimited' : source.quota} (Resets {settings.quotaResetDate})
                  </span>
                </div>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-2">
                <div className={`h-2 rounded-full ${usagePercent > 90 && !isUnlimited ? 'bg-red-500' : 'bg-indigo-600 dark:bg-indigo-500'}`} style={{ width: `${isUnlimited ? 100 : usagePercent}%` }}></div>
              </div>
            </div>
          );
        })}
        {sources.length === 0 && (
          <div className="col-span-full text-sm text-gray-500 dark:text-gray-400 italic">
            No data sources are currently enabled.
          </div>
        )}
      </div>
    </div>
  );
}