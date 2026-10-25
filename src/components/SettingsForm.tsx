'use client';
import { useEffect, useState } from 'react';
import { Settings as SettingsType } from '@/types';

export default function SettingsForm() {
  const [settings, setSettings] = useState<SettingsType | null>(null);
  const [activeTab, setActiveTab] = useState<'datasources' | 'scheduling' | 'notifications'>('datasources');

  useEffect(() => {
    fetch('/api/settings').then(res => res.json()).then(data => setSettings(data));
  }, []);

  const saveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings)
    });
    if (res.ok) {
      alert('Settings Saved!');
    } else {
      const data = await res.json();
      console.error(data);
      alert('Error saving settings: ' + JSON.stringify(data.error));
    }
  };

  const testWebhook = async () => {
    const res = await fetch('/api/settings/test-notification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings)
    });
    if (res.ok) alert('Test notification sent successfully!');
    else {
      const data = await res.json();
      alert('Test failed: ' + (data.error || 'Check configuration.'));
    }
  };

  if (!settings) return <div className="text-center py-10 dark:text-gray-400">Loading settings...</div>;

  return (
    <form onSubmit={saveSettings} className="space-y-6">
      {/* Tabs Navigation */}
      <div className="flex border-b border-gray-200 dark:border-gray-800">
        <button type="button" onClick={() => setActiveTab('datasources')} className={`px-4 py-2 font-medium text-sm transition-colors ${activeTab === 'datasources' ? 'border-b-2 border-indigo-600 text-indigo-600 dark:text-indigo-400' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>Data Sources</button>
        <button type="button" onClick={() => setActiveTab('scheduling')} className={`px-4 py-2 font-medium text-sm transition-colors ${activeTab === 'scheduling' ? 'border-b-2 border-indigo-600 text-indigo-600 dark:text-indigo-400' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>Scheduling</button>
        <button type="button" onClick={() => setActiveTab('notifications')} className={`px-4 py-2 font-medium text-sm transition-colors ${activeTab === 'notifications' ? 'border-b-2 border-indigo-600 text-indigo-600 dark:text-indigo-400' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>Notifications</button>
      </div>

      {/* Data Sources Tab */}
      {activeTab === 'datasources' && (
        <div className="space-y-6 pt-2">
          <div className="bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-500 p-4 rounded text-sm text-amber-800 dark:text-amber-200">
            <strong>Fast-Flights Disclaimer:</strong> Must run over a home/residential internet connection. Running this directly on cloud hosts (like AWS or DigitalOcean) will result in immediate IP blocks.
          </div>
          
          <div className="grid grid-cols-1 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-1">Fallback Strategy Mode</label>
              <select value={settings.fallbackStrategyMode} onChange={e => setSettings({...settings, fallbackStrategyMode: e.target.value})} className="w-full border p-2 rounded-md bg-white dark:bg-gray-900">
                <option value="sequential-query">Round-Robin (Rotate evenly across all active Data Soruces)</option>
                <option value="exhaust-quota">Exhaust Quota (Use API till limit, then fallback)</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Execution Order Priority</label>
              <div className="border border-gray-200 dark:border-gray-800 rounded-md overflow-hidden bg-gray-50 dark:bg-gray-800/50">
                {['serpapi', 'searchapi', 'fastflights']
                  .sort((a, b) => {
                    const order = (settings.dataSourceStrategy || '').split(',').filter(Boolean);
                    const indexA = order.indexOf(a) === -1 ? 99 : order.indexOf(a);
                    const indexB = order.indexOf(b) === -1 ? 99 : order.indexOf(b);
                    return indexA - indexB;
                  })
                  .map((source, index, array) => {
                    const names: Record<string, string> = { serpapi: 'SerpAPI', searchapi: 'SearchApi.io', fastflights: 'Fast-Flights' };
                    const isEnabled = source === 'serpapi' ? settings.serpApiEnabled : source === 'searchapi' ? settings.searchApiEnabled : settings.fastFlightsEnabled;
                    
                    const move = (dir: number) => {
                       const newOrder = [...array];
                       const temp = newOrder[index];
                       newOrder[index] = newOrder[index + dir];
                       newOrder[index + dir] = temp;
                       setSettings({...settings, dataSourceStrategy: newOrder.join(',')});
                    };

                    return (
                      <div key={source} className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-800 last:border-0 bg-white dark:bg-gray-900">
                        <div className="flex items-center gap-3">
                          <span className={`w-2 h-2 rounded-full ${isEnabled === 1 ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-700'}`}></span>
                          <span className="font-medium text-sm text-gray-900 dark:text-white">{names[source]}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button type="button" onClick={() => move(-1)} disabled={index === 0} className="p-2 text-gray-500 hover:text-indigo-600 disabled:opacity-30 disabled:hover:text-gray-500 transition-colors">
                            ▲
                          </button>
                          <button type="button" onClick={() => move(1)} disabled={index === array.length - 1} className="p-2 text-gray-500 hover:text-indigo-600 disabled:opacity-30 disabled:hover:text-gray-500 transition-colors">
                            ▼
                          </button>
                        </div>
                      </div>
                    );
                })}
              </div>
              <p className="text-xs text-gray-500 mt-2">Use the arrows to rank fallback order. Green dots indicate the source is currently enabled.</p>
            </div>
          </div>

          <div className="p-4 border rounded-md border-gray-200 dark:border-gray-800 space-y-4">
            <div className="flex justify-between items-center">
              <label className="flex items-center gap-2 font-bold text-gray-900 dark:text-white">
                <input type="checkbox" checked={settings.serpApiEnabled === 1} onChange={e => setSettings({...settings, serpApiEnabled: e.target.checked ? 1 : 0})} className="w-4 h-4 text-indigo-600 rounded" />
                Enable SerpAPI
              </label>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">API Key</label>
                <input type="password" required={settings.serpApiEnabled === 1} value={settings.serpApiKey || ''} onChange={e => setSettings({...settings, serpApiKey: e.target.value})} className="w-full border p-2 rounded-md bg-white dark:bg-gray-900" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Monthly Quota (0 = Unlimited)</label>
                <input type="number" value={settings.serpApiQuota} onChange={e => setSettings({...settings, serpApiQuota: e.target.value === '' ? 0 : Number(e.target.value)})} className="w-full border p-2 rounded-md bg-white dark:bg-gray-900" />
              </div>
            </div>
          </div>

          <div className="p-4 border rounded-md border-gray-200 dark:border-gray-800 space-y-4">
            <div className="flex justify-between items-center">
              <label className="flex items-center gap-2 font-bold text-gray-900 dark:text-white">
                <input type="checkbox" checked={settings.searchApiEnabled === 1} onChange={e => setSettings({...settings, searchApiEnabled: e.target.checked ? 1 : 0})} className="w-4 h-4 text-indigo-600 rounded" />
                Enable SearchApi.io
              </label>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">API Key</label>
                <input type="password" required={settings.searchApiEnabled === 1} value={settings.searchApiKey || ''} onChange={e => setSettings({...settings, searchApiKey: e.target.value})} className="w-full border p-2 rounded-md bg-white dark:bg-gray-900" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Monthly Quota (0 = Unlimited)</label>
                <input type="number" value={settings.searchApiQuota} onChange={e => setSettings({...settings, searchApiQuota: e.target.value === '' ? 0 : Number(e.target.value)})} className="w-full border p-2 rounded-md bg-white dark:bg-gray-900" />
              </div>
            </div>
          </div>

          <div className="p-4 border rounded-md border-gray-200 dark:border-gray-800 space-y-4">
            <div className="flex justify-between items-center">
              <label className="flex items-center gap-2 font-bold text-gray-900 dark:text-white">
                <input type="checkbox" checked={settings.fastFlightsEnabled === 1} onChange={e => setSettings({...settings, fastFlightsEnabled: e.target.checked ? 1 : 0})} className="w-4 h-4 text-indigo-600 rounded" />
                Enable Fast-Flights
              </label>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Monthly Quota (0 = Unlimited)</label>
                <input type="number" value={settings.fastFlightsQuota} onChange={e => setSettings({...settings, fastFlightsQuota: e.target.value === '' ? 0 : Number(e.target.value)})} className="w-full border p-2 rounded-md bg-white dark:bg-gray-900" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Scheduling Tab */}
      {activeTab === 'scheduling' && (
        <div className="space-y-6 pt-2">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Far Out (&gt;90 days)</label>
              <div className="flex items-center gap-2">
                <input type="number" value={settings.scheduleFarOut} onChange={e => setSettings({...settings, scheduleFarOut: Number(e.target.value)})} className="w-full border p-2 rounded-md bg-white dark:bg-gray-900" />
                <span className="text-sm text-gray-500">hrs</span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Standard (14-90 days)</label>
              <div className="flex items-center gap-2">
                <input type="number" value={settings.scheduleStandard} onChange={e => setSettings({...settings, scheduleStandard: Number(e.target.value)})} className="w-full border p-2 rounded-md bg-white dark:bg-gray-900" />
                <span className="text-sm text-gray-500">hrs</span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Final Stretch (&lt;14 days)</label>
              <div className="flex items-center gap-2">
                <input type="number" value={settings.scheduleFinalStretch} onChange={e => setSettings({...settings, scheduleFinalStretch: Number(e.target.value)})} className="w-full border p-2 rounded-md bg-white dark:bg-gray-900" />
                <span className="text-sm text-gray-500">hrs</span>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Operating Start Hour (Local)</label>
              <input type="number" min="0" max="23" value={settings.operatingHoursStart} onChange={e => setSettings({...settings, operatingHoursStart: Number(e.target.value)})} className="w-full border p-2 rounded-md bg-white dark:bg-gray-900" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Operating End Hour (Local)</label>
              <input type="number" min="0" max="23" value={settings.operatingHoursEnd} onChange={e => setSettings({...settings, operatingHoursEnd: Number(e.target.value)})} className="w-full border p-2 rounded-md bg-white dark:bg-gray-900" />
            </div>
          </div>
        </div>
      )}

      {/* Notifications Tab */}
      {activeTab === 'notifications' && (
        <div className="space-y-6 pt-2">
          <div className="flex items-center gap-2 mb-4">
            <input type="checkbox" id="notificationsEnabled" checked={settings.notificationsEnabled === 1} onChange={e => setSettings({...settings, notificationsEnabled: e.target.checked ? 1 : 0})} className="w-5 h-5 text-indigo-600 rounded" />
            <label htmlFor="notificationsEnabled" className="font-bold text-gray-900 dark:text-white">Enable Global Notifications</label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Min $ Drop to Alert</label>
              <div className="flex items-center gap-2">
                <span className="text-gray-500">$</span>
                <input type="number" value={settings.minDropDollar} onChange={e => setSettings({...settings, minDropDollar: Number(e.target.value)})} className="w-full border p-2 rounded-md bg-white dark:bg-gray-900" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Min % Drop to Alert</label>
              <div className="flex items-center gap-2">
                <input type="number" value={settings.minDropPercent} onChange={e => setSettings({...settings, minDropPercent: Number(e.target.value)})} className="w-full border p-2 rounded-md bg-white dark:bg-gray-900" />
                <span className="text-gray-500">%</span>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-md border border-gray-200 dark:border-gray-700">
            <h3 className="font-bold text-sm mb-3">Webhook (Discord, Slack, Apprise)</h3>
            <label className="block text-xs font-medium mb-1">Webhook URL</label>
            <input type="url" value={settings.appriseUrl || ''} onChange={e => setSettings({...settings, appriseUrl: e.target.value})} className="w-full border p-2 rounded-md bg-white dark:bg-gray-900 mb-2" placeholder="https://discord.com/api/webhooks/..." />
          </div>

          <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-md border border-gray-200 dark:border-gray-700 space-y-4">
            <h3 className="font-bold text-sm">SMTP Email Configuration</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-medium mb-1">SMTP Host</label>
                <input type="text" value={settings.smtpHost || ''} onChange={e => setSettings({...settings, smtpHost: e.target.value})} className="w-full border p-2 rounded-md bg-white dark:bg-gray-900" placeholder="smtp.gmail.com" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">SMTP Port</label>
                <input type="number" value={settings.smtpPort || ''} onChange={e => setSettings({...settings, smtpPort: e.target.value ? Number(e.target.value) : null})} className="w-full border p-2 rounded-md bg-white dark:bg-gray-900" placeholder="587" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium mb-1">SMTP Username</label>
                <input type="text" value={settings.smtpUser || ''} onChange={e => setSettings({...settings, smtpUser: e.target.value})} className="w-full border p-2 rounded-md bg-white dark:bg-gray-900" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">SMTP Password</label>
                <input type="password" value={settings.smtpPass || ''} onChange={e => setSettings({...settings, smtpPass: e.target.value})} className="w-full border p-2 rounded-md bg-white dark:bg-gray-900" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium mb-1">From Address</label>
                <input type="email" value={settings.smtpFrom || ''} onChange={e => setSettings({...settings, smtpFrom: e.target.value})} className="w-full border p-2 rounded-md bg-white dark:bg-gray-900" placeholder="alerts@flightsentry.local" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">To Address</label>
                <input type="email" value={settings.smtpTo || ''} onChange={e => setSettings({...settings, smtpTo: e.target.value})} className="w-full border p-2 rounded-md bg-white dark:bg-gray-900" placeholder="you@email.com" />
              </div>
            </div>
          </div>
          
          <button type="button" onClick={testWebhook} className="text-sm font-medium px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-md transition-colors">
            Test Notifications
          </button>
        </div>
      )}

      <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
        <button type="submit" className="w-full bg-indigo-600 dark:bg-indigo-500 text-white font-medium py-3 rounded-md hover:bg-indigo-700 transition-colors">
          Save All Settings
        </button>
      </div>
    </form>
  );
}