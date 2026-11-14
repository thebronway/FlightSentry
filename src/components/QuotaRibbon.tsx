'use client';

import { useEffect, useState } from 'react';
import { Settings as SettingsType } from '@/types';
import { QuotaPauseKey, QuotaSourceItem } from './quotaRibbon/types';
import type { ScraperHealthResponse } from '@/services/flightsentryScraper';
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
  const [scraperHealth, setScraperHealth] = useState<ScraperHealthResponse | null>(null);

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

  const fetchRemoteScraperHealth = async (currentSettings: SettingsType) => {
    const enabled = currentSettings.flightsentryScraperEnabled === 1;
    const hasUrl = Boolean((currentSettings.flightsentryScraperUrl || '').trim());
    const hasKey = Boolean((currentSettings.flightsentryScraperApiKey || '').trim());
    if (!enabled || !hasUrl || !hasKey) {
      setScraperHealth(null);
      return;
    }

    try {
      const res = await fetch('/api/settings/test-scraper', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.health) {
          setScraperHealth(data.health as ScraperHealthResponse);
        } else {
          setScraperHealth(null);
        }
      } else {
        setScraperHealth(null);
      }
    } catch {
      setScraperHealth(null);
    }
  };

  const fetchSettings = async () => {
    const res = await fetch('/api/settings', { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      setSettings(data);
      onSettingsChange?.(data);
      void fetchRemoteScraperHealth(data);
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
      quotaMode: settings.serpApiQuotaMode || 'monthly',
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
      quotaMode: settings.searchApiQuotaMode || 'monthly',
      resetDate: settings.searchApiResetDate || settings.quotaResetDate,
      isScraper: false,
    },
    {
      key: 'flightsentry-scraper',
      name: 'FlightSentry-Scraper',
      enabled: settings.flightsentryScraperEnabled,
      paused: settings.flightsentryScraperPaused,
      remotePaused: scraperHealth?.paused === true || scraperHealth?.state === 'paused',
      remoteState: scraperHealth?.state,
      remoteStatusReason: scraperHealth?.statusReason ?? null,
      pauseKey: 'flightsentryScraperPaused',
      used: settings.flightsentryScraperUsed,
      quota: 0,
      hourlyUsed: scraperHealth?.usage?.hourlyUsed,
      hourlyLimit: scraperHealth?.usage?.hourlyLimit,
      dailyUsed: scraperHealth?.usage?.dailyUsed,
      dailyLimit: scraperHealth?.usage?.dailyLimit,
      queueDepth: scraperHealth?.queueDepth,
      resetDate: null,
      isScraper: true,
    },
  ];

  const sources = allSources.filter(s => s.enabled === 1);

  const meteredSources = sources.filter(s => !s.isScraper && s.quota > 0);
  const selfHostedSources = sources.filter(s => s.isScraper);

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
      flightsentryScraperPaused: nextPauseState,
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
      { enabled: updatedDraft.flightsentryScraperEnabled, paused: updatedDraft.flightsentryScraperPaused },
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
        selfHostedSources={selfHostedSources}
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