'use client';

import { useState } from 'react';
import { Settings } from '@/types';
import type { ScraperHealthResponse } from '@/services/openFareScraper';
import SettingsIntroBanner from './shared/SettingsIntroBanner';
import DataSourceLogsModal from './DataSourceLogsModal';
import QueryRoutingStrategyCard from './datasources/QueryRoutingStrategyCard';
import MeteredProviderCard, { MeteredProviderKey } from './datasources/MeteredProviderCard';
import SelfHostedScraperCard from './datasources/SelfHostedScraperCard';
import RouteAutoDetectionCard from './datasources/RouteAutoDetectionCard';

interface Props {
  settings: Settings;
  onChange: (settings: Settings) => void;
  providerStatus: Record<string, { type: 'success' | 'error'; message: string } | null>;
  cachedScraperHealth?: ScraperHealthResponse | null;
  onScraperHealthUpdated?: (health: ScraperHealthResponse | null) => void;
  onAutoSave?: (
    updatedSettings: Settings,
    statusKey: string,
    pillMessage?: string,
    toastMessage?: string
  ) => Promise<void>;
  onAdjustUsage?: (
    provider: MeteredProviderKey,
    mode: 'increment' | 'set',
    value: number
  ) => Promise<void>;
}

const PROVIDER_NAMES: Record<string, string> = {
  serpapi: 'SerpAPI',
  searchapi: 'SearchApi.io',
  openfarescraper: 'OpenFareScraper',
  'flight-route-lookup': 'Flight Route Lookup',
};

const STRATEGY_LABELS: Record<string, string> = {
  'sequential-query': 'Round-Robin',
  'balanced-usage': 'Balanced Usage',
  'exhaust-quota': 'Exhaust Quota',
};

export default function DataSourcesTab({
  settings,
  onChange,
  providerStatus,
  cachedScraperHealth = null,
  onScraperHealthUpdated,
  onAutoSave,
  onAdjustUsage,
}: Props) {
  type AllProviderKey = MeteredProviderKey | 'openfarescraper';
  const allProviderKeys: AllProviderKey[] = ['serpapi', 'searchapi', 'openfarescraper'];
  const providerOrder = (settings.dataSourceStrategy || 'serpapi,searchapi,openfarescraper')
    .split(',')
    .map(s => s.trim())
    .filter((k): k is AllProviderKey => allProviderKeys.includes(k as AllProviderKey));

  allProviderKeys.forEach(k => {
    if (!providerOrder.includes(k)) providerOrder.push(k);
  });

  const [selectedLogsProvider, setSelectedLogsProvider] = useState<string | null>(null);

  const move = async (index: number, dir: -1 | 1) => {
    const newOrder = [...providerOrder];
    const temp = newOrder[index];
    newOrder[index] = newOrder[index + dir];
    newOrder[index + dir] = temp;
    const updatedStrategy = newOrder.join(',');
    const updated = { ...settings, dataSourceStrategy: updatedStrategy };
    onChange(updated);
    if (onAutoSave) {
      await onAutoSave(updated, '', '', 'Data source priority order updated');
    }
  };

  const toggleEnabled = async (key: string, checked: boolean) => {
    const val = checked ? 1 : 0;
    const updated = { ...settings };
    if (key === 'serpapi') updated.serpApiEnabled = val;
    if (key === 'searchapi') updated.searchApiEnabled = val;
    if (key === 'openfarescraper') updated.openfareScraperEnabled = val;
    onChange(updated);
    if (onAutoSave) {
      const providerLabel = PROVIDER_NAMES[key] || key;
      await onAutoSave(updated, key, 'Saved!', `${providerLabel} ${checked ? 'enabled' : 'disabled'}`);
    }
  };

  const toggleScraperPrioritizeFirst = async (checked: boolean) => {
    const updated = { ...settings, openfareScraperPrioritizeFirst: checked ? 1 : 0 };
    onChange(updated);
    if (onAutoSave) {
      await onAutoSave(
        updated,
        'openfarescraper',
        'Saved!',
        checked
          ? 'OpenFareScraper set to always run first'
          : 'OpenFareScraper set to follow priority rank'
      );
    }
  };

  const handleSelectStrategy = async (newMode: string) => {
    const updated = { ...settings, fallbackStrategyMode: newMode };
    onChange(updated);
    if (onAutoSave) {
      await onAutoSave(
        updated,
        'strategy',
        'Saved!',
        `Routing strategy set to ${STRATEGY_LABELS[newMode] || newMode}`
      );
    }
  };

  const getMeteredProps = (key: MeteredProviderKey) => {
    if (key === 'serpapi') {
      return {
        isEnabled: settings.serpApiEnabled === 1,
        apiKey: settings.serpApiKey || '',
        quotaMode: (settings.serpApiQuotaMode || 'monthly') as 'monthly' | 'one-time',
        monthlyQuota: settings.serpApiQuota,
        resetDay: settings.serpApiResetDay ?? 1,
        nextResetDate: settings.serpApiResetDate || '',
        usedCount: settings.serpApiUsed ?? 0,
      };
    }
    return {
      isEnabled: settings.searchApiEnabled === 1,
      apiKey: settings.searchApiKey || '',
      quotaMode: (settings.searchApiQuotaMode || 'monthly') as 'monthly' | 'one-time',
      monthlyQuota: settings.searchApiQuota,
      resetDay: settings.searchApiResetDay ?? 1,
      nextResetDate: settings.searchApiResetDate || '',
      usedCount: settings.searchApiUsed ?? 0,
    };
  };

  return (
    <div className="space-y-6 pt-2">
      <SettingsIntroBanner
        title="Data Sources & Query Routing"
        description="Configure flight search providers, monthly query allowances, and routing strategies. Flight checks dynamically query active sources based on priority order and configured fallback behavior."
      />

      <QueryRoutingStrategyCard
        fallbackStrategyMode={settings.fallbackStrategyMode}
        status={providerStatus['strategy']}
        onSelectStrategy={handleSelectStrategy}
      />

      {/* Reorderable Data Source Provider Stack */}
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-bold text-slate-200">Data Source Priority Order</h3>
          <p className="text-xs text-gunmetal-muted">
            Use the chevrons on each card to adjust priority rank across all configured providers. Inactive providers remain in their fixed rank position but are skipped at runtime.
          </p>
        </div>

        {providerOrder.map((key, index) => {
          if (key === 'openfarescraper') {
            return (
              <SelfHostedScraperCard
                key={key}
                providerName={PROVIDER_NAMES['openfarescraper']}
                rankIndex={index}
                totalCount={providerOrder.length}
                isEnabled={settings.openfareScraperEnabled === 1}
                prioritizeFirst={settings.openfareScraperPrioritizeFirst !== 0}
                scraperUrl={settings.openfareScraperUrl || ''}
                scraperApiKey={settings.openfareScraperApiKey || ''}
                initialHealth={cachedScraperHealth}
                onHealthUpdated={onScraperHealthUpdated}
                status={providerStatus['openfarescraper']}
                onToggleEnabled={checked => toggleEnabled('openfarescraper', checked)}
                onTogglePrioritizeFirst={toggleScraperPrioritizeFirst}
                onMove={dir => move(index, dir)}
                onUrlChange={val => onChange({ ...settings, openfareScraperUrl: val })}
                onUrlBlur={() => {
                  if (onAutoSave) {
                    onAutoSave(
                      settings,
                      'openfarescraper',
                      'Saved!',
                      'OpenFareScraper URL saved'
                    );
                  }
                }}
                onApiKeyChange={val => onChange({ ...settings, openfareScraperApiKey: val })}
                onApiKeyBlur={() => {
                  if (onAutoSave) {
                    onAutoSave(
                      settings,
                      'openfarescraper',
                      'Saved!',
                      'OpenFareScraper API key saved'
                    );
                  }
                }}
                onOpenLogs={() => setSelectedLogsProvider('openfarescraper')}
              />
            );
          }

          const props = getMeteredProps(key);
          return (
            <MeteredProviderCard
              key={key}
              providerKey={key}
              providerName={PROVIDER_NAMES[key]}
              rankIndex={index}
              totalCount={providerOrder.length}
              isEnabled={props.isEnabled}
              apiKey={props.apiKey}
              quotaMode={props.quotaMode}
              monthlyQuota={props.monthlyQuota}
              resetDay={props.resetDay}
              nextResetDate={props.nextResetDate}
              timezone={settings.timezone}
              usedCount={props.usedCount}
              status={providerStatus[key]}
              onToggleEnabled={checked => toggleEnabled(key, checked)}
              onMove={dir => move(index, dir)}
              onOpenLogs={() => setSelectedLogsProvider(key)}
              onApiKeyChange={val => {
                if (key === 'serpapi') onChange({ ...settings, serpApiKey: val });
                if (key === 'searchapi') onChange({ ...settings, searchApiKey: val });
              }}
              onApiKeyBlur={() => {
                if (onAutoSave) {
                  onAutoSave(settings, key, 'Saved!', `${PROVIDER_NAMES[key]} API key saved`);
                }
              }}
              onQuotaModeChange={async mode => {
                let updated = { ...settings };
                if (key === 'serpapi') {
                  updated = { ...settings, serpApiQuotaMode: mode };
                } else if (key === 'searchapi') {
                  updated = { ...settings, searchApiQuotaMode: mode };
                }
                onChange(updated);
                if (onAutoSave) {
                  await onAutoSave(
                    updated,
                    key,
                    'Saved!',
                    `${PROVIDER_NAMES[key]} quota mode set to ${mode === 'one-time' ? 'One-Time Credits' : 'Monthly Recurring'}`
                  );
                }
              }}
              onQuotaChange={val => {
                if (key === 'serpapi') onChange({ ...settings, serpApiQuota: val });
                if (key === 'searchapi') onChange({ ...settings, searchApiQuota: val });
              }}
              onQuotaBlur={() => {
                if (onAutoSave) {
                  onAutoSave(settings, key, 'Saved!', `${PROVIDER_NAMES[key]} monthly quota updated`);
                }
              }}
              onResetDayChange={async (day, nextReset) => {
                let updated = { ...settings };
                if (key === 'serpapi') {
                  updated = { ...settings, serpApiResetDay: day, serpApiResetDate: nextReset };
                } else if (key === 'searchapi') {
                  updated = { ...settings, searchApiResetDay: day, searchApiResetDate: nextReset };
                }
                onChange(updated);
                if (onAutoSave) {
                  await onAutoSave(updated, key, 'Saved!', `${PROVIDER_NAMES[key]} monthly reset day updated`);
                }
              }}
              onAdjustUsage={onAdjustUsage}
            />
          );
        })}
      </div>

      <RouteAutoDetectionCard
        onOpenLogs={() => setSelectedLogsProvider('flight-route-lookup')}
      />

      <DataSourceLogsModal
        isOpen={Boolean(selectedLogsProvider)}
        providerKey={selectedLogsProvider}
        providerName={selectedLogsProvider ? PROVIDER_NAMES[selectedLogsProvider] || selectedLogsProvider : ''}
        onClose={() => setSelectedLogsProvider(null)}
      />
    </div>
  );
}