'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Compass } from 'lucide-react';
import { Settings, Flight } from '@/types';
import { setActiveCurrency } from '@/utils/format';
import SettingsIntroBanner from './shared/SettingsIntroBanner';
import SettingsCard from './shared/SettingsCard';
import DisplayCurrencyCard, { SUPPORTED_CURRENCIES } from './general/DisplayCurrencyCard';
import PointsCurrenciesCard, { POPULAR_POINTS_PRESETS } from './general/PointsCurrenciesCard';
import SystemTimezoneCard from './general/SystemTimezoneCard';
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
  const [flights, setFlights] = useState<Flight[]>([]);
  const [pendingCurrency, setPendingCurrency] = useState<string | null>(null);
  const [showWarningModal, setShowWarningModal] = useState(false);

  const flightCount = flights.length;

  const pointsUsageCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const f of flights) {
      if (f.currency) {
        counts[f.currency] = (counts[f.currency] || 0) + 1;
      }
    }
    return counts;
  }, [flights]);

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
        if (Array.isArray(data)) setFlights(data);
      })
      .catch(() => setFlights([]));
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

  return (
    <div className="space-y-6 pt-2">
      <SettingsIntroBanner
        title="Instance Preferences & System Environment"
        description="Manage application version details, update checks, configured timezone, display and points currencies, and the guided setup wizard."
      />

      <AppVersionSupportCard
        githubSyncEnabled={(settings.githubSyncEnabled ?? 1) === 1}
        onToggleGithubSync={handleToggleGithubSync}
      />

      <SystemTimezoneCard timezone={timezone} />

      <DisplayCurrencyCard
        currency={settings.currency || 'USD'}
        onSelectCurrency={handleCurrencySelect}
      />

      <PointsCurrenciesCard
        pointsList={pointsList}
        usageCounts={pointsUsageCounts}
        onAdd={handleAddPointsCurrency}
        onRemove={handleRemovePointsCurrency}
      />

      <SettingsCard className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
            <Compass className="w-4 h-4 text-sky-400" />
            <span>Instance Setup Wizard</span>
          </h3>
          <p className="text-xs text-gunmetal-muted leading-relaxed">
            Walk through guided configuration for general preferences, data sources, scheduling cadences, search defaults, alerts, email scanning, and security.
          </p>
        </div>
        <Link
          href="/dashboard/onboarding"
          className="self-start sm:self-center flex-shrink-0 min-h-[44px] sm:min-h-[38px] px-4 py-2 rounded-lg text-xs sm:text-sm inline-flex items-center justify-center gap-1.5 bg-gunmetal-canvas hover:bg-gunmetal-border border border-gunmetal-border text-slate-300 hover:text-white font-semibold transition-colors"
        >
          <Compass className="w-4 h-4 text-sky-400" />
          <span>Launch Setup Wizard</span>
        </Link>
      </SettingsCard>

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