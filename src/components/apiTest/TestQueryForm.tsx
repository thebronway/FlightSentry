'use client';

import React from 'react';
import { PlaneTakeoff, PlaneLanding, Calendar, Hash, Play, Loader2, ArrowLeftRight } from 'lucide-react';
import { CabinClass, FareTier } from '@/types';
import SettingsSelect from '@/components/settings/shared/SettingsSelect';
import { ApiTestFormState } from './types';

interface TestQueryFormProps {
  form: ApiTestFormState;
  isRunning: boolean;
  selectedCount: number;
  onChange: <K extends keyof ApiTestFormState>(field: K, value: ApiTestFormState[K]) => void;
  onSwapRoute: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

export default function TestQueryForm({
  form,
  isRunning,
  selectedCount,
  onChange,
  onSwapRoute,
  onSubmit,
}: TestQueryFormProps) {
  return (
    <form
      onSubmit={onSubmit}
      className="bg-gunmetal-card border border-gunmetal-border rounded-lg p-4 sm:p-5 space-y-4 shadow-sm"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gunmetal-border/70 pb-3">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-100">
            1. Search Parameters
          </h2>
          <p className="text-xs text-gunmetal-muted mt-0.5">
            Configure route, date, cabin tier, and optional carrier/flight number filters passed to each production adapter.
          </p>
        </div>
        <span className="text-[11px] font-mono px-2.5 py-1 rounded bg-gunmetal-canvas border border-gunmetal-border text-slate-300">
          {form.airline.trim() && form.flightNumber.trim()
            ? 'Mode: FlightNumber + Alternatives'
            : 'Mode: Route Search'}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3.5 items-end">
        {/* Origin */}
        <div className="lg:col-span-2">
          <label
            htmlFor="api-test-origin"
            className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1"
          >
            <PlaneTakeoff className="w-3.5 h-3.5 text-slate-400" />
            <span>Origin</span>
          </label>
          <input
            id="api-test-origin"
            type="text"
            required
            maxLength={32}
            value={form.origin}
            onChange={(e) => onChange('origin', e.target.value.toUpperCase())}
            placeholder="JFK or NYC"
            className="w-full min-h-[44px] sm:min-h-[38px] border border-gunmetal-border px-3 py-2 rounded-md bg-gunmetal-canvas text-slate-100 font-mono uppercase focus:outline-none focus:border-slate-500 text-sm"
          />
        </div>

        {/* Swap button */}
        <div className="lg:col-span-1 flex justify-center">
          <button
            type="button"
            onClick={onSwapRoute}
            title="Swap origin and destination"
            aria-label="Swap origin and destination"
            className="w-full sm:w-auto min-h-[44px] sm:min-h-[38px] px-3 py-2 rounded-md bg-gunmetal-canvas border border-gunmetal-border text-slate-300 hover:text-white hover:bg-gunmetal-border transition-colors flex items-center justify-center cursor-pointer"
          >
            <ArrowLeftRight className="w-4 h-4" />
          </button>
        </div>

        {/* Destination */}
        <div className="lg:col-span-2">
          <label
            htmlFor="api-test-destination"
            className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1"
          >
            <PlaneLanding className="w-3.5 h-3.5 text-slate-400" />
            <span>Destination</span>
          </label>
          <input
            id="api-test-destination"
            type="text"
            required
            maxLength={32}
            value={form.destination}
            onChange={(e) => onChange('destination', e.target.value.toUpperCase())}
            placeholder="LAX or WAS"
            className="w-full min-h-[44px] sm:min-h-[38px] border border-gunmetal-border px-3 py-2 rounded-md bg-gunmetal-canvas text-slate-100 font-mono uppercase focus:outline-none focus:border-slate-500 text-sm"
          />
        </div>

        {/* Departure Date */}
        <div className="lg:col-span-3">
          <label
            htmlFor="api-test-date"
            className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1"
          >
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>Departure Date</span>
          </label>
          <input
            id="api-test-date"
            type="date"
            required
            value={form.departureDate}
            onChange={(e) => onChange('departureDate', e.target.value)}
            className="w-full min-h-[44px] sm:min-h-[38px] border border-gunmetal-border px-3 py-2 rounded-md bg-gunmetal-canvas text-slate-100 font-mono focus:outline-none focus:border-slate-500 text-sm"
          />
        </div>

        {/* Cabin Class */}
        <div className="lg:col-span-2">
          <label
            htmlFor="api-test-cabin"
            className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1"
          >
            Cabin Class
          </label>
          <SettingsSelect
            id="api-test-cabin"
            compactDesktop
            value={form.cabinClass}
            onChange={(e) => onChange('cabinClass', e.target.value as CabinClass)}
          >
            <option value="economy">Economy</option>
            <option value="premium_economy">Premium Economy</option>
            <option value="business">Business</option>
            <option value="first">First</option>
          </SettingsSelect>
        </div>

        {/* Fare Tier */}
        <div className="lg:col-span-2">
          <label
            htmlFor="api-test-faretier"
            className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1"
          >
            Fare Tier
          </label>
          <SettingsSelect
            id="api-test-faretier"
            compactDesktop
            value={form.fareTier}
            onChange={(e) => onChange('fareTier', e.target.value as FareTier)}
          >
            <option value="Standard">Standard (No Basic)</option>
            <option value="Basic Economy">Basic Economy</option>
          </SettingsSelect>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3.5 items-end pt-1">
        {/* Optional Carrier */}
        <div className="lg:col-span-3">
          <label
            htmlFor="api-test-airline"
            className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1"
          >
            Carrier Filter (Optional)
          </label>
          <input
            id="api-test-airline"
            type="text"
            maxLength={32}
            value={form.airline}
            onChange={(e) => onChange('airline', e.target.value.toUpperCase())}
            placeholder="e.g. DL, UA, AA"
            className="w-full min-h-[44px] sm:min-h-[38px] border border-gunmetal-border px-3 py-2 rounded-md bg-gunmetal-canvas text-slate-100 font-mono uppercase focus:outline-none focus:border-slate-500 text-sm"
          />
        </div>

        {/* Optional Flight Number */}
        <div className="lg:col-span-3">
          <label
            htmlFor="api-test-flightnum"
            className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1"
          >
            <Hash className="w-3.5 h-3.5 text-slate-400" />
            <span>Flight Number (Optional)</span>
          </label>
          <input
            id="api-test-flightnum"
            type="text"
            maxLength={10}
            value={form.flightNumber}
            onChange={(e) => onChange('flightNumber', e.target.value.toUpperCase())}
            placeholder="e.g. 452 or DL452"
            className="w-full min-h-[44px] sm:min-h-[38px] border border-gunmetal-border px-3 py-2 rounded-md bg-gunmetal-canvas text-slate-100 font-mono uppercase focus:outline-none focus:border-slate-500 text-sm"
          />
        </div>

        <div className="lg:col-span-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gunmetal-canvas/60 border border-gunmetal-border/80 rounded-md px-3.5 py-2.5">
          <p className="text-[11px] text-gunmetal-muted leading-relaxed">
            Leave Carrier &amp; Flight Number blank to compare all route itineraries, or specify a flight number to inspect single-flight parity.
          </p>
          <button
            type="submit"
            disabled={isRunning || selectedCount === 0}
            className="min-h-[44px] sm:min-h-[38px] inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md text-xs font-bold uppercase tracking-wider bg-sky-600 hover:bg-sky-500 text-white border border-sky-400/50 shadow-sm transition-colors disabled:opacity-40 disabled:pointer-events-none cursor-pointer whitespace-nowrap flex-shrink-0"
          >
            {isRunning ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Running ({selectedCount})...</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" />
                <span>Run Comparison ({selectedCount})</span>
              </>
            )}
          </button>
        </div>
      </div>
    </form>
  );
}