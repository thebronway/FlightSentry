'use client';

import { useEffect, useState } from 'react';
import { Settings as SettingsType } from '@/types';
import { ChevronUp, ChevronDown } from 'lucide-react';

export default function SettingsForm() {
  const [settings, setSettings] = useState<SettingsType | null>(null);
  const [activeTab, setActiveTab] = useState<'datasources' | 'scheduling' | 'notifications'>('datasources');
  const [savingChannel, setSavingChannel] = useState<string | null>(null);
  const [channelStatus, setChannelStatus] = useState<Record<string, { type: 'success' | 'error'; message: string } | null>>({});

  useEffect(() => {
    fetch('/api/settings').then(res => res.json()).then(data => {
      const allKeys = ['serpapi', 'searchapi', 'hasdata', 'fastflights'];
      const existing = (data.dataSourceStrategy || '').split(',').map((s: string) => s.trim()).filter(Boolean);
      allKeys.forEach(k => {
        if (!existing.includes(k)) existing.push(k);
      });
      setSettings({ ...data, dataSourceStrategy: existing.join(',') });
    });
  }, []);

  const persistSettings = async (updatedSettings: SettingsType): Promise<boolean> => {
    const res = await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedSettings),
    });
    if (res.ok) {
      const saved = await res.json();
      setSettings(saved);
      return true;
    }
    const data = await res.json();
    alert('Error saving settings: ' + JSON.stringify(data.error));
    return false;
  };

  const saveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    const ok = await persistSettings(settings);
    if (ok) alert('Settings Saved!');
  };

  const handleChannelSave = async (channelKey: string) => {
    if (!settings) return;
    setSavingChannel(channelKey);
    setChannelStatus(prev => ({ ...prev, [channelKey]: null }));
    const ok = await persistSettings(settings);
    setSavingChannel(null);
    if (ok) {
      setChannelStatus(prev => ({
        ...prev,
        [channelKey]: { type: 'success', message: 'Channel settings saved!' },
      }));
      setTimeout(() => setChannelStatus(prev => ({ ...prev, [channelKey]: null })), 4000);
    }
  };

  const handleChannelSaveAndTest = async (channelKey: 'discord' | 'slack' | 'generic' | 'smtp') => {
    if (!settings) return;
    setSavingChannel(channelKey);
    setChannelStatus(prev => ({ ...prev, [channelKey]: null }));
    const ok = await persistSettings(settings);
    if (!ok) {
      setSavingChannel(null);
      return;
    }

    try {
      const res = await fetch('/api/settings/test-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...settings, channel: channelKey }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setChannelStatus(prev => ({
          ...prev,
          [channelKey]: { type: 'success', message: 'Test notification sent successfully!' },
        }));
      } else {
        setChannelStatus(prev => ({
          ...prev,
          [channelKey]: { type: 'error', message: data.error || 'Test notification failed.' },
        }));
      }
    } catch (err: any) {
      setChannelStatus(prev => ({
        ...prev,
        [channelKey]: { type: 'error', message: err.message || 'Network error during test.' },
      }));
    } finally {
      setSavingChannel(null);
    }
  };

  if (!settings) return <div className="text-center py-10 dark:text-gray-400">Loading settings...</div>;

  return (
    <form onSubmit={saveSettings} className="space-y-6">
      {/* Tabs Navigation */}
      <div className="flex border-b border-gunmetal-border">
        <button type="button" onClick={() => setActiveTab('datasources')} className={`px-4 py-2 font-medium text-sm transition-colors ${activeTab === 'datasources' ? 'border-b-2 border-slate-300 text-slate-100 font-semibold' : 'text-gunmetal-muted hover:text-slate-300'}`}>Data Sources</button>
        <button type="button" onClick={() => setActiveTab('scheduling')} className={`px-4 py-2 font-medium text-sm transition-colors ${activeTab === 'scheduling' ? 'border-b-2 border-slate-300 text-slate-100 font-semibold' : 'text-gunmetal-muted hover:text-slate-300'}`}>Scheduling</button>
        <button type="button" onClick={() => setActiveTab('notifications')} className={`px-4 py-2 font-medium text-sm transition-colors ${activeTab === 'notifications' ? 'border-b-2 border-slate-300 text-slate-100 font-semibold' : 'text-gunmetal-muted hover:text-slate-300'}`}>Notifications</button>
      </div>

      {/* Data Sources Tab */}
      {activeTab === 'datasources' && (
        <div className="space-y-6 pt-2">
          <div className="bg-gunmetal-canvas/60 border border-gunmetal-border p-3.5 rounded-lg text-xs text-slate-300">
            <p className="font-semibold text-slate-200 mb-0.5">Data Sources & Query Routing</p>
            Configure flight search providers, monthly query allowances, and routing strategies. Flight checks dynamically query active sources based on priority order and configured fallback behavior.
          </div>

          {/* Query Routing Strategy Selector */}
          <div className="bg-gunmetal-canvas/60 border border-gunmetal-border p-4 rounded-lg space-y-2">
            <label className="block text-sm font-semibold text-slate-200">Query Routing Strategy</label>
            <select 
              value={settings.fallbackStrategyMode} 
              onChange={e => setSettings({...settings, fallbackStrategyMode: e.target.value})} 
              className="w-full border border-gunmetal-border p-2.5 rounded-md bg-gunmetal-canvas text-slate-200 focus:outline-none focus:border-slate-500 text-sm"
            >
              <option value="sequential-query">Round-Robin (Atomic Rotation)</option>
              <option value="balanced-usage">Balanced Usage (% Quota Consumed)</option>
              <option value="exhaust-quota">Exhaust Quota (Priority Failover)</option>
            </select>
            <div className="space-y-1 text-xs text-gunmetal-muted pt-1">
              <p>
                <strong className="text-slate-300">Round-Robin:</strong> Evenly alternates checks across active data sources to balance quota consumption using an atomic database pointer.
              </p>
              <p>
                <strong className="text-slate-300">Balanced Usage:</strong> Dynamically directs queries to the active provider with the lowest percentage of monthly quota consumed.
              </p>
              <p>
                <strong className="text-slate-300">Exhaust Quota:</strong> Exclusively queries the top-priority active provider until its monthly allowance is exhausted, then falls back to the next provider.
              </p>
            </div>
            <p className="text-[11px] text-amber-400 font-medium pt-1">
              Priority Rule: Any active unmetered data source will automatically be queried first before any metered datasource, regardless of Query Routing Strategy.
            </p>
          </div>

          {/* Consolidated Reorderable Stack of Provider Cards */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold text-slate-200">Data Source Stack & Priority Order</h3>
                <p className="text-xs text-gunmetal-muted">
                  Use the chevrons on each card to adjust priority rank. Inactive providers remain in their fixed rank position but are skipped at runtime.
                </p>
              </div>
            </div>

            {(() => {
              const allKeys = ['serpapi', 'searchapi', 'hasdata', 'fastflights'];
              const currentOrder = (settings.dataSourceStrategy || 'serpapi,searchapi,hasdata,fastflights')
                .split(',')
                .filter(k => allKeys.includes(k));
              allKeys.forEach(k => {
                if (!currentOrder.includes(k)) currentOrder.push(k);
              });

              const move = (index: number, dir: number) => {
                const newOrder = [...currentOrder];
                const temp = newOrder[index];
                newOrder[index] = newOrder[index + dir];
                newOrder[index + dir] = temp;
                setSettings({ ...settings, dataSourceStrategy: newOrder.join(',') });
              };

              return currentOrder.map((key, index) => {
                const isMetered = key === 'serpapi' || key === 'searchapi' || key === 'hasdata';
                const isEnabled = key === 'serpapi'
                  ? settings.serpApiEnabled === 1
                  : key === 'searchapi'
                  ? settings.searchApiEnabled === 1
                  : key === 'hasdata'
                  ? settings.hasdataEnabled === 1
                  : settings.fastFlightsEnabled === 1;

                const nameMap: Record<string, string> = {
                  serpapi: 'SerpAPI',
                  searchapi: 'SearchApi.io',
                  hasdata: 'HasData',
                  fastflights: 'Fast-Flights (Scraper)',
                };

                const toggleEnabled = (checked: boolean) => {
                  const val = checked ? 1 : 0;
                  if (key === 'serpapi') setSettings({ ...settings, serpApiEnabled: val });
                  if (key === 'searchapi') setSettings({ ...settings, searchApiEnabled: val });
                  if (key === 'hasdata') setSettings({ ...settings, hasdataEnabled: val });
                  if (key === 'fastflights') setSettings({ ...settings, fastFlightsEnabled: val });
                };

                return (
                  <div 
                    key={key} 
                    className={`border rounded-lg transition-all ${
                      isEnabled 
                        ? 'bg-gunmetal-card border-gunmetal-border shadow-sm' 
                        : 'bg-gunmetal-canvas/40 border-gunmetal-border/50 opacity-60'
                    }`}
                  >
                    {/* Card Header */}
                    <div className="p-4 border-b border-gunmetal-border flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="w-7 h-7 rounded-md bg-gunmetal-canvas border border-gunmetal-border flex items-center justify-center text-xs font-mono font-bold text-slate-300">
                          #{index + 1}
                        </span>
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                          <input 
                            type="checkbox" 
                            checked={isEnabled} 
                            onChange={e => toggleEnabled(e.target.checked)} 
                            className="w-4 h-4 accent-slate-500 rounded" 
                          />
                          <span className={`font-bold text-sm ${isEnabled ? 'text-slate-100' : 'text-gunmetal-muted'}`}>
                            {nameMap[key]}
                          </span>
                        </label>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${
                          isMetered 
                            ? 'bg-sky-950/40 text-sky-400 border-sky-800/40' 
                            : 'bg-amber-950/40 text-amber-400 border-amber-800/40'
                        }`}>
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

                    {/* Card Configuration Body */}
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
                                if (key === 'serpapi') setSettings({ ...settings, serpApiKey: e.target.value });
                                if (key === 'searchapi') setSettings({ ...settings, searchApiKey: e.target.value });
                                if (key === 'hasdata') setSettings({ ...settings, hasdataApiKey: e.target.value });
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
                                if (key === 'serpapi') setSettings({ ...settings, serpApiQuota: val });
                                if (key === 'searchapi') setSettings({ ...settings, searchApiQuota: val });
                                if (key === 'hasdata') setSettings({ ...settings, hasdataQuota: val });
                              }} 
                              className="w-full border border-gunmetal-border p-2 rounded-md bg-gunmetal-canvas text-slate-200 focus:outline-none focus:border-slate-500 disabled:opacity-50 text-sm" 
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="bg-amber-950/20 border border-amber-900/40 rounded-md p-3.5 space-y-1.5 text-xs text-amber-300">
                          <p className="font-semibold text-amber-200 flex items-center gap-1.5">
                            <span>⚠</span> Unlimited Datasource Notice & Disclaimer
                          </p>
                          <p>
                            • <strong>Priority:</strong> When enabled, this data source bypasses metered quotas and is executed first before any API-key data sources regardless of the configured Query Routing Strategy.
                          </p>
                          <p>
                            • <strong>Volatility:</strong> This Scraper reverse-engineer public RPC endpoints without an API key. It is volatile and will most likely fail or encounter CAPTCHAs, even on residential connections. Automatic jitter delays (2.0s – 4.5s) are applied to each query to minimize bot flags. It is highly recommended to not use this as a primary data source.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </div>
      )}

      {/* Scheduling Tab */}
      {activeTab === 'scheduling' && (
        <div className="space-y-6 pt-2">
          <div className="bg-gunmetal-canvas/60 border border-gunmetal-border p-3.5 rounded-lg text-xs text-slate-300">
            <p className="font-semibold text-slate-200 mb-0.5">Global Check Cadence Defaults</p>
            These cadences establish the global default check frequency for all tracked flights based on departure proximity. All flights inherit these intervals unless customized individually in flight settings.
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-slate-300">Far Out (&gt;90 days)</label>
              <div className="flex items-center gap-2">
                <input type="number" value={settings.scheduleFarOut} onChange={e => setSettings({...settings, scheduleFarOut: Number(e.target.value)})} className="w-full border border-gunmetal-border p-2 rounded-md bg-gunmetal-canvas text-slate-200 focus:outline-none focus:border-slate-500" />
                <span className="text-sm text-gunmetal-muted">hrs</span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-slate-300">Standard (14-90 days)</label>
              <div className="flex items-center gap-2">
                <input type="number" value={settings.scheduleStandard} onChange={e => setSettings({...settings, scheduleStandard: Number(e.target.value)})} className="w-full border border-gunmetal-border p-2 rounded-md bg-gunmetal-canvas text-slate-200 focus:outline-none focus:border-slate-500" />
                <span className="text-sm text-gunmetal-muted">hrs</span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-slate-300">Final Stretch (&lt;14 days)</label>
              <div className="flex items-center gap-2">
                <input type="number" value={settings.scheduleFinalStretch} onChange={e => setSettings({...settings, scheduleFinalStretch: Number(e.target.value)})} className="w-full border border-gunmetal-border p-2 rounded-md bg-gunmetal-canvas text-slate-200 focus:outline-none focus:border-slate-500" />
                <span className="text-sm text-gunmetal-muted">hrs</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-slate-300">Operating Start Hour (Local)</label>
              <input type="number" min="0" max="23" value={settings.operatingHoursStart} onChange={e => setSettings({...settings, operatingHoursStart: Number(e.target.value)})} className="w-full border border-gunmetal-border p-2 rounded-md bg-gunmetal-canvas text-slate-200 focus:outline-none focus:border-slate-500" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-slate-300">Operating End Hour (Local)</label>
              <input type="number" min="0" max="23" value={settings.operatingHoursEnd} onChange={e => setSettings({...settings, operatingHoursEnd: Number(e.target.value)})} className="w-full border border-gunmetal-border p-2 rounded-md bg-gunmetal-canvas text-slate-200 focus:outline-none focus:border-slate-500" />
            </div>
          </div>
        </div>
      )}

      {/* Notifications Tab */}
      {activeTab === 'notifications' && (
        <div className="space-y-6 pt-2">
          <div className="bg-gunmetal-canvas/60 border border-gunmetal-border p-3.5 rounded-lg text-xs text-slate-300">
            <p className="font-semibold text-slate-200 mb-0.5">Global Alert & Notification Defaults</p>
            Configure notification channels and baseline price drop thresholds. Tracked flights inherit these dollar and percentage thresholds unless custom overrides are defined on a specific flight.
          </div>

          {/* Master Enable and Thresholds */}
          <div className="flex items-center gap-2 mb-2">
            <input 
              type="checkbox" 
              id="notificationsEnabled" 
              checked={settings.notificationsEnabled === 1} 
              onChange={e => setSettings({ ...settings, notificationsEnabled: e.target.checked ? 1 : 0 })} 
              className="w-5 h-5 accent-slate-500 rounded" 
            />
            <label htmlFor="notificationsEnabled" className="font-bold text-slate-200">
              Enable Global Notifications
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-slate-300">Min $ Drop to Alert</label>
              <div className="flex items-center gap-2">
                <span className="text-gunmetal-muted">$</span>
                <input 
                  type="number" 
                  value={settings.minDropDollar} 
                  onChange={e => setSettings({ ...settings, minDropDollar: Number(e.target.value) })} 
                  className="w-full border border-gunmetal-border p-2 rounded-md bg-gunmetal-canvas text-slate-200 focus:outline-none focus:border-slate-500" 
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-slate-300">Min % Drop to Alert</label>
              <div className="flex items-center gap-2">
                <span className="text-gunmetal-muted">%</span>
                <input 
                  type="number" 
                  value={settings.minDropPercent} 
                  onChange={e => setSettings({ ...settings, minDropPercent: Number(e.target.value) })} 
                  className="w-full border border-gunmetal-border p-2 rounded-md bg-gunmetal-canvas text-slate-200 focus:outline-none focus:border-slate-500" 
                />
              </div>
            </div>
          </div>

          <div className="pt-2">
            <h3 className="text-sm font-bold text-slate-200 mb-1">Notification Channels</h3>
            <p className="text-xs text-gunmetal-muted mb-4">
              Configure endpoints individually. Toggling a channel off preserves credentials in the database while skipping dispatch[cite: 1].
            </p>

            <div className="space-y-4">
              {/* 1. Discord Webhook Card */}
              <div className={`p-4 rounded-lg border transition-all ${settings.discordEnabled === 1 ? 'bg-gunmetal-card border-gunmetal-border shadow-sm' : 'bg-gunmetal-canvas/40 border-gunmetal-border/50 opacity-60'}`}>
                <div className="flex justify-between items-center mb-3">
                  <label className="flex items-center gap-2.5 font-bold text-slate-200 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={settings.discordEnabled === 1} 
                      onChange={e => setSettings({ ...settings, discordEnabled: e.target.checked ? 1 : 0 })} 
                      className="w-4 h-4 accent-slate-500 rounded" 
                    />
                    <span>Discord Webhook</span>
                  </label>
                  {settings.discordEnabled !== 1 && (
                    <span className="text-[10px] uppercase font-bold text-gunmetal-muted bg-gunmetal-canvas px-1.5 py-0.5 rounded border border-gunmetal-border">
                      Disabled
                    </span>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1 text-slate-300">Webhook URL</label>
                  <input 
                    type="url" 
                    disabled={settings.discordEnabled !== 1}
                    value={settings.discordWebhookUrl || ''} 
                    onChange={e => setSettings({ ...settings, discordWebhookUrl: e.target.value })} 
                    placeholder="https://discord.com/api/webhooks/..." 
                    className="w-full border border-gunmetal-border p-2 rounded-md bg-gunmetal-canvas text-slate-200 placeholder-zinc-500 focus:outline-none focus:border-slate-500 text-sm disabled:opacity-50" 
                  />
                </div>
                <div className="mt-3 pt-3 border-t border-gunmetal-border flex flex-wrap items-center justify-between gap-2">
                  <div className="text-xs">
                    {channelStatus.discord && (
                      <span className={channelStatus.discord.type === 'success' ? 'text-green-400 font-medium' : 'text-red-400 font-medium'}>
                        {channelStatus.discord.message}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={savingChannel === 'discord'}
                      onClick={() => handleChannelSave('discord')}
                      className="text-xs font-semibold px-3 py-1.5 bg-gunmetal-canvas hover:bg-gunmetal-border text-slate-200 border border-gunmetal-border rounded transition-colors disabled:opacity-50"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      disabled={savingChannel === 'discord'}
                      onClick={() => handleChannelSaveAndTest('discord')}
                      className="text-xs font-semibold px-3 py-1.5 bg-gunmetal-border hover:bg-slate-700 text-slate-100 border border-slate-500 rounded transition-colors disabled:opacity-50"
                    >
                      {savingChannel === 'discord' ? 'Testing...' : 'Save & Test'}
                    </button>
                  </div>
                </div>
              </div>

              {/* 2. Slack Webhook Card */}
              <div className={`p-4 rounded-lg border transition-all ${settings.slackEnabled === 1 ? 'bg-gunmetal-card border-gunmetal-border shadow-sm' : 'bg-gunmetal-canvas/40 border-gunmetal-border/50 opacity-60'}`}>
                <div className="flex justify-between items-center mb-3">
                  <label className="flex items-center gap-2.5 font-bold text-slate-200 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={settings.slackEnabled === 1} 
                      onChange={e => setSettings({ ...settings, slackEnabled: e.target.checked ? 1 : 0 })} 
                      className="w-4 h-4 accent-slate-500 rounded" 
                    />
                    <span>Slack Webhook</span>
                  </label>
                  {settings.slackEnabled !== 1 && (
                    <span className="text-[10px] uppercase font-bold text-gunmetal-muted bg-gunmetal-canvas px-1.5 py-0.5 rounded border border-gunmetal-border">
                      Disabled
                    </span>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1 text-slate-300">Webhook URL</label>
                  <input 
                    type="url" 
                    disabled={settings.slackEnabled !== 1}
                    value={settings.slackWebhookUrl || ''} 
                    onChange={e => setSettings({ ...settings, slackWebhookUrl: e.target.value })} 
                    placeholder="https://hooks.slack.com/services/..." 
                    className="w-full border border-gunmetal-border p-2 rounded-md bg-gunmetal-canvas text-slate-200 placeholder-zinc-500 focus:outline-none focus:border-slate-500 text-sm disabled:opacity-50" 
                  />
                </div>
                <div className="mt-3 pt-3 border-t border-gunmetal-border flex flex-wrap items-center justify-between gap-2">
                  <div className="text-xs">
                    {channelStatus.slack && (
                      <span className={channelStatus.slack.type === 'success' ? 'text-green-400 font-medium' : 'text-red-400 font-medium'}>
                        {channelStatus.slack.message}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={savingChannel === 'slack'}
                      onClick={() => handleChannelSave('slack')}
                      className="text-xs font-semibold px-3 py-1.5 bg-gunmetal-canvas hover:bg-gunmetal-border text-slate-200 border border-gunmetal-border rounded transition-colors disabled:opacity-50"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      disabled={savingChannel === 'slack'}
                      onClick={() => handleChannelSaveAndTest('slack')}
                      className="text-xs font-semibold px-3 py-1.5 bg-gunmetal-border hover:bg-slate-700 text-slate-100 border border-slate-500 rounded transition-colors disabled:opacity-50"
                    >
                      {savingChannel === 'slack' ? 'Testing...' : 'Save & Test'}
                    </button>
                  </div>
                </div>
              </div>

              {/* 3. Generic Webhook Card */}
              <div className={`p-4 rounded-lg border transition-all ${settings.genericWebhookEnabled === 1 ? 'bg-gunmetal-card border-gunmetal-border shadow-sm' : 'bg-gunmetal-canvas/40 border-gunmetal-border/50 opacity-60'}`}>
                <div className="flex justify-between items-center mb-3">
                  <label className="flex items-center gap-2.5 font-bold text-slate-200 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={settings.genericWebhookEnabled === 1} 
                      onChange={e => setSettings({ ...settings, genericWebhookEnabled: e.target.checked ? 1 : 0 })} 
                      className="w-4 h-4 accent-slate-500 rounded" 
                    />
                    <span>Generic Webhook (Custom / Apprise / Automation)</span>
                  </label>
                  {settings.genericWebhookEnabled !== 1 && (
                    <span className="text-[10px] uppercase font-bold text-gunmetal-muted bg-gunmetal-canvas px-1.5 py-0.5 rounded border border-gunmetal-border">
                      Disabled
                    </span>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1 text-slate-300">Webhook Endpoint URL</label>
                  <input 
                    type="url" 
                    disabled={settings.genericWebhookEnabled !== 1}
                    value={settings.genericWebhookUrl || settings.appriseUrl || ''} 
                    onChange={e => setSettings({ ...settings, genericWebhookUrl: e.target.value, appriseUrl: e.target.value })} 
                    placeholder="https://webhook.site/... or https://apprise.local/notify/..." 
                    className="w-full border border-gunmetal-border p-2 rounded-md bg-gunmetal-canvas text-slate-200 placeholder-zinc-500 focus:outline-none focus:border-slate-500 text-sm disabled:opacity-50" 
                  />
                </div>
                <div className="mt-3 pt-3 border-t border-gunmetal-border flex flex-wrap items-center justify-between gap-2">
                  <div className="text-xs">
                    {channelStatus.generic && (
                      <span className={channelStatus.generic.type === 'success' ? 'text-green-400 font-medium' : 'text-red-400 font-medium'}>
                        {channelStatus.generic.message}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={savingChannel === 'generic'}
                      onClick={() => handleChannelSave('generic')}
                      className="text-xs font-semibold px-3 py-1.5 bg-gunmetal-canvas hover:bg-gunmetal-border text-slate-200 border border-gunmetal-border rounded transition-colors disabled:opacity-50"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      disabled={savingChannel === 'generic'}
                      onClick={() => handleChannelSaveAndTest('generic')}
                      className="text-xs font-semibold px-3 py-1.5 bg-gunmetal-border hover:bg-slate-700 text-slate-100 border border-slate-500 rounded transition-colors disabled:opacity-50"
                    >
                      {savingChannel === 'generic' ? 'Testing...' : 'Save & Test'}
                    </button>
                  </div>
                </div>
              </div>

              {/* 4. SMTP Email Card */}
              <div className={`p-4 rounded-lg border transition-all ${settings.smtpEnabled === 1 ? 'bg-gunmetal-card border-gunmetal-border shadow-sm' : 'bg-gunmetal-canvas/40 border-gunmetal-border/50 opacity-60'}`}>
                <div className="flex justify-between items-center mb-3">
                  <label className="flex items-center gap-2.5 font-bold text-slate-200 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={settings.smtpEnabled === 1} 
                      onChange={e => setSettings({ ...settings, smtpEnabled: e.target.checked ? 1 : 0 })} 
                      className="w-4 h-4 accent-slate-500 rounded" 
                    />
                    <span>SMTP Email</span>
                  </label>
                  {settings.smtpEnabled !== 1 && (
                    <span className="text-[10px] uppercase font-bold text-gunmetal-muted bg-gunmetal-canvas px-1.5 py-0.5 rounded border border-gunmetal-border">
                      Disabled
                    </span>
                  )}
                </div>
                <div className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-xs font-medium mb-1 text-slate-300">SMTP Host</label>
                      <input 
                        type="text" 
                        disabled={settings.smtpEnabled !== 1}
                        value={settings.smtpHost || ''} 
                        onChange={e => setSettings({ ...settings, smtpHost: e.target.value })} 
                        className="w-full border border-gunmetal-border p-2 rounded-md bg-gunmetal-canvas text-slate-200 placeholder-zinc-500 focus:outline-none focus:border-slate-500 text-sm disabled:opacity-50" 
                        placeholder="smtp.gmail.com" 
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1 text-slate-300">SMTP Port</label>
                      <input 
                        type="number" 
                        disabled={settings.smtpEnabled !== 1}
                        value={settings.smtpPort || ''} 
                        onChange={e => setSettings({ ...settings, smtpPort: e.target.value ? Number(e.target.value) : null })} 
                        className="w-full border border-gunmetal-border p-2 rounded-md bg-gunmetal-canvas text-slate-200 placeholder-zinc-500 focus:outline-none focus:border-slate-500 text-sm disabled:opacity-50" 
                        placeholder="587" 
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium mb-1 text-slate-300">SMTP Username</label>
                      <input 
                        type="text" 
                        disabled={settings.smtpEnabled !== 1}
                        value={settings.smtpUser || ''} 
                        onChange={e => setSettings({ ...settings, smtpUser: e.target.value })} 
                        className="w-full border border-gunmetal-border p-2 rounded-md bg-gunmetal-canvas text-slate-200 focus:outline-none focus:border-slate-500 text-sm disabled:opacity-50" 
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1 text-slate-300">SMTP Password</label>
                      <input 
                        type="password" 
                        disabled={settings.smtpEnabled !== 1}
                        value={settings.smtpPass || ''} 
                        onChange={e => setSettings({ ...settings, smtpPass: e.target.value })} 
                        className="w-full border border-gunmetal-border p-2 rounded-md bg-gunmetal-canvas text-slate-200 focus:outline-none focus:border-slate-500 text-sm disabled:opacity-50" 
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium mb-1 text-slate-300">From Address</label>
                      <input 
                        type="email" 
                        disabled={settings.smtpEnabled !== 1}
                        value={settings.smtpFrom || ''} 
                        onChange={e => setSettings({ ...settings, smtpFrom: e.target.value })} 
                        className="w-full border border-gunmetal-border p-2 rounded-md bg-gunmetal-canvas text-slate-200 placeholder-zinc-500 focus:outline-none focus:border-slate-500 text-sm disabled:opacity-50" 
                        placeholder="alerts@flightsentry.local" 
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1 text-slate-300">To Address</label>
                      <input 
                        type="email" 
                        disabled={settings.smtpEnabled !== 1}
                        value={settings.smtpTo || ''} 
                        onChange={e => setSettings({ ...settings, smtpTo: e.target.value })} 
                        className="w-full border border-gunmetal-border p-2 rounded-md bg-gunmetal-canvas text-slate-200 placeholder-zinc-500 focus:outline-none focus:border-slate-500 text-sm disabled:opacity-50" 
                        placeholder="you@email.com" 
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-gunmetal-border flex flex-wrap items-center justify-between gap-2">
                  <div className="text-xs">
                    {channelStatus.smtp && (
                      <span className={channelStatus.smtp.type === 'success' ? 'text-green-400 font-medium' : 'text-red-400 font-medium'}>
                        {channelStatus.smtp.message}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={savingChannel === 'smtp'}
                      onClick={() => handleChannelSave('smtp')}
                      className="text-xs font-semibold px-3 py-1.5 bg-gunmetal-canvas hover:bg-gunmetal-border text-slate-200 border border-gunmetal-border rounded transition-colors disabled:opacity-50"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      disabled={savingChannel === 'smtp'}
                      onClick={() => handleChannelSaveAndTest('smtp')}
                      className="text-xs font-semibold px-3 py-1.5 bg-gunmetal-border hover:bg-slate-700 text-slate-100 border border-slate-500 rounded transition-colors disabled:opacity-50"
                    >
                      {savingChannel === 'smtp' ? 'Testing...' : 'Save & Test'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="pt-4 border-t border-gunmetal-border">
        <button type="submit" className="w-full bg-gunmetal-border border border-slate-500 text-slate-100 font-medium py-3 rounded-md hover:bg-slate-700 hover:border-slate-400 transition-colors shadow-sm">
          Save All Settings
        </button>
      </div>
    </form>
  );
}