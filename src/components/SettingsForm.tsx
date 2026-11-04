'use client';

import { useEffect, useState } from 'react';
import { Settings as SettingsType } from '@/types';
import GeneralTab from './settings/GeneralTab';
import DataSourcesTab from './settings/DataSourcesTab';
import SchedulingTab from './settings/SchedulingTab';
import NotificationsTab from './settings/NotificationsTab';

export default function SettingsForm() {
  const [settings, setSettings] = useState<SettingsType | null>(null);
  const [activeTab, setActiveTab] = useState<'general' | 'datasources' | 'scheduling' | 'notifications'>('general');

  // Status & toast states
  const [providerStatus, setProviderStatus] = useState<Record<string, { type: 'success' | 'error'; message: string } | null>>({});
  const [testingChannel, setTestingChannel] = useState<string | null>(null);
  const [channelStatus, setChannelStatus] = useState<Record<string, { type: 'success' | 'error'; message: string } | null>>({});
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(prev => (prev?.message === message ? null : prev));
    }, 3500);
  };

  useEffect(() => {
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => {
        const allKeys = ['serpapi', 'searchapi', 'hasdata', 'fastflights'];
        const existing = (data.dataSourceStrategy || '').split(',').map((s: string) => s.trim()).filter(Boolean);
        allKeys.forEach(k => {
          if (!existing.includes(k)) existing.push(k);
        });
        const full = { ...data, dataSourceStrategy: existing.join(',') };
        setSettings(full);
      });
  }, []);

  const persistSettings = async (updatedSettings: SettingsType): Promise<boolean> => {
    try {
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
      showToast('Error saving settings: ' + (data.error || 'Failed to save'), 'error');
      return false;
    } catch (err: any) {
      showToast('Network error saving settings: ' + err.message, 'error');
      return false;
    }
  };

  const handleAutoSave = async (
    updatedSettings: SettingsType,
    statusKey?: string,
    pillMessage?: string,
    toastMessage?: string
  ) => {
    setSettings(updatedSettings);
    if (statusKey) {
      setProviderStatus(prev => ({ ...prev, [statusKey]: null }));
    }
    const ok = await persistSettings(updatedSettings);
    if (ok) {
      if (statusKey && pillMessage) {
        setProviderStatus(prev => ({
          ...prev,
          [statusKey]: { type: 'success', message: pillMessage },
        }));
        setTimeout(() => setProviderStatus(prev => ({ ...prev, [statusKey]: null })), 3500);
      }
      showToast(toastMessage || 'Settings saved', 'success');
    }
  };

  const handleTestChannel = async (channelKey: 'discord' | 'slack' | 'generic' | 'smtp') => {
    if (!settings) return;
    setTestingChannel(channelKey);
    setChannelStatus(prev => ({ ...prev, [channelKey]: null }));

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
          [channelKey]: { type: 'success', message: 'Test notification delivered!' },
        }));
        showToast(`Test alert delivered via ${channelKey.toUpperCase()}`, 'success');
      } else {
        setChannelStatus(prev => ({
          ...prev,
          [channelKey]: { type: 'error', message: data.error || 'Test notification failed.' },
        }));
        showToast(`Notification test failed: ${data.error || 'Check credentials'}`, 'error');
      }
    } catch (err: any) {
      setChannelStatus(prev => ({
        ...prev,
        [channelKey]: { type: 'error', message: err.message || 'Network error during test.' },
      }));
      showToast('Network error during test: ' + err.message, 'error');
    } finally {
      setTestingChannel(null);
    }
  };

  if (!settings) return <div className="text-center py-10 dark:text-gray-400">Loading settings...</div>;

  return (
    <div className="space-y-6">
      <div className="flex border-b border-gunmetal-border">
        <button
          type="button"
          onClick={() => setActiveTab('general')}
          className={`px-4 py-2 font-medium text-sm transition-colors ${
            activeTab === 'general'
              ? 'border-b-2 border-slate-300 text-slate-100 font-semibold'
              : 'text-gunmetal-muted hover:text-slate-300'
          }`}
        >
          General
        </button>
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

      {activeTab === 'general' && (
        <GeneralTab
          settings={settings}
          onChange={setSettings}
          onAutoSave={handleAutoSave}
        />
      )}

      {activeTab === 'datasources' && (
        <DataSourcesTab
          settings={settings}
          onChange={setSettings}
          providerStatus={providerStatus}
          onAutoSave={handleAutoSave}
        />
      )}

      {activeTab === 'scheduling' && (
        <SchedulingTab
          settings={settings}
          onChange={setSettings}
          onAutoSave={handleAutoSave}
        />
      )}

      {activeTab === 'notifications' && (
        <NotificationsTab
          settings={settings}
          onChange={setSettings}
          testingChannel={testingChannel}
          channelStatus={channelStatus}
          onTestChannel={handleTestChannel}
          onAutoSave={handleAutoSave}
        />
      )}

      {/* Floating In-App Toast */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div
            className={`flex items-center gap-2.5 px-4 py-2.5 rounded-lg border shadow-xl text-xs font-semibold ${
              toast.type === 'success'
                ? 'bg-gunmetal-card border-green-800/80 text-green-300'
                : 'bg-gunmetal-card border-red-800/80 text-red-300'
            }`}
          >
            <span>{toast.message}</span>
          </div>
        </div>
      )}
    </div>
  );
}