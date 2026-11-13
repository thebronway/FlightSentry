'use client';

import React, { useState } from 'react';
import { FlaskConical, AlertCircle } from 'lucide-react';
import { DataSourceProvider } from '@/services/datasource';
import type { ProviderReadinessMap } from '@/app/api-test/page';
import type { DevProviderTestResponse } from '@/services/devApiTester';
import {
  ALL_TEST_PROVIDERS,
  ApiTestFormState,
  ProviderOverrideDraft,
  ProviderOverridesState,
} from './types';
import TestQueryForm from './TestQueryForm';
import ProviderSelectionGrid from './ProviderSelectionGrid';
import ProviderResultCards from './ProviderResultCards';
import ParityComparisonPanel from './ParityComparisonPanel';
import RawPayloadViewer from './RawPayloadViewer';

interface ApiTestWorkspaceProps {
  currency: string;
  defaultDepartureDate: string;
  providerReadiness: ProviderReadinessMap;
}

const EMPTY_OVERRIDES: ProviderOverridesState = {
  serpapi: { apiKey: '' },
  searchapi: { apiKey: '' },
  hasdata: { apiKey: '' },
  'flightsentry-scraper': { apiKey: '', scraperUrl: '' },
};

export default function ApiTestWorkspace({
  currency,
  defaultDepartureDate,
  providerReadiness,
}: ApiTestWorkspaceProps) {
  const configuredProviders = ALL_TEST_PROVIDERS.map((p) => p.id).filter(
    (id) => providerReadiness[id]?.configured
  );

  const [form, setForm] = useState<ApiTestFormState>({
    origin: 'JFK',
    destination: 'LAX',
    departureDate: defaultDepartureDate,
    cabinClass: 'economy',
    fareTier: 'Standard',
    airline: '',
    flightNumber: '',
  });

  const [selectedProviders, setSelectedProviders] = useState<DataSourceProvider[]>(
    configuredProviders.length > 0 ? configuredProviders : ['serpapi']
  );
  const [overrides, setOverrides] = useState<ProviderOverridesState>(EMPTY_OVERRIDES);
  const [isRunning, setIsRunning] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [report, setReport] = useState<DevProviderTestResponse | null>(null);

  const handleFormChange = <K extends keyof ApiTestFormState>(
    field: K,
    value: ApiTestFormState[K]
  ) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSwapRoute = () => {
    setForm((prev) => ({
      ...prev,
      origin: prev.destination,
      destination: prev.origin,
    }));
  };

  const handleToggleProvider = (provider: DataSourceProvider) => {
    setSelectedProviders((prev) =>
      prev.includes(provider)
        ? prev.filter((p) => p !== provider)
        : [...prev, provider]
    );
  };

  const handleSelectConfigured = () => {
    const configured = ALL_TEST_PROVIDERS.map((p) => p.id).filter(
      (id) => providerReadiness[id]?.configured
    );
    if (configured.length > 0) {
      setSelectedProviders(configured);
    }
  };

  const handleSelectAll = () => {
    setSelectedProviders(ALL_TEST_PROVIDERS.map((p) => p.id));
  };

  const handleOverrideChange = (
    provider: DataSourceProvider,
    field: keyof ProviderOverrideDraft,
    value: string
  ) => {
    setOverrides((prev) => ({
      ...prev,
      [provider]: {
        ...prev[provider],
        [field]: value,
      },
    }));
  };

  const handleClearOverride = (provider: DataSourceProvider) => {
    setOverrides((prev) => ({
      ...prev,
      [provider]:
        provider === 'flightsentry-scraper'
          ? { apiKey: '', scraperUrl: '' }
          : { apiKey: '' },
    }));
  };

  const handleRunComparison = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedProviders.length === 0 || isRunning) return;

    setIsRunning(true);
    setRequestError(null);

    try {
      const payload = {
        origin: form.origin.trim().toUpperCase(),
        destination: form.destination.trim().toUpperCase(),
        departureDate: form.departureDate.trim(),
        cabinClass: form.cabinClass,
        fareTier: form.fareTier,
        airline: form.airline.trim() || null,
        flightNumber: form.flightNumber.trim() || null,
        providers: selectedProviders,
        overrides: {
          serpapi: overrides.serpapi.apiKey.trim()
            ? { apiKey: overrides.serpapi.apiKey.trim() }
            : undefined,
          searchapi: overrides.searchapi.apiKey.trim()
            ? { apiKey: overrides.searchapi.apiKey.trim() }
            : undefined,
          hasdata: overrides.hasdata.apiKey.trim()
            ? { apiKey: overrides.hasdata.apiKey.trim() }
            : undefined,
          'flightsentry-scraper':
            overrides['flightsentry-scraper'].apiKey.trim() ||
            overrides['flightsentry-scraper'].scraperUrl?.trim()
              ? {
                  apiKey: overrides['flightsentry-scraper'].apiKey.trim() || undefined,
                  scraperUrl:
                    overrides['flightsentry-scraper'].scraperUrl?.trim() || undefined,
                }
              : undefined,
        },
      };

      const res = await fetch('/api/dev/provider-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setRequestError(data.error || `Request failed with HTTP ${res.status}`);
        return;
      }

      setReport(data as DevProviderTestResponse);
    } catch (err: any) {
      setRequestError(err?.message || 'Network error executing provider test.');
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-slate-100">Dev API Provider Tester</h1>
            <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold px-2.5 py-0.5 rounded border bg-amber-950/60 text-amber-300 border-amber-700/70">
              <FlaskConical className="w-3.5 h-3.5 text-amber-400" />
              <span>ENABLE_API_TESTER=true</span>
            </span>
          </div>
          <p className="text-xs sm:text-sm text-gunmetal-muted mt-1">
            Execute FlightSentry&apos;s production provider adapters side-by-side to verify normalized field parity, latency, and raw upstream responses.
          </p>
        </div>
      </div>

      {/* Query Inputs */}
      <TestQueryForm
        form={form}
        isRunning={isRunning}
        selectedCount={selectedProviders.length}
        onChange={handleFormChange}
        onSwapRoute={handleSwapRoute}
        onSubmit={handleRunComparison}
      />

      {/* Provider Selection & Optional Temporary Overrides */}
      <ProviderSelectionGrid
        selectedProviders={selectedProviders}
        providerReadiness={providerReadiness}
        overrides={overrides}
        disabled={isRunning}
        onToggleProvider={handleToggleProvider}
        onSelectConfigured={handleSelectConfigured}
        onSelectAll={handleSelectAll}
        onOverrideChange={handleOverrideChange}
        onClearOverride={handleClearOverride}
      />

      {/* Global Request Validation / Network Error */}
      {requestError && (
        <div className="p-4 rounded-lg bg-red-950/40 border border-red-800/70 flex items-start gap-3 text-xs sm:text-sm text-red-200">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div className="break-words">{requestError}</div>
        </div>
      )}

      {/* Results Output */}
      {report && (
        <div className="space-y-6">
          <ProviderResultCards results={report.results} currency={report.currency || currency} />
          <ParityComparisonPanel
            parity={report.parity}
            results={report.results}
            currency={report.currency || currency}
          />
          <RawPayloadViewer results={report.results} />
        </div>
      )}
    </div>
  );
}