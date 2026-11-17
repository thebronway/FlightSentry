'use client';

import { useState, useEffect, useMemo } from 'react';
import { Tag, Coins, Clock, RefreshCw, Plus, X } from 'lucide-react';
import SettingsCard from '@/components/settings/shared/SettingsCard';
import SettingsSelect from '@/components/settings/shared/SettingsSelect';
import { SUPPORTED_CURRENCIES } from '@/components/settings/general/DisplayCurrencyCard';
import { POPULAR_POINTS_PRESETS } from '@/components/settings/general/PointsCurrenciesCard';
import { setActiveCurrency } from '@/utils/format';
import { OnboardingStepProps } from '../types';

export default function GeneralStep({
  settings,
  onChange,
  onSkipToSettingsLater,
}: OnboardingStepProps) {
  const [newPointsName, setNewPointsName] = useState('');
  const [localClock, setLocalClock] = useState('');

  const timezone = settings.timezone || 'UTC';

  useEffect(() => {
    const tick = () => {
      try {
        setLocalClock(
          new Intl.DateTimeFormat('en-US', {
            timeZone: timezone,
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            second: '2-digit',
            hour12: true,
          }).format(new Date())
        );
      } catch {
        setLocalClock(new Date().toUTCString());
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [timezone]);

  const pointsList: string[] = useMemo(() => {
    if (!settings.pointsCurrencies) return [];
    try {
      const parsed =
        typeof settings.pointsCurrencies === 'string'
          ? JSON.parse(settings.pointsCurrencies)
          : settings.pointsCurrencies;
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }, [settings.pointsCurrencies]);

  const availablePresets = useMemo(
    () =>
      POPULAR_POINTS_PRESETS.filter(
        (preset) => !pointsList.some((p) => p.toLowerCase() === preset.toLowerCase())
      ),
    [pointsList]
  );

  const addPointsCurrency = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (pointsList.some((p) => p.toLowerCase() === trimmed.toLowerCase())) return;
    onChange({
      ...settings,
      pointsCurrencies: JSON.stringify([...pointsList, trimmed]),
    });
    setNewPointsName('');
  };

  const removePointsCurrency = (name: string) => {
    onChange({
      ...settings,
      pointsCurrencies: JSON.stringify(pointsList.filter((p) => p !== name)),
    });
  };

  return (
    <div className="space-y-4">
      {/* 1. Automatic GitHub Update & Announcement Checks */}
      <SettingsCard className="space-y-2">
        <label className="min-h-[44px] sm:min-h-0 flex items-start gap-2.5 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={(settings.githubSyncEnabled ?? 1) === 1}
            onChange={(e) =>
              onChange({ ...settings, githubSyncEnabled: e.target.checked ? 1 : 0 })
            }
            className="w-4 h-4 mt-0.5 accent-slate-500 rounded cursor-pointer"
          />
          <div className="space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
              <RefreshCw className="w-3.5 h-3.5 text-purple-400" />
              <span>1. Automatic GitHub Update &amp; Announcement Checks</span>
            </span>
            <p className="text-xs text-gunmetal-muted leading-relaxed">
              Checks GitHub once every 24 hours for new FlightSentry releases and important notices, with silent offline fallback if your instance is air-gapped.
            </p>
          </div>
        </label>
      </SettingsCard>

      {/* 2. Configured Timezone */}
      <SettingsCard className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-emerald-400" />
            <span>2. Application Timezone &amp; Configured Time</span>
          </span>
          <span className="text-xs font-mono text-sky-400 bg-gunmetal-card px-2.5 py-1 rounded border border-gunmetal-border">
            {timezone} · {localClock || 'Resolving clock...'}
          </span>
        </div>
        <p className="text-xs text-gunmetal-muted leading-relaxed">
          Governs daily check start times, monthly API quota rollover dates, and departure expiration checks. Configured via the <code className="text-slate-300">TZ</code> environment variable in your Docker configuration.
        </p>
      </SettingsCard>

      {/* 3. Display & Search Currency */}
      <SettingsCard className="space-y-2.5">
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
          <Tag className="w-4 h-4 text-sky-400" />
          <span>3. Display &amp; Search Currency</span>
        </label>
        <p className="text-xs text-gunmetal-muted leading-relaxed">
          Sets the primary currency symbol shown across dashboard cards, price history graphs, and alert thresholds, and tells outbound flight search providers which currency to request fares in.
        </p>
        <SettingsSelect
          value={settings.currency || 'USD'}
          onChange={(e) => {
            const next = e.target.value;
            setActiveCurrency(next);
            onChange({ ...settings, currency: next });
          }}
          wrapperClassName="max-w-full sm:max-w-sm"
          className="font-medium"
        >
          {SUPPORTED_CURRENCIES.map((curr) => (
            <option key={curr.code} value={curr.code} className="bg-gunmetal-card text-slate-200">
              {curr.code} — {curr.name} ({curr.symbol})
            </option>
          ))}
        </SettingsSelect>
      </SettingsCard>

      {/* 4. Points & Miles Currencies */}
      <SettingsCard className="space-y-3">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
            <Coins className="w-4 h-4 text-amber-400" />
            <span>4. Points &amp; Miles Currencies (Optional)</span>
          </label>
          <p className="text-xs text-gunmetal-muted leading-relaxed mt-1">
            Add loyalty currencies (e.g., <em>AAdvantage miles</em>, <em>Delta SkyMiles</em>) if you track award redemptions. Award flights run in manual/email-import mode without consuming automated cash-fare API quota, and can also record cash taxes &amp; fees.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {pointsList.map((curr) => (
            <span
              key={curr}
              className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-md text-xs font-semibold bg-gunmetal-card border border-gunmetal-border text-slate-200"
            >
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span>{curr}</span>
              <button
                type="button"
                onClick={() => removePointsCurrency(curr)}
                aria-label={`Remove ${curr}`}
                className="p-1 text-gunmetal-muted hover:text-slate-100 rounded cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </span>
          ))}
          {pointsList.length === 0 && (
            <span className="text-xs text-gunmetal-muted italic">
              None added yet — pick a preset below or enter your own.
            </span>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 max-w-md">
          <input
            type="text"
            placeholder="e.g. AAdvantage miles, Chase UR points"
            value={newPointsName}
            onChange={(e) => setNewPointsName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addPointsCurrency(newPointsName);
              }
            }}
            className="flex-1 min-h-[44px] sm:min-h-[38px] border border-gunmetal-border px-3 py-2 rounded-md bg-gunmetal-canvas text-slate-200 placeholder-zinc-500 focus:outline-none focus:border-slate-500 text-sm"
          />
          <button
            type="button"
            disabled={!newPointsName.trim()}
            onClick={() => addPointsCurrency(newPointsName)}
            className="min-h-[44px] sm:min-h-[38px] px-4 py-2 text-xs sm:text-sm font-semibold bg-gunmetal-canvas hover:bg-gunmetal-border text-slate-300 hover:text-white border border-gunmetal-border rounded-lg inline-flex items-center justify-center gap-1.5 disabled:opacity-45 disabled:pointer-events-none transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add</span>
          </button>
        </div>

        {availablePresets.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            {availablePresets.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => addPointsCurrency(preset)}
                className="min-h-[36px] text-[11px] px-2.5 py-1 rounded border border-gunmetal-border bg-gunmetal-canvas hover:bg-gunmetal-border text-slate-300 hover:text-white inline-flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Plus className="w-3 h-3 text-amber-400" />
                <span>{preset}</span>
              </button>
            ))}
          </div>
        )}
      </SettingsCard>
    </div>
  );
}