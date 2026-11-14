'use client';

import { useState, useEffect, useMemo } from 'react';
import { Settings } from '@/types';
import { setActiveCurrency } from '@/utils/format';
import SettingsIntroBanner from './shared/SettingsIntroBanner';
import DisplayCurrencyCard, { SUPPORTED_CURRENCIES } from './general/DisplayCurrencyCard';
import PointsCurrenciesCard, { POPULAR_POINTS_PRESETS } from './general/PointsCurrenciesCard';
import SystemTimezoneCard from './general/SystemTimezoneCard';
import PastFlightsRetentionCard from './general/PastFlightsRetentionCard';
import AppVersionSupportCard from './general/AppVersionSupportCard';
import CurrencyWarningModal from './general/CurrencyWarningModal';

export { SUPPORTED_CURRENCIES, POPULAR_POINTS_PRESETS };

interface Props {
  settings: Settings;
  onChange: (settings: Settings) => void;
  onAutoSave?: (
    updatedSettings: Settings,
    statusKey: string,
    pillMessage?: string,
    toastMessage?: string
  ) => Promise<void>;
}

export default function GeneralTab({ settings, onChange, onAutoSave }: Props) {
  const [flightCount, setFlightCount] = useState<number>(0);
  const [pendingCurrency, setPendingCurrency] = useState<string | null>(null);
  const [showWarningModal, setShowWarningModal] = useState(false);

  const pointsList: string[] = useMemo(() => {
    if (!settings.pointsCurrencies) return [];
    try {
      const parsed = typeof settings.pointsCurrencies === 'string'
        ? JSON.parse(settings.pointsCurrencies)
        : settings.pointsCurrencies;
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }, [settings.pointsCurrencies]);

  const handleAddPointsCurrency = async (nameToAdd: string) => {
    const trimmed = nameToAdd.trim();
    if (!trimmed) return;
    if (pointsList.some(p => p.toLowerCase() === trimmed.toLowerCase())) return;
    const updatedList = [...pointsList, trimmed];
    const updated = { ...settings, pointsCurrencies: JSON.stringify(updatedList) };
    onChange(updated);
    if (onAutoSave) {
      await onAutoSave(updated, 'general', undefined, `Added "${trimmed}" to points currencies`);
    }
  };

  const handleRemovePointsCurrency = async (nameToRemove: string) => {
    const updatedList = pointsList.filter(p => p !== nameToRemove);
    const updated = { ...settings, pointsCurrencies: JSON.stringify(updatedList) };
    onChange(updated);
    if (onAutoSave) {
      await onAutoSave(updated, 'general', undefined, `Removed "${nameToRemove}" from points currencies`);
    }
  };

  const timezone = settings.timezone || 'UTC';

  useEffect(() => {
    fetch('/api/flights')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setFlightCount(data.length);
      })
      .catch(() => setFlightCount(0));
  }, []);

  useEffect(() => {
    if (settings.currency) {
      setActiveCurrency(settings.currency);
    }
  }, [settings.currency]);

  const executeCurrencyChange = async (newCurrency: string) => {
    setActiveCurrency(newCurrency);
    const updated = { ...settings, currency: newCurrency };
    onChange(updated);
    if (onAutoSave) {
      await onAutoSave(updated, 'general', undefined, `Display currency updated to ${newCurrency}`);
    }
  };

  const handleCurrencySelect = (newCurrency: string) => {
    if (newCurrency === (settings.currency || 'USD')) return;
    if (flightCount > 0) {
      setPendingCurrency(newCurrency);
      setShowWarningModal(true);
    } else {
      executeCurrencyChange(newCurrency);
    }
  };

  const handleConfirmModal = async () => {
    if (pendingCurrency) {
      await executeCurrencyChange(pendingCurrency);
      setPendingCurrency(null);
    }
    setShowWarningModal(false);
  };

  const handleCancelModal = () => {
    setPendingCurrency(null);
    setShowWarningModal(false);
  };

  const handleToggleGithubSync = async (enabled: boolean) => {
    const updated = { ...settings, githubSyncEnabled: enabled ? 1 : 0 };
    onChange(updated);
    if (onAutoSave) {
      await onAutoSave(
        updated,
        'general',
        undefined,
        enabled
          ? 'Automatic GitHub update & announcement checks enabled'
          : 'Automatic GitHub update & announcement checks disabled'
      );
    }
  };

  const handleRetentionDaysChange = async (retentionDays: number | null) => {
    const updated = { ...settings, pastFlightRetentionDays: retentionDays };
    onChange(updated);
    if (onAutoSave) {
      await onAutoSave(
        updated,
        'general',
        undefined,
        retentionDays === null
          ? 'Past flights retention set to Keep Forever'
          : `Past flights retention set to ${retentionDays} days`
      );
    }
  };

  return (
    <div className="space-y-6 pt-2">
      <SettingsIntroBanner
        title="Instance Preferences & System Environment"
        description="Manage instance-wide defaults including application currency, application timezone, version information, and project links."
      />

      <DisplayCurrencyCard
        currency={settings.currency || 'USD'}
        onSelectCurrency={handleCurrencySelect}
      />

      <PointsCurrenciesCard
        pointsList={pointsList}
        onAdd={handleAddPointsCurrency}
        onRemove={handleRemovePointsCurrency}
      />

      <SystemTimezoneCard timezone={timezone} />

      <PastFlightsRetentionCard
        retentionDays={settings.pastFlightRetentionDays ?? null}
        onSelectRetentionDays={handleRetentionDaysChange}
      />

      <AppVersionSupportCard
        githubSyncEnabled={(settings.githubSyncEnabled ?? 1) === 1}
        onToggleGithubSync={handleToggleGithubSync}
      />

      <CurrencyWarningModal
        isOpen={showWarningModal}
        currentCurrency={settings.currency || 'USD'}
        pendingCurrency={pendingCurrency}
        flightCount={flightCount}
        onConfirm={handleConfirmModal}
        onCancel={handleCancelModal}
      />
    </div>
  );
}