'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import { Settings as SettingsType } from '@/types';
import {
  DEFAULT_SETTINGS_TAB,
  SETTINGS_TABS,
  SettingsTabId,
} from './settings/settingsTabs';
import GeneralTab from './settings/GeneralTab';
import DataSourcesTab from './settings/DataSourcesTab';
import SearchPreferencesTab from './settings/SearchPreferencesTab';
import SchedulingTab from './settings/SchedulingTab';
import NotificationsTab from './settings/NotificationsTab';
import EmailScannerTab from './settings/EmailScannerTab';
import SecurityTab from './settings/SecurityTab';

interface SettingsFormProps {
  initialTab?: SettingsTabId;
}

export default function SettingsForm({
  initialTab = DEFAULT_SETTINGS_TAB,
}: SettingsFormProps) {
  const router = useRouter();
  const [settings, setSettings] = useState<SettingsType | null>(null);
  const [activeTab, setActiveTab] = useState<SettingsTabId>(initialTab);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const handleTabChange = (nextTab: SettingsTabId) => {
    setActiveTab(nextTab);
    router.push(`/settings/${nextTab}`);
  };

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
    fetch('/api/settings', { cache: 'no-store' })
      .then(res => {
        if (res.status === 401) {
          const nextPath = encodeURIComponent(`/settings/${initialTab}`);
          window.location.assign(`/login?next=${nextPath}`);
          return null;
        }
        if (!res.ok) return null;
        return res.json();
      })
      .then(data => {
        if (!data) return;
        const allKeys = ['serpapi', 'searchapi', 'flightsentry-scraper'];
        const normalized = (data.dataSourceStrategy || '')
          .split(',')
          .map((s: string) => s.trim())
          .filter(Boolean)
          .map((s: string) => (s === 'fastflights' ? 'flightsentry-scraper' : s))
          .filter((s: string) => s !== 'fli');
        const existing: string[] = [];
        normalized.forEach((k: string) => {
          if (!existing.includes(k)) existing.push(k);
        });
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

  const handleAdjustUsage = async (
    provider: 'serpapi' | 'searchapi',
    mode: 'increment' | 'set',
    value: number
  ) => {
    const providerLabels: Record<'serpapi' | 'searchapi', string> = {
      serpapi: 'SerpAPI',
      searchapi: 'SearchApi.io',
    };
    setProviderStatus(prev => ({ ...prev, [provider]: null }));
    try {
      const res = await fetch('/api/settings/datasource-usage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, mode, value }),
      });
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        showToast(
          `Error updating usage: API endpoint returned HTTP ${res.status} (ensure src/app/api/settings/datasource-usage/route.ts exists and rebuild container)`,
          'error'
        );
        return;
      }
      const data = await res.json();
      if (res.ok) {
        setSettings(data);
        setProviderStatus(prev => ({
          ...prev,
          [provider]: { type: 'success', message: 'Saved!' },
        }));
        setTimeout(() => setProviderStatus(prev => ({ ...prev, [provider]: null })), 3500);
        const label = providerLabels[provider];
        const msg =
          mode === 'increment'
            ? `${label}: logged +${value} ${value === 1 ? 'query' : 'queries'}`
            : `${label}: queries used set to ${value}`;
        showToast(msg, 'success');
      } else {
        showToast('Error updating usage: ' + (data.error || 'Failed to update'), 'error');
      }
    } catch (err: any) {
      showToast('Network error updating usage: ' + err.message, 'error');
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
    <div className="space-y-5 sm:space-y-6">
      <div
        role="tablist"
        aria-label="Settings sections"
        className="flex flex-wrap sm:flex-nowrap items-center gap-1.5 sm:gap-0 bg-gunmetal-canvas/70 sm:bg-transparent border border-gunmetal-border sm:border-0 sm:border-b sm:border-gunmetal-border p-1.5 sm:p-0 rounded-lg sm:rounded-none"
      >
        {SETTINGS_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => handleTabChange(tab.id)}
            className={`min-h-[44px] px-3 sm:px-4 py-2 sm:py-2.5 font-medium text-xs sm:text-sm rounded-md sm:rounded-none transition-colors cursor-pointer ${
              activeTab === tab.id
                ? 'bg-gunmetal-border sm:bg-transparent sm:border-b-2 sm:border-slate-300 text-slate-100 font-semibold shadow-sm sm:shadow-none'
                : 'text-gunmetal-muted hover:text-slate-300 hover:bg-gunmetal-card/60 sm:hover:bg-transparent'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'general' && (
        <GeneralTab
          settings={settings}
          onChange={setSettings}
          onAutoSave={handleAutoSave}
        />
      )}

      {activeTab === 'data-sources' && (
        <DataSourcesTab
          settings={settings}
          onChange={setSettings}
          providerStatus={providerStatus}
          onAutoSave={handleAutoSave}
          onAdjustUsage={handleAdjustUsage}
        />
      )}

      {activeTab === 'scheduling' && (
        <SchedulingTab
          settings={settings}
          onChange={setSettings}
          onAutoSave={handleAutoSave}
        />
      )}

      {activeTab === 'search-preferences' && (
        <SearchPreferencesTab
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

      {activeTab === 'email-scanner' && (
        <EmailScannerTab
          settings={settings}
          onChange={setSettings}
          onAutoSave={handleAutoSave}
          onNotify={showToast}
        />
      )}

      {activeTab === 'security' && (
        <SecurityTab onNotify={showToast} />
      )}

      {/* Floating In-App Toast */}
      {toast && (
        <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:bottom-5 sm:right-5 z-50 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div
            className={`flex items-center gap-3 px-4 py-3 rounded-lg border shadow-2xl shadow-black/80 backdrop-blur-md text-xs sm:text-sm font-semibold max-w-full sm:max-w-md ${
              toast.type === 'success'
                ? 'bg-gunmetal-card/95 border-emerald-500/80 text-slate-100 ring-1 ring-emerald-500/40'
                : 'bg-gunmetal-card/95 border-rose-500/80 text-slate-100 ring-1 ring-rose-500/40'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />
            )}
            <span>{toast.message}</span>
          </div>
        </div>
      )}
    </div>
  );
}