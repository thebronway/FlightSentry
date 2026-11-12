'use client';

import { Settings, CabinClass, FareTier } from '@/types';
import { Sliders, Moon, Layers, ChevronDown, ShieldAlert, Timer } from 'lucide-react';
import AirlineTagInput from '../common/AirlineTagInput';

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

const ITINERARY_PRESETS = [6, 8, 10, 12, 16, 20, 24];

export default function SearchPreferencesTab({
  settings,
  onChange,
  onAutoSave,
}: Props) {
  const cabinClass = settings.defaultCabinClass || 'economy';
  const fareTier = settings.defaultFareTier || 'Standard';
  const maxStops = settings.defaultMaxStops;
  const noRedeye = settings.defaultNoRedeye === 1;
  const maxStored = settings.maxStoredItineraries ?? 12;
  const carrierDiversity = settings.carrierDiversityEnabled ?? 1;

  const currentPresetIndex = (() => {
    const exact = ITINERARY_PRESETS.indexOf(maxStored);
    if (exact !== -1) return exact;
    return ITINERARY_PRESETS.reduce((closestIdx, val, idx) => {
      return Math.abs(val - maxStored) < Math.abs(ITINERARY_PRESETS[closestIdx] - maxStored) ? idx : closestIdx;
    }, 3);
  })();

  const handleCabinClassChange = async (val: CabinClass) => {
    const updated = { ...settings, defaultCabinClass: val };
    onChange(updated);
    if (onAutoSave) {
      await onAutoSave(updated, 'searchprefs', undefined, 'Default cabin class updated');
    }
  };

  const handleFareTierChange = async (val: FareTier) => {
    const updated = { ...settings, defaultFareTier: val };
    onChange(updated);
    if (onAutoSave) {
      await onAutoSave(updated, 'searchprefs', undefined, 'Default fare tier updated');
    }
  };

  const handleMaxStopsChange = async (val: number | null) => {
    const updated = { ...settings, defaultMaxStops: val };
    onChange(updated);
    if (onAutoSave) {
      await onAutoSave(updated, 'searchprefs', undefined, 'Default maximum stops updated');
    }
  };

  const handleNoRedeyeToggle = async (checked: boolean) => {
    const val = checked ? 1 : 0;
    const updated = { ...settings, defaultNoRedeye: val };
    onChange(updated);
    if (onAutoSave) {
      await onAutoSave(updated, 'searchprefs', undefined, `Redeye filter default set to ${checked ? 'exclude' : 'include'}`);
    }
  };

  const handleIncludedAirlinesChange = async (val: string) => {
    const updated = { ...settings, defaultIncludedAirlines: val || null };
    onChange(updated);
    if (onAutoSave) {
      await onAutoSave(updated, 'searchprefs', undefined, 'Default airline inclusions updated');
    }
  };

  const handleExcludedAirlinesChange = async (val: string) => {
    const updated = { ...settings, defaultExcludedAirlines: val || null };
    onChange(updated);
    if (onAutoSave) {
      await onAutoSave(updated, 'searchprefs', undefined, 'Default airline exclusions updated');
    }
  };

  const handleMaxStoredChange = async (val: number) => {
    const clamped = Math.min(24, Math.max(6, Math.round(val)));
    const updated = { ...settings, maxStoredItineraries: clamped };
    onChange(updated);
    if (onAutoSave) {
      await onAutoSave(updated, 'searchprefs', undefined, `Max stored itineraries set to ${clamped}`);
    }
  };

  const handleCarrierDiversityToggle = async (checked: boolean) => {
    const val = checked ? 1 : 0;
    const updated = { ...settings, carrierDiversityEnabled: val };
    onChange(updated);
    if (onAutoSave) {
      await onAutoSave(updated, 'searchprefs', undefined, `Carrier diversity engine ${checked ? 'enabled' : 'disabled'}`);
    }
  };

  const handleMaxLayoverChange = async (val: number | null) => {
    const updated = { ...settings, defaultMaxLayoverMinutes: val };
    onChange(updated);
    if (onAutoSave) {
      await onAutoSave(updated, 'searchprefs', undefined, 'Default maximum layover duration updated');
    }
  };

  const handleExcludedConnectingAirportsChange = async (val: string) => {
    const updated = { ...settings, defaultExcludedConnectingAirports: val || null };
    onChange(updated);
    if (onAutoSave) {
      await onAutoSave(updated, 'searchprefs', undefined, 'Default excluded connecting airports updated');
    }
  };

  const handleMaxTotalDurationChange = async (val: number | null) => {
    const updated = { ...settings, defaultMaxTotalDurationMinutes: val };
    onChange(updated);
    if (onAutoSave) {
      await onAutoSave(updated, 'searchprefs', undefined, 'Default maximum trip duration updated');
    }
  };

  return (
    <div className="space-y-6 pt-2">
      <div className="bg-gunmetal-canvas/60 border border-gunmetal-border p-3.5 rounded-lg text-xs text-slate-300">
        <p className="font-semibold text-slate-200 mb-0.5">Instance-Wide Flight Search Defaults</p>
        Configure global search preferences, default fare tiers, stops, airline filters, and itinerary ingestion limits. New flight tracking monitors will automatically inherit these settings as initial defaults.
      </div>

      {/* Cabin Class & Fare Restrictions Card */}
      <div className="bg-gunmetal-canvas/60 border border-gunmetal-border p-4 rounded-lg space-y-4">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
          <Sliders className="w-3.5 h-3.5 text-slate-400" />
          <span>Cabin & Fare Restrictions (Defaults)</span>
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Default Cabin Class
            </label>
            <div className="relative">
              <select
                value={cabinClass}
                onChange={e => handleCabinClassChange(e.target.value as CabinClass)}
                className="w-full min-h-[44px] appearance-none border border-gunmetal-border p-2.5 pr-10 rounded-md bg-gunmetal-canvas text-slate-200 focus:outline-none focus:border-slate-500 text-sm cursor-pointer"
              >
                <option value="economy">Economy</option>
                <option value="premium_economy">Premium Economy</option>
                <option value="business">Business</option>
                <option value="first">First Class</option>
              </select>
              <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gunmetal-muted pointer-events-none" />
            </div>
            <p className="text-[11px] text-gunmetal-muted mt-1">
              Initial cabin class selected when creating new flight tracking monitors.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Default Fare Tier
            </label>
            <div className="relative">
              <select
                value={fareTier}
                onChange={e => handleFareTierChange(e.target.value as FareTier)}
                className="w-full min-h-[44px] appearance-none border border-gunmetal-border p-2.5 pr-10 rounded-md bg-gunmetal-canvas text-slate-200 focus:outline-none focus:border-slate-500 text-sm cursor-pointer"
              >
                <option value="Standard">Standard (No Basic Economy)</option>
                <option value="Basic Economy">Basic Economy / Unbundled</option>
              </select>
              <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gunmetal-muted pointer-events-none" />
            </div>
            <p className="text-[11px] text-gunmetal-muted mt-1">
              Select Standard to filter out restrictive unbundled basic fares on search queries.
            </p>
          </div>
        </div>
      </div>

      {/* Flight Stops & Redeye Filter Defaults Card */}
      <div className="bg-gunmetal-canvas/60 border border-gunmetal-border p-4 rounded-lg space-y-4">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
          <Moon className="w-3.5 h-3.5 text-slate-400" />
          <span>Stops & Timing Defaults</span>
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Default Maximum Stops
            </label>
            <div className="relative">
              <select
                value={maxStops !== null && maxStops !== undefined ? String(maxStops) : ''}
                onChange={e => handleMaxStopsChange(e.target.value === '' ? null : parseInt(e.target.value, 10))}
                className="w-full min-h-[44px] appearance-none border border-gunmetal-border p-2.5 pr-10 rounded-md bg-gunmetal-canvas text-slate-200 focus:outline-none focus:border-slate-500 text-sm cursor-pointer"
              >
                <option value="">Any (No Stop Limit)</option>
                <option value="0">Nonstop Only (0 Stops)</option>
                <option value="1">1 Stop or Fewer (≤ 1 Stop)</option>
                <option value="2">2 Stops or Fewer (≤ 2 Stops)</option>
              </select>
              <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gunmetal-muted pointer-events-none" />
            </div>
            <p className="text-[11px] text-gunmetal-muted mt-1">
              Default stops limit applied to route searches across all search providers.
            </p>
          </div>

          <div className="flex flex-col justify-between">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Default Redeye Filter
            </label>
            <label className="min-h-[44px] p-3 rounded-md bg-gunmetal-canvas border border-gunmetal-border flex items-center justify-between gap-3 cursor-pointer select-none">
              <div>
                <span className="text-xs font-semibold text-slate-200 block">
                  Exclude Redeye Flights
                </span>
                <span className="text-[11px] text-gunmetal-muted block mt-0.5">
                  Filters out departures between 9:00 PM and 5:00 AM by default.
                </span>
              </div>
              <input
                type="checkbox"
                checked={noRedeye}
                onChange={e => handleNoRedeyeToggle(e.target.checked)}
                className="w-5 h-5 sm:w-4 sm:h-4 accent-slate-500 rounded cursor-pointer flex-shrink-0"
              />
            </label>
          </div>
        </div>
      </div>

      {/* Layover & Trip Duration Defaults Card */}
      <div className="bg-gunmetal-canvas/60 border border-gunmetal-border p-4 rounded-lg space-y-4">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
          <Timer className="w-3.5 h-3.5 text-slate-400" />
          <span>Layover & Trip Duration Defaults</span>
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Default Max Layover Duration
            </label>
            <div className="relative">
              <select
                value={settings.defaultMaxLayoverMinutes !== null && settings.defaultMaxLayoverMinutes !== undefined ? String(settings.defaultMaxLayoverMinutes) : ''}
                onChange={e => handleMaxLayoverChange(e.target.value === '' ? null : parseInt(e.target.value, 10))}
                className="w-full min-h-[44px] appearance-none border border-gunmetal-border p-2.5 pr-10 rounded-md bg-gunmetal-canvas text-slate-200 focus:outline-none focus:border-slate-500 text-sm cursor-pointer"
              >
                <option value="">Any (No Layover Limit)</option>
                <option value="90">1.5 Hours (90 mins)</option>
                <option value="120">2 Hours (120 mins)</option>
                <option value="180">3 Hours (180 mins)</option>
                <option value="240">4 Hours (240 mins)</option>
                <option value="300">5 Hours (300 mins)</option>
                <option value="360">6 Hours (360 mins)</option>
                <option value="480">8 Hours (480 mins)</option>
              </select>
              <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gunmetal-muted pointer-events-none" />
            </div>
            <p className="text-[11px] text-gunmetal-muted mt-1">
              Discards flight itineraries with connection layovers longer than this threshold.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Default Max Total Trip Duration
            </label>
            <div className="relative">
              <select
                value={settings.defaultMaxTotalDurationMinutes !== null && settings.defaultMaxTotalDurationMinutes !== undefined ? String(settings.defaultMaxTotalDurationMinutes) : ''}
                onChange={e => handleMaxTotalDurationChange(e.target.value === '' ? null : parseInt(e.target.value, 10))}
                className="w-full min-h-[44px] appearance-none border border-gunmetal-border p-2.5 pr-10 rounded-md bg-gunmetal-canvas text-slate-200 focus:outline-none focus:border-slate-500 text-sm cursor-pointer"
              >
                <option value="">Any (No Trip Duration Limit)</option>
                <option value="240">4 Hours (240 mins)</option>
                <option value="360">6 Hours (360 mins)</option>
                <option value="480">8 Hours (480 mins)</option>
                <option value="600">10 Hours (600 mins)</option>
                <option value="720">12 Hours (720 mins)</option>
                <option value="960">16 Hours (960 mins)</option>
                <option value="1200">20 Hours (1200 mins)</option>
                <option value="1440">24 Hours (1440 mins)</option>
              </select>
              <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gunmetal-muted pointer-events-none" />
            </div>
            <p className="text-[11px] text-gunmetal-muted mt-1">
              Filters out itineraries exceeding total travel time (flights + layovers).
            </p>
          </div>
        </div>

        <div className="pt-2 border-t border-gunmetal-border/70">
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
            Default Excluded Connecting Airports
          </label>
          <input
            type="text"
            placeholder="e.g. ORD, DEN, MIA (comma-separated IATA codes)"
            value={settings.defaultExcludedConnectingAirports || ''}
            onChange={e => onChange({ ...settings, defaultExcludedConnectingAirports: e.target.value.toUpperCase() })}
            onBlur={e => handleExcludedConnectingAirportsChange(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') e.currentTarget.blur();
            }}
            className="w-full min-h-[44px] border border-gunmetal-border p-2.5 rounded-md bg-gunmetal-canvas text-slate-200 placeholder-zinc-500 focus:outline-none focus:border-slate-500 text-sm font-mono uppercase"
          />
          <p className="text-[11px] text-gunmetal-muted mt-1">
            Itineraries connecting through any of these intermediate airport hubs will be excluded by default.
          </p>
        </div>
      </div>

      {/* Global Airline Filters Card */}
      <div className="bg-gunmetal-canvas/60 border border-gunmetal-border p-4 rounded-lg space-y-4">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
          <ShieldAlert className="w-3.5 h-3.5 text-slate-400" />
          <span>Global Airline Inclusions & Exclusions</span>
        </h4>
        <p className="text-[11px] text-gunmetal-muted">
          Establish default carrier inclusions or exclusions. New flight tracking monitors will inherit these filters automatically.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Default Included Airlines
            </label>
            <AirlineTagInput
              value={settings.defaultIncludedAirlines || ''}
              onChange={handleIncludedAirlinesChange}
              placeholder="e.g. DL, AA (type & press space or comma)"
            />
            <p className="text-[11px] text-gunmetal-muted mt-1">
              Restrict route searches to specific airlines by default.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Default Excluded Airlines
            </label>
            <AirlineTagInput
              value={settings.defaultExcludedAirlines || ''}
              onChange={handleExcludedAirlinesChange}
              placeholder="e.g. NK, F9 (type & press space or comma)"
            />
            <p className="text-[11px] text-gunmetal-muted mt-1">
              Exclude specific airlines (e.g. ultra-low-cost carriers) by default.
            </p>
          </div>
        </div>
      </div>

      {/* Ingestion & Carrier Diversity Engine Card */}
      <div className="bg-gunmetal-canvas/60 border border-gunmetal-border p-4 rounded-lg space-y-4">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-slate-400" />
          <span>Multi-Fare Ingestion & Carrier Diversity Engine</span>
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                Max Stored Itineraries Per Check
              </label>
              <span className="font-mono text-xs font-bold text-sky-400 px-2 py-0.5 rounded bg-sky-950/40 border border-sky-800/40">
                {maxStored} itineraries
              </span>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="0"
                max={ITINERARY_PRESETS.length - 1}
                step="1"
                value={currentPresetIndex}
                onChange={e => {
                  const chosen = ITINERARY_PRESETS[Number(e.target.value)] ?? 12;
                  onChange({ ...settings, maxStoredItineraries: chosen });
                }}
                onMouseUp={e => {
                  const chosen = ITINERARY_PRESETS[Number((e.target as HTMLInputElement).value)] ?? 12;
                  handleMaxStoredChange(chosen);
                }}
                onTouchEnd={e => {
                  const chosen = ITINERARY_PRESETS[Number((e.target as HTMLInputElement).value)] ?? 12;
                  handleMaxStoredChange(chosen);
                }}
                className="w-full h-7 accent-sky-500 cursor-pointer"
              />
            </div>
            <div className="flex justify-between text-[10px] text-gunmetal-muted font-mono mt-1">
              <span>6 (Compact)</span>
              <span>12 (Default)</span>
              <span>24 (Maximum)</span>
            </div>
            <p className="text-[11px] text-gunmetal-muted mt-1">
              Number of competitor itineraries saved per price check in history metadata (configurable 6–24).
            </p>
          </div>

          <div className="flex flex-col justify-between">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Carrier Diversity Algorithm
            </label>
            <label className="min-h-[44px] p-3 rounded-md bg-gunmetal-canvas border border-gunmetal-border flex items-center justify-between gap-3 cursor-pointer select-none">
              <div>
                <span className="text-xs font-semibold text-slate-200 block">
                  Guarantee Operating Airline Representation
                </span>
                <span className="text-[11px] text-gunmetal-muted block mt-0.5">
                  Guarantees at least 1 lowest fare from every operating airline before filling remaining capacity with the cheapest flights.
                </span>
              </div>
              <input
                type="checkbox"
                checked={carrierDiversity === 1}
                onChange={e => handleCarrierDiversityToggle(e.target.checked)}
                className="w-5 h-5 sm:w-4 sm:h-4 accent-slate-500 rounded cursor-pointer flex-shrink-0"
              />
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}