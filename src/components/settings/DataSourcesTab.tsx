'use client';

import { useState } from 'react';
import { Settings } from '@/types';
import SettingsIntroBanner from './shared/SettingsIntroBanner';
import DataSourceLogsModal from './DataSourceLogsModal';
import QueryRoutingStrategyCard from './datasources/QueryRoutingStrategyCard';
import MeteredProviderCard, { MeteredProviderKey } from './datasources/MeteredProviderCard';
import UnmeteredScraperCard from './datasources/UnmeteredScraperCard';
import RouteAutoDetectionCard from './datasources/RouteAutoDetectionCard';

interface Props {
  settings: Settings;
  onChange: (settings: Settings) => void;
  providerStatus: Record<string, { type: 'success' | 'error'; message: string } | null>;
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
  hasdata: 'HasData',
  fastflights: 'Fast-Flights (Scraper)',
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
  onAutoSave,
  onAdjustUsage,
}: Props) {
  const meteredKeys: MeteredProviderKey[] = ['serpapi', 'searchapi', 'hasdata'];
  const meteredOrder = (settings.dataSourceStrategy || 'serpapi,searchapi,hasdata')
    .split(',')
    .map(s => s.trim())
    .filter((k): k is MeteredProviderKey => meteredKeys.includes(k as MeteredProviderKey));

  meteredKeys.forEach(k => {
    if (!meteredOrder.includes(k)) meteredOrder.push(k);
  });

  const [selectedLogsProvider, setSelectedLogsProvider] = useState<string | null>(null);

  const move = async (index: number, dir: -1 | 1) => {
    const newOrder = [...meteredOrder];
    const temp = newOrder[index];
    newOrder[index] = newOrder[index + dir];
    newOrder[index + dir] = temp;
    const updatedStrategy = [...newOrder, 'fastflights'].join(',');
    const updated = { ...settings, dataSourceStrategy: updatedStrategy };
    onChange(updated);
    if (onAutoSave) {
      await onAutoSave(updated, '', '', 'Metered API priority order updated');
    }
  };

  const toggleEnabled = async (key: string, checked: boolean) => {
    const val = checked ? 1 : 0;
    const updated = { ...settings };
    if (key === 'serpapi') updated.serpApiEnabled = val;
    if (key === 'searchapi') updated.searchApiEnabled = val;
    if (key === 'hasdata') updated.hasdataEnabled = val;
    if (key === 'fastflights') updated.fastFlightsEnabled = val;
    onChange(updated);
    if (onAutoSave) {
      const providerLabel = PROVIDER_NAMES[key] || key;
      await onAutoSave(updated, key, 'Saved!', `${providerLabel} ${checked ? 'enabled' : 'disabled'}`);
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
        monthlyQuota: settings.serpApiQuota,
        resetDay: settings.serpApiResetDay ?? 1,
        nextResetDate: settings.serpApiResetDate || '',
        usedCount: settings.serpApiUsed ?? 0,
      };
    }
    if (key === 'searchapi') {
      return {
        isEnabled: settings.searchApiEnabled === 1,
        apiKey: settings.searchApiKey || '',
        monthlyQuota: settings.searchApiQuota,
        resetDay: settings.searchApiResetDay ?? 1,
        nextResetDate: settings.searchApiResetDate || '',
        usedCount: settings.searchApiUsed ?? 0,
      };
    }
    return {
      isEnabled: settings.hasdataEnabled === 1,
      apiKey: settings.hasdataApiKey || '',
      monthlyQuota: settings.hasdataQuota,
      resetDay: settings.hasdataResetDay ?? 1,
      nextResetDate: settings.hasdataResetDate || '',
      usedCount: settings.hasdataUsed ?? 0,
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

      {/* Reorderable Metered API Provider Stack */}
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-bold text-slate-200">Metered API Priority Order</h3>
          <p className="text-xs text-gunmetal-muted">
            Use the chevrons on each card to adjust priority rank across metered API providers. Inactive providers remain in their fixed rank position but are skipped at runtime.
          </p>
        </div>

        {meteredOrder.map((key, index) => {
          const props = getMeteredProps(key);
          return (
            <MeteredProviderCard
              key={key}
              providerKey={key}
              providerName={PROVIDER_NAMES[key]}
              rankIndex={index}
              totalCount={meteredOrder.length}
              isEnabled={props.isEnabled}
              apiKey={props.apiKey}
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
                if (key === 'hasdata') onChange({ ...settings, hasdataApiKey: val });
              }}
              onApiKeyBlur={() => {
                if (onAutoSave) {
                  onAutoSave(settings, key, 'Saved!', `${PROVIDER_NAMES[key]} API key saved`);
                }
              }}
              onQuotaChange={val => {
                if (key === 'serpapi') onChange({ ...settings, serpApiQuota: val });
                if (key === 'searchapi') onChange({ ...settings, searchApiQuota: val });
                if (key === 'hasdata') onChange({ ...settings, hasdataQuota: val });
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
                } else if (key === 'hasdata') {
                  updated = { ...settings, hasdataResetDay: day, hasdataResetDate: nextReset };
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

      <UnmeteredScraperCard
        providerName={PROVIDER_NAMES['fastflights']}
        isEnabled={settings.fastFlightsEnabled === 1}
        status={providerStatus['fastflights']}
        onToggleEnabled={checked => toggleEnabled('fastflights', checked)}
        onOpenLogs={() => setSelectedLogsProvider('fastflights')}
      />

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