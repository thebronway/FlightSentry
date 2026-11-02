'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Settings as SettingsType } from '@/types';
import DataSourcesTab from './settings/DataSourcesTab';
import SchedulingTab from './settings/SchedulingTab';
import NotificationsTab from './settings/NotificationsTab';
import UnsavedChangesModal from './settings/UnsavedChangesModal';

export default function SettingsForm() {
  const router = useRouter();
  const [settings, setSettings] = useState<SettingsType | null>(null);
  const [savedSettings, setSavedSettings] = useState<SettingsType | null>(null);
  const [activeTab, setActiveTab] = useState<'datasources' | 'scheduling' | 'notifications'>('datasources');

  // Provider states
  const [savingProvider, setSavingProvider] = useState<string | null>(null);
  const [providerStatus, setProviderStatus] = useState<Record<string, { type: 'success' | 'error'; message: string } | null>>({});

  // Strategy states
  const [savingStrategy, setSavingStrategy] = useState(false);
  const [strategyStatus, setStrategyStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Scheduling states
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [scheduleStatus, setScheduleStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Notification threshold states
  const [savingThresholds, setSavingThresholds] = useState(false);
  const [thresholdsStatus, setThresholdsStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Channel notification states
  const [savingChannel, setSavingChannel] = useState<string | null>(null);
  const [channelStatus, setChannelStatus] = useState<Record<string, { type: 'success' | 'error'; message: string } | null>>({});

  // Navigation guard state
  const [pendingTab, setPendingTab] = useState<'datasources' | 'scheduling' | 'notifications' | null>(null);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);
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
        setSavedSettings(full);
      });
  }, []);

  const isDirty = useMemo(() => {
    if (!settings || !savedSettings) return false;
    return JSON.stringify(settings) !== JSON.stringify(savedSettings);
  }, [settings, savedSettings]);

  // Intercept internal link navigation (e.g. Dashboard in navbar) when dirty
  useEffect(() => {
    const handleAnchorClick = (e: MouseEvent) => {
      if (!isDirty) return;
      const target = (e.target as HTMLElement).closest('a');
      if (target && target.href && !target.href.startsWith('#')) {
        const url = new URL(target.href, window.location.href);
        if (url.origin === window.location.origin && url.pathname !== window.location.pathname) {
          e.preventDefault();
          e.stopPropagation();
          setPendingNavigation(url.pathname);
          setShowUnsavedModal(true);
        }
      }
    };

    window.addEventListener('click', handleAnchorClick, true);
    return () => window.removeEventListener('click', handleAnchorClick, true);
  }, [isDirty]);

  // Intercept browser reload / tab close when dirty
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  const handleTabChange = (targetTab: 'datasources' | 'scheduling' | 'notifications') => {
    if (activeTab === targetTab) return;
    if (isDirty) {
      setPendingTab(targetTab);
      setShowUnsavedModal(true);
    } else {
      setActiveTab(targetTab);
    }
  };

  const handleConfirmDiscard = () => {
    if (savedSettings) {
      setSettings(savedSettings);
    }
    setShowUnsavedModal(false);

    if (pendingTab) {
      setActiveTab(pendingTab);
      setPendingTab(null);
    } else if (pendingNavigation) {
      const dest = pendingNavigation;
      setPendingNavigation(null);
      router.push(dest);
    }
  };

  const handleCancelDiscard = () => {
    setShowUnsavedModal(false);
    setPendingTab(null);
    setPendingNavigation(null);
  };

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
        setSavedSettings(saved);
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

  const handleSaveProvider = async (providerKey: string) => {
    if (!settings) return;
    setSavingProvider(providerKey);
    setProviderStatus(prev => ({ ...prev, [providerKey]: null }));
    const ok = await persistSettings(settings);
    setSavingProvider(null);
    if (ok) {
      setProviderStatus(prev => ({
        ...prev,
        [providerKey]: { type: 'success', message: 'Saved!' },
      }));
      showToast(`${providerKey.toUpperCase()} configuration saved`, 'success');
      setTimeout(() => setProviderStatus(prev => ({ ...prev, [providerKey]: null })), 3500);
    }
  };

  const handleSaveStrategy = async () => {
    if (!settings) return;
    setSavingStrategy(true);
    setStrategyStatus(null);
    const ok = await persistSettings(settings);
    setSavingStrategy(false);
    if (ok) {
      setStrategyStatus({ type: 'success', message: 'Strategy saved!' });
      showToast('Query routing strategy saved', 'success');
      setTimeout(() => setStrategyStatus(null), 3500);
    }
  };

  const handleSaveSchedule = async () => {
    if (!settings) return;
    setSavingSchedule(true);
    setScheduleStatus(null);
    const ok = await persistSettings(settings);
    setSavingSchedule(false);
    if (ok) {
      setScheduleStatus({ type: 'success', message: 'Schedule saved!' });
      showToast('Schedule cadence settings saved', 'success');
      setTimeout(() => setScheduleStatus(null), 3500);
    }
  };

  const handleSaveThresholds = async () => {
    if (!settings) return;
    setSavingThresholds(true);
    setThresholdsStatus(null);
    const ok = await persistSettings(settings);
    setSavingThresholds(false);
    if (ok) {
      setThresholdsStatus({ type: 'success', message: 'Thresholds saved!' });
      showToast('Price drop alert thresholds saved', 'success');
      setTimeout(() => setThresholdsStatus(null), 3500);
    }
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
        [channelKey]: { type: 'success', message: 'Saved!' },
      }));
      showToast(`${channelKey.toUpperCase()} configuration saved`, 'success');
      setTimeout(() => setChannelStatus(prev => ({ ...prev, [channelKey]: null })), 3500);
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
          [channelKey]: { type: 'success', message: 'Saved & test notification delivered!' },
        }));
        showToast(`Test alert delivered via ${channelKey}`, 'success');
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
      setSavingChannel(null);
    }
  };

  if (!settings) return <div className="text-center py-10 dark:text-gray-400">Loading settings...</div>;

  return (
    <div className="space-y-6">
      <div className="flex border-b border-gunmetal-border">
        <button
          type="button"
          onClick={() => handleTabChange('datasources')}
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
          onClick={() => handleTabChange('scheduling')}
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
          onClick={() => handleTabChange('notifications')}
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
        <DataSourcesTab
          settings={settings}
          onChange={setSettings}
          onSaveProvider={handleSaveProvider}
          savingProvider={savingProvider}
          providerStatus={providerStatus}
          onSaveStrategy={handleSaveStrategy}
          savingStrategy={savingStrategy}
          strategyStatus={strategyStatus}
        />
      )}

      {activeTab === 'scheduling' && (
        <SchedulingTab
          settings={settings}
          onChange={setSettings}
          onSaveSchedule={handleSaveSchedule}
          savingSchedule={savingSchedule}
          scheduleStatus={scheduleStatus}
        />
      )}

      {activeTab === 'notifications' && (
        <NotificationsTab
          settings={settings}
          onChange={setSettings}
          savingChannel={savingChannel}
          channelStatus={channelStatus}
          onSaveAndTestChannel={handleChannelSaveAndTest}
          onSaveThresholds={handleSaveThresholds}
          savingThresholds={savingThresholds}
          thresholdsStatus={thresholdsStatus}
        />
      )}

      {/* Modern In-App Unsaved Changes Guard Dialog */}
      <UnsavedChangesModal
        isOpen={showUnsavedModal}
        title="Unsaved Modifications"
        message={
          pendingTab
            ? `You have unsaved changes in this tab. If you switch to another section now, your changes will be discarded.`
            : `You have unsaved changes in your settings. If you navigate away now, your modifications will be discarded.`
        }
        confirmLabel={pendingTab ? 'Discard & Switch' : 'Discard & Leave'}
        cancelLabel="Keep Editing"
        onConfirm={handleConfirmDiscard}
        onCancel={handleCancelDiscard}
      />

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