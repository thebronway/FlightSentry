'use client';

import React, { useState } from 'react';
import { KeyRound, ShieldCheck, Eye, EyeOff, X } from 'lucide-react';
import { DataSourceProvider } from '@/services/datasource';
import type { ProviderReadinessMap } from '@/app/api-test/page';
import {
  ALL_TEST_PROVIDERS,
  ProviderOverrideDraft,
  ProviderOverridesState,
} from './types';

interface ProviderSelectionGridProps {
  selectedProviders: DataSourceProvider[];
  providerReadiness: ProviderReadinessMap;
  overrides: ProviderOverridesState;
  disabled?: boolean;
  onToggleProvider: (provider: DataSourceProvider) => void;
  onSelectConfigured: () => void;
  onSelectAll: () => void;
  onOverrideChange: (
    provider: DataSourceProvider,
    field: keyof ProviderOverrideDraft,
    value: string
  ) => void;
  onClearOverride: (provider: DataSourceProvider) => void;
}

export default function ProviderSelectionGrid({
  selectedProviders,
  providerReadiness,
  overrides,
  disabled = false,
  onToggleProvider,
  onSelectConfigured,
  onSelectAll,
  onOverrideChange,
  onClearOverride,
}: ProviderSelectionGridProps) {
  const [revealedKeys, setRevealedKeys] = useState<Record<string, boolean>>({});

  const toggleReveal = (provider: DataSourceProvider) => {
    setRevealedKeys((prev) => ({ ...prev, [provider]: !prev[provider] }));
  };

  return (
    <div className="bg-gunmetal-card border border-gunmetal-border rounded-lg p-4 sm:p-5 space-y-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gunmetal-border/70 pb-3">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-100">
            2. Target Providers &amp; Credential Overrides
          </h2>
          <p className="text-xs text-gunmetal-muted mt-0.5">
            Saved keys are resolved server-side without exposing secrets and increment that provider&apos;s quota counter. Temporary overrides are never saved and are excluded from quota counters.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={disabled}
            onClick={onSelectConfigured}
            className="min-h-[36px] px-2.5 py-1.5 text-xs font-semibold rounded-md bg-gunmetal-canvas border border-gunmetal-border text-slate-300 hover:text-white hover:bg-gunmetal-border transition-colors disabled:opacity-40 cursor-pointer"
          >
            Select Configured
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={onSelectAll}
            className="min-h-[36px] px-2.5 py-1.5 text-xs font-semibold rounded-md bg-gunmetal-canvas border border-gunmetal-border text-slate-300 hover:text-white hover:bg-gunmetal-border transition-colors disabled:opacity-40 cursor-pointer"
          >
            Select All ({ALL_TEST_PROVIDERS.length})
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5">
        {ALL_TEST_PROVIDERS.map((meta) => {
          const isSelected = selectedProviders.includes(meta.id);
          const readiness = providerReadiness[meta.id];
          const draft = overrides[meta.id];
          const hasTempOverride = Boolean(
            draft.apiKey.trim() || (draft.scraperUrl && draft.scraperUrl.trim())
          );
          const isRevealed = Boolean(revealedKeys[meta.id]);

          return (
            <div
              key={meta.id}
              className={`rounded-lg border p-3.5 transition-all space-y-3 ${
                isSelected
                  ? 'bg-gunmetal-canvas/80 border-slate-500/80 shadow-sm'
                  : 'bg-gunmetal-canvas/35 border-gunmetal-border/70 opacity-75'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    disabled={disabled}
                    checked={isSelected}
                    onChange={() => onToggleProvider(meta.id)}
                    className="w-4 h-4 accent-sky-500 rounded"
                  />
                  <span className="font-bold text-sm text-slate-100">{meta.label}</span>
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${meta.badgeClass}`}
                  >
                    {meta.badge}
                  </span>
                </label>

                <div className="flex items-center gap-1.5">
                  {readiness.configured ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded border bg-emerald-950/50 text-emerald-300 border-emerald-800/60">
                      <ShieldCheck className="w-3 h-3" />
                      <span>Saved Key Ready</span>
                    </span>
                  ) : (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded border bg-gunmetal-card text-gunmetal-muted border-gunmetal-border">
                      Not Saved in DB
                    </span>
                  )}
                </div>
              </div>

              {/* Quota & Credential Mode Indicator */}
              <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono px-2.5 py-1.5 rounded bg-gunmetal-card border border-gunmetal-border/80">
                {hasTempOverride ? (
                  <span className="text-amber-300 font-semibold flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                    <span>Temporary Override • Not Saved / Quota Exempt</span>
                  </span>
                ) : readiness.configured ? (
                  <span className="text-sky-300 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-sky-400" />
                    <span>Using Saved Key • Increments Quota Counter</span>
                  </span>
                ) : (
                  <span className="text-rose-300/90">
                    Requires temporary key override below or saved Settings key
                  </span>
                )}

                {hasTempOverride && (
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => onClearOverride(meta.id)}
                    title="Clear temporary override and revert to saved key"
                    className="inline-flex items-center gap-1 text-[10px] font-sans font-semibold text-slate-300 hover:text-white px-1.5 py-0.5 rounded bg-gunmetal-canvas border border-gunmetal-border cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                    <span>Clear</span>
                  </button>
                )}
              </div>

              {/* Temporary Override Inputs */}
              <div className="space-y-2">
                {meta.supportsScraperUrl && (
                  <div>
                    <label
                      htmlFor={`override-url-${meta.id}`}
                      className="block text-[10px] font-semibold uppercase tracking-wider text-gunmetal-muted mb-1"
                    >
                      Temporary Scraper URL Override (Optional)
                    </label>
                    <input
                      id={`override-url-${meta.id}`}
                      type="url"
                      disabled={disabled}
                      value={draft.scraperUrl || ''}
                      onChange={(e) => onOverrideChange(meta.id, 'scraperUrl', e.target.value)}
                      placeholder={
                        readiness.configured
                          ? 'Leave blank to use saved Scraper URL'
                          : 'http://flightsentry-scraper:4001'
                      }
                      className="w-full min-h-[38px] border border-gunmetal-border px-2.5 py-1.5 rounded-md bg-gunmetal-card text-slate-200 font-mono text-xs focus:outline-none focus:border-slate-500 disabled:opacity-50"
                    />
                  </div>
                )}

                <div>
                  <label
                    htmlFor={`override-key-${meta.id}`}
                    className="block text-[10px] font-semibold uppercase tracking-wider text-gunmetal-muted mb-1"
                  >
                    Temporary API Key Override (Optional)
                  </label>
                  <div className="relative">
                    <input
                      id={`override-key-${meta.id}`}
                      type={isRevealed ? 'text' : 'password'}
                      autoComplete="off"
                      disabled={disabled}
                      value={draft.apiKey}
                      onChange={(e) => onOverrideChange(meta.id, 'apiKey', e.target.value)}
                      placeholder={
                        readiness.configured
                          ? 'Leave blank to use saved key'
                          : meta.keyPlaceholder
                      }
                      className="w-full min-h-[38px] border border-gunmetal-border px-2.5 py-1.5 pr-9 rounded-md bg-gunmetal-card text-slate-200 font-mono text-xs focus:outline-none focus:border-slate-500 disabled:opacity-50"
                    />
                    <button
                      type="button"
                      onClick={() => toggleReveal(meta.id)}
                      aria-label={isRevealed ? 'Hide temporary key' : 'Show temporary key'}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gunmetal-muted hover:text-slate-200 cursor-pointer"
                    >
                      {isRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}