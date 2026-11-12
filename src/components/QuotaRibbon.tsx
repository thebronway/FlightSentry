'use client';

import { useEffect, useState } from 'react';
import { Settings as SettingsType } from '@/types';
import { QuotaPauseKey, QuotaSourceItem } from './quotaRibbon/types';
import QuotaRibbonHeader from './quotaRibbon/QuotaRibbonHeader';
import QuotaSourceCard from './quotaRibbon/QuotaSourceCard';

interface Props {
  refreshTrigger?: number;
  onSettingsChange?: (settings: SettingsType) => void;
}

const STORAGE_KEY = 'flightsentry_quota_ribbon_collapsed';

export default function QuotaRibbon({ refreshTrigger = 0, onSettingsChange }: Props) {
  const [settings, setSettings] = useState<SettingsType | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(true);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored !== null) {
        setIsCollapsed(stored === 'true');
      }
    } catch {}
  }, []);

  const handleToggleCollapse = () => {
    setIsCollapsed(prev => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, String(next));
      } catch {}
      return next;
    });
  };

  const fetchSettings = async () => {
    const res = await fetch('/api/settings', { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      setSettings(data);
      onSettingsChange?.(data);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, [refreshTrigger]);

  if (!settings) return null;

  const allSources: QuotaSourceItem[] = [
    {
      key: 'serpapi',
      name: 'SerpAPI',
      enabled: settings.serpApiEnabled,
      paused: settings.serpApiPaused,
      pauseKey: 'serpApiPaused',
      used: settings.serpApiUsed,
      quota: settings.serpApiQuota,
      resetDate: settings.serpApiResetDate || settings.quotaResetDate,
      isScraper: false,
    },
    {
      key: 'searchapi',
      name: 'SearchApi.io',
      enabled: settings.searchApiEnabled,
      paused: settings.searchApiPaused,
      pauseKey: 'searchApiPaused',
      used: settings.searchApiUsed,
      quota: settings.searchApiQuota,
      resetDate: settings.searchApiResetDate || settings.quotaResetDate,
      isScraper: false,
    },
    {
      key: 'hasdata',
      name: 'HasData',
      enabled: settings.hasdataEnabled,
      paused: settings.hasdataPaused,
      pauseKey: 'hasdataPaused',
      used: settings.hasdataUsed,
      quota: settings.hasdataQuota,
      resetDate: settings.hasdataResetDate || settings.quotaResetDate,
      isScraper: false,
    },
    {
      key: 'fastflights',
      name: 'Fast-Flights',
      enabled: settings.fastFlightsEnabled,
      paused: settings.fastFlightsPaused,
      pauseKey: 'fastFlightsPaused',
      used: settings.fastFlightsUsed,
      quota: 0,
      resetDate: null,
      isScraper: true,
    },
  ];

  const sources = allSources.filter(s => s.enabled === 1);

  const meteredSources = sources.filter(s => !s.isScraper && s.quota > 0);
  const unlimitedSources = sources.filter(s => s.isScraper || s.quota === 0);

  const isAllPaused =
    settings.globalPause === 1 ||
    (sources.length > 0 && sources.every(s => s.paused === 1));

  const toggleGlobalPause = async () => {
    const nextPauseState = isAllPaused ? 0 : 1;
    const payload = {
      ...settings,
      globalPause: nextPauseState,
      serpApiPaused: nextPauseState,
      searchApiPaused: nextPauseState,
      hasdataPaused: nextPauseState,
      fastFlightsPaused: nextPauseState,
    };

    const res = await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const updated = await res.json();
      setSettings(updated);
      onSettingsChange?.(updated);
    } else {
      fetchSettings();
    }
  };

  const toggleSourcePause = async (pauseKey: QuotaPauseKey) => {
    const nextSourceState = settings[pauseKey] === 1 ? 0 : 1;
    const updatedDraft = {
      ...settings,
      [pauseKey]: nextSourceState,
    };

    const checkSources = [
      { enabled: updatedDraft.serpApiEnabled, paused: updatedDraft.serpApiPaused },
      { enabled: updatedDraft.searchApiEnabled, paused: updatedDraft.searchApiPaused },
      { enabled: updatedDraft.hasdataEnabled, paused: updatedDraft.hasdataPaused },
      { enabled: updatedDraft.fastFlightsEnabled, paused: updatedDraft.fastFlightsPaused },
    ].filter(s => s.enabled === 1);

    const willAllBePaused = checkSources.length > 0 && checkSources.every(s => s.paused === 1);
    updatedDraft.globalPause = willAllBePaused ? 1 : 0;

    const res = await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedDraft),
    });
    if (res.ok) {
      const updated = await res.json();
      setSettings(updated);
      onSettingsChange?.(updated);
    } else {
      fetchSettings();
    }
  };

  return (
    <div className="bg-gunmetal-card p-3.5 sm:p-5 rounded-lg shadow-sm border border-gunmetal-border mb-6 flex flex-col transition-colors">
      <QuotaRibbonHeader
        isCollapsed={isCollapsed}
        hasSources={sources.length > 0}
        isAllPaused={isAllPaused}
        meteredSources={meteredSources}
        unlimitedSources={unlimitedSources}
        onToggleGlobalPause={toggleGlobalPause}
        onToggleCollapse={handleToggleCollapse}
      />

      {sources.length === 0 ? (
        <div className="text-sm text-gunmetal-muted italic pt-3 mt-3 border-t border-gunmetal-border">
          No data sources are currently enabled in Settings.
        </div>
      ) : !isCollapsed ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {sources.map((source, index) => (
            <QuotaSourceCard
              key={source.key}
              source={source}
              isLastOdd={sources.length % 2 !== 0 && index === sources.length - 1}
              onTogglePause={toggleSourcePause}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}