'use client';
import { useEffect, useState } from 'react';
import { Settings as SettingsType } from '@/types';

export default function SettingsForm() {
  const [settings, setSettings] = useState<SettingsType | null>(null);

  useEffect(() => {
    fetch('/api/settings').then(res => res.json()).then(data => setSettings(data));
  }, []);

  const saveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings)
    });
    alert('Settings Saved!');
  };

  const testWebhook = async () => {
    const res = await fetch('/api/settings/test-notification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ appriseUrl: settings?.appriseUrl })
    });
    if (res.ok) alert('Test sent!');
    else alert('Test failed. Check URL.');
  };

  if (!settings) return <div className="text-center py-10 dark:text-gray-400">Loading settings...</div>;

  return (
    <form onSubmit={saveSettings} className="space-y-6">
      <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-md border border-gray-200 dark:border-gray-700">
        <label className="block text-sm font-bold text-gray-900 dark:text-gray-200 mb-1">SerpApi Key</label>
        <input type="password" value={settings.serpApiKey || ''} onChange={e => setSettings({...settings, serpApiKey: e.target.value})} className="w-full border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white rounded-md shadow-sm border p-2" />
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Required to query Google Flights.</p>
      </div>

      <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-md border border-gray-200 dark:border-gray-700">
        <label className="block text-sm font-bold text-gray-900 dark:text-gray-200 mb-1">Apprise Webhook URL</label>
        <input type="url" placeholder="http://apprise:8000/notify/..." value={settings.appriseUrl || ''} onChange={e => setSettings({...settings, appriseUrl: e.target.value})} className="w-full border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white rounded-md shadow-sm border p-2" />
        <button type="button" onClick={testWebhook} className="mt-2 text-sm text-indigo-600 dark:text-indigo-400 hover:underline font-medium">Send Test Notification</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Min $ Drop to Alert</label>
          <input type="number" value={settings.minDropDollar} onChange={e => setSettings({...settings, minDropDollar: Number(e.target.value)})} className="w-full border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white rounded-md shadow-sm border p-2" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Min % Drop to Alert</label>
          <input type="number" value={settings.minDropPercent} onChange={e => setSettings({...settings, minDropPercent: Number(e.target.value)})} className="w-full border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white rounded-md shadow-sm border p-2" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Monthly API Quota</label>
          <input type="number" value={settings.monthlyQuota} onChange={e => setSettings({...settings, monthlyQuota: Number(e.target.value)})} className="w-full border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white rounded-md shadow-sm border p-2" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Check Hours (UTC Array)</label>
          <input type="text" placeholder="[8, 16]" value={settings.checkHours} onChange={e => setSettings({...settings, checkHours: e.target.value})} className="w-full border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white rounded-md shadow-sm border p-2 font-mono text-sm" />
        </div>
      </div>

      <button type="submit" className="w-full bg-indigo-600 dark:bg-indigo-500 text-white font-medium py-3 rounded-md hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-colors">
        Save All Settings
      </button>
    </form>
  );
}