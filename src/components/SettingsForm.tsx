'use client';

import { useEffect, useState } from 'react';
import { Settings as SettingsType } from '@/types';
import DataSourcesTab from './settings/DataSourcesTab';
import SchedulingTab from './settings/SchedulingTab';
import NotificationsTab from './settings/NotificationsTab';

export default function SettingsForm() {
  const [settings, setSettings] = useState<SettingsType | null>(null);
  const [activeTab, setActiveTab] = useState<'datasources' | 'scheduling' | 'notifications'>('datasources');
  const [savingChannel, setSavingChannel] = useState<string | null>(null);
  const [channelStatus, setChannelStatus] = useState<Record<string, { type: 'success' | 'error'; message: string } | null>>({});

  useEffect(() => {
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => {
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
      <div className="flex border-b border-gunmetal-border">
        <button
          type="button"
          onClick={() => setActiveTab('datasources')}
          className={`px-4 py-2 font-medium text-sm transition-colors ${
            activeTab === 'datasources'
              ? 'border-b-2 border-slate-300 text-slate-100 font-semibold'
              : 'text-gunmetal-muted hover:text-slate-300'
          }`}
        >
          Data Sources
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('scheduling')}
          className={`px-4 py-2 font-medium text-sm transition-colors ${
            activeTab === 'scheduling'
              ? 'border-b-2 border-slate-300 text-slate-100 font-semibold'
              : 'text-gunmetal-muted hover:text-slate-300'
          }`}
        >
          Scheduling
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('notifications')}
          className={`px-4 py-2 font-medium text-sm transition-colors ${
            activeTab === 'notifications'
              ? 'border-b-2 border-slate-300 text-slate-100 font-semibold'
              : 'text-gunmetal-muted hover:text-slate-300'
          }`}
        >
          Notifications
        </button>
      </div>

      {activeTab === 'datasources' && (
        <DataSourcesTab settings={settings} onChange={setSettings} />
      )}

      {activeTab === 'scheduling' && (
        <SchedulingTab settings={settings} onChange={setSettings} />
      )}

      {activeTab === 'notifications' && (
        <NotificationsTab
          settings={settings}
          onChange={setSettings}
          savingChannel={savingChannel}
          channelStatus={channelStatus}
          onSaveChannel={handleChannelSave}
          onSaveAndTestChannel={handleChannelSaveAndTest}
        />
      )}

      <div className="pt-4 border-t border-gunmetal-border">
        <button
          type="submit"
          className="w-full bg-gunmetal-border border border-slate-500 text-slate-100 font-medium py-3 rounded-md hover:bg-slate-700 hover:border-slate-400 transition-colors shadow-sm"
        >
          Save All Settings
        </button>
      </div>
    </form>
  );
}