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

  const togglePause = async () => {
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

  const usagePercent = Math.min((settings.apiSearchesUsed / settings.monthlyQuota) * 100, 100);

  return (
    <div className="bg-white dark:bg-gray-900 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 mb-6 flex flex-col sm:flex-row items-center justify-between gap-4 transition-colors">
      <div className="flex-grow w-full">
        <div className="flex justify-between text-sm mb-1">
          <span className="font-medium text-gray-700 dark:text-gray-300">SerpApi Quota</span>
          <span className="text-gray-500 dark:text-gray-400">{settings.apiSearchesUsed} / {settings.monthlyQuota} used (Resets {settings.quotaResetDate})</span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-2.5">
          <div className={`h-2.5 rounded-full ${usagePercent > 90 ? 'bg-red-500' : 'bg-indigo-600 dark:bg-indigo-500'}`} style={{ width: `${usagePercent}%` }}></div>
        </div>
      </div>
      
      <button 
        onClick={togglePause}
        className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
          settings.globalPause === 1 
            ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-400 hover:bg-amber-200 dark:hover:bg-amber-900/50' 
            : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
        }`}
      >
        {settings.globalPause === 1 ? <PlayCircle className="w-4 h-4" /> : <PauseCircle className="w-4 h-4" />}
        <span>{settings.globalPause === 1 ? 'Worker Paused' : 'Pause Worker'}</span>
      </button>
    </div>
  );
}