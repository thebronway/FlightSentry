'use client';

import { Sliders, Moon, Timer, ShieldAlert, Layers } from 'lucide-react';
import { CabinClass, FareTier } from '@/types';
import SettingsCard from '@/components/settings/shared/SettingsCard';
import SettingsSelect from '@/components/settings/shared/SettingsSelect';
import AirlineTagInput from '@/components/common/AirlineTagInput';
import { OnboardingStepProps } from '../types';

const ITINERARY_PRESETS = [6, 8, 10, 12, 16, 20, 24];

export default function SearchPreferencesStep({
  settings,
  onChange,
  onSkipToSettingsLater,
}: OnboardingStepProps) {
  const maxStored = settings.maxStoredItineraries ?? 12;
  const currentPresetIndex = (() => {
    const exact = ITINERARY_PRESETS.indexOf(maxStored);
    if (exact !== -1) return exact;
    return ITINERARY_PRESETS.reduce((closestIdx, val, idx) => {
      return Math.abs(val - maxStored) < Math.abs(ITINERARY_PRESETS[closestIdx] - maxStored)
        ? idx
        : closestIdx;
    }, 3);
  })();

  return (
    <div className="space-y-4">
      {/* 1. Cabin Class & Fare Restrictions */}
      <SettingsCard className="space-y-3">
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
            <Sliders className="w-4 h-4 text-sky-400" />
            <span>1. Default Cabin Class &amp; Fare Restrictions</span>
          </h4>
          <p className="text-xs text-gunmetal-muted leading-relaxed mt-1">
            Pre-fills new flight monitors with your preferred cabin and fare rules. Choosing <strong>Standard</strong> automatically excludes restrictive Basic Economy fares that lack seat selection or carry-on bags.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-300 mb-1">
              Default Cabin Class
            </label>
            <SettingsSelect
              compactDesktop
              value={settings.defaultCabinClass || 'economy'}
              onChange={(e) =>
                onChange({ ...settings, defaultCabinClass: e.target.value as CabinClass })
              }
            >
              <option value="economy">Economy</option>
              <option value="premium_economy">Premium Economy</option>
              <option value="business">Business</option>
              <option value="first">First Class</option>
            </SettingsSelect>
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-300 mb-1">
              Default Fare Tier
            </label>
            <SettingsSelect
              compactDesktop
              value={settings.defaultFareTier || 'Standard'}
              onChange={(e) =>
                onChange({ ...settings, defaultFareTier: e.target.value as FareTier })
              }
            >
              <option value="Standard">Standard (No Basic Economy)</option>
              <option value="Basic Economy">Basic Economy / Unbundled</option>
            </SettingsSelect>
          </div>
        </div>
      </SettingsCard>

      {/* 2. Stops & Redeye Defaults */}
      <SettingsCard className="space-y-3">
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
            <Moon className="w-4 h-4 text-purple-400" />
            <span>2. Stops &amp; Redeye Timing Defaults</span>
          </h4>
          <p className="text-xs text-gunmetal-muted leading-relaxed mt-1">
            Controls how many connections are permitted on route searches and whether overnight redeye departures (9:00 PM – 5:00 AM) are filtered out automatically.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-300 mb-1">
              Default Maximum Stops
            </label>
            <SettingsSelect
              compactDesktop
              value={
                settings.defaultMaxStops !== null && settings.defaultMaxStops !== undefined
                  ? String(settings.defaultMaxStops)
                  : ''
              }
              onChange={(e) =>
                onChange({
                  ...settings,
                  defaultMaxStops: e.target.value === '' ? null : parseInt(e.target.value, 10),
                })
              }
            >
              <option value="">Any (No Stop Limit)</option>
              <option value="0">Nonstop Only (0 Stops)</option>
              <option value="1">1 Stop or Fewer (≤ 1 Stop)</option>
              <option value="2">2 Stops or Fewer (≤ 2 Stops)</option>
            </SettingsSelect>
          </div>

          <div className="flex flex-col justify-end">
            <label className="min-h-[42px] px-3 py-2 rounded-md bg-gunmetal-canvas border border-gunmetal-border flex items-center justify-between gap-3 cursor-pointer select-none">
              <div>
                <span className="text-xs font-semibold text-slate-200 block">
                  Exclude Redeye Flights
                </span>
                <span className="text-[11px] text-gunmetal-muted block">
                  Skip 9:00 PM – 5:00 AM departures
                </span>
              </div>
              <input
                type="checkbox"
                checked={settings.defaultNoRedeye === 1}
                onChange={(e) =>
                  onChange({ ...settings, defaultNoRedeye: e.target.checked ? 1 : 0 })
                }
                className="w-4 h-4 accent-slate-500 rounded cursor-pointer flex-shrink-0"
              />
            </label>
          </div>
        </div>
      </SettingsCard>

      {/* 3. Layover, Total Duration & Connecting Hubs */}
      <SettingsCard className="space-y-3">
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
            <Timer className="w-4 h-4 text-amber-400" />
            <span>3. Layover, Trip Duration &amp; Connecting Hub Filters</span>
          </h4>
          <p className="text-xs text-gunmetal-muted leading-relaxed mt-1">
            Discard multi-leg itineraries with marathon layovers, excessive total travel times, or connections through airports you prefer to avoid.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-300 mb-1">
              Default Max Layover Duration
            </label>
            <SettingsSelect
              compactDesktop
              value={
                settings.defaultMaxLayoverMinutes !== null &&
                settings.defaultMaxLayoverMinutes !== undefined
                  ? String(settings.defaultMaxLayoverMinutes)
                  : ''
              }
              onChange={(e) =>
                onChange({
                  ...settings,
                  defaultMaxLayoverMinutes:
                    e.target.value === '' ? null : parseInt(e.target.value, 10),
                })
              }
            >
              <option value="">Any (No Layover Limit)</option>
              <option value="90">1.5 Hours (90 mins)</option>
              <option value="120">2 Hours (120 mins)</option>
              <option value="180">3 Hours (180 mins)</option>
              <option value="240">4 Hours (240 mins)</option>
              <option value="300">5 Hours (300 mins)</option>
              <option value="360">6 Hours (360 mins)</option>
              <option value="480">8 Hours (480 mins)</option>
            </SettingsSelect>
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-300 mb-1">
              Default Max Total Trip Duration
            </label>
            <SettingsSelect
              compactDesktop
              value={
                settings.defaultMaxTotalDurationMinutes !== null &&
                settings.defaultMaxTotalDurationMinutes !== undefined
                  ? String(settings.defaultMaxTotalDurationMinutes)
                  : ''
              }
              onChange={(e) =>
                onChange({
                  ...settings,
                  defaultMaxTotalDurationMinutes:
                    e.target.value === '' ? null : parseInt(e.target.value, 10),
                })
              }
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
            </SettingsSelect>
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-300 mb-1">
            Default Excluded Connecting Airports (Optional)
          </label>
          <input
            type="text"
            placeholder="e.g. ORD, DEN, MIA (comma-separated IATA codes)"
            value={settings.defaultExcludedConnectingAirports || ''}
            onChange={(e) =>
              onChange({
                ...settings,
                defaultExcludedConnectingAirports: e.target.value.toUpperCase() || null,
              })
            }
            className="w-full min-h-[40px] border border-gunmetal-border px-3 py-1.5 rounded-md bg-gunmetal-canvas text-slate-200 placeholder-zinc-500 focus:outline-none focus:border-slate-500 text-xs sm:text-sm font-mono uppercase"
          />
        </div>
      </SettingsCard>

      {/* 4. Global Airline & Alliance Filters */}
      <SettingsCard className="space-y-3">
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
            <ShieldAlert className="w-4 h-4 text-emerald-400" />
            <span>4. Global Airline &amp; Alliance Filters (Optional)</span>
          </h4>
          <p className="text-xs text-gunmetal-muted leading-relaxed mt-1">
            Restrict route searches to preferred carriers/alliances or exclude ultra-low-cost carriers by default. You can always override these per flight.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-300 mb-1">
              Default Included Airlines / Alliances
            </label>
            <AirlineTagInput
              value={settings.defaultIncludedAirlines || ''}
              onChange={(val) =>
                onChange({ ...settings, defaultIncludedAirlines: val || null })
              }
              placeholder="e.g. DL, AA, SKYTEAM"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-300 mb-1">
              Default Excluded Airlines / Alliances
            </label>
            <AirlineTagInput
              value={settings.defaultExcludedAirlines || ''}
              onChange={(val) =>
                onChange({ ...settings, defaultExcludedAirlines: val || null })
              }
              placeholder="e.g. NK, F9"
            />
          </div>
        </div>
      </SettingsCard>

      {/* 5. Multi-Fare Ingestion & Carrier Diversity Engine */}
      <SettingsCard className="space-y-3">
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-sky-400" />
            <span>5. Multi-Fare Ingestion &amp; Carrier Diversity Engine</span>
          </h4>
          <p className="text-xs text-gunmetal-muted leading-relaxed mt-1">
            Controls how many competitor itineraries are saved per check for trend charts and carrier breakdowns, and ensures every operating airline gets represented even if one carrier dominates the cheapest slots.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-300">
                Max Stored Itineraries
              </label>
              <span className="font-mono text-xs font-bold text-sky-400">
                {maxStored} itineraries
              </span>
            </div>
            <input
              type="range"
              min="0"
              max={ITINERARY_PRESETS.length - 1}
              step="1"
              value={currentPresetIndex}
              onChange={(e) => {
                const chosen = ITINERARY_PRESETS[Number(e.target.value)] ?? 12;
                onChange({ ...settings, maxStoredItineraries: chosen });
              }}
              className="w-full h-7 accent-sky-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-gunmetal-muted font-mono">
              <span>6 (Compact)</span>
              <span>12 (Default)</span>
              <span>24 (Max)</span>
            </div>
          </div>

          <div className="flex flex-col justify-end">
            <label className="min-h-[42px] px-3 py-2 rounded-md bg-gunmetal-canvas border border-gunmetal-border flex items-center justify-between gap-3 cursor-pointer select-none">
              <div>
                <span className="text-xs font-semibold text-slate-200 block">
                  Carrier Diversity Engine
                </span>
                <span className="text-[11px] text-gunmetal-muted block">
                  Keep at least 1 lowest fare per operating airline
                </span>
              </div>
              <input
                type="checkbox"
                checked={(settings.carrierDiversityEnabled ?? 1) === 1}
                onChange={(e) =>
                  onChange({
                    ...settings,
                    carrierDiversityEnabled: e.target.checked ? 1 : 0,
                  })
                }
                className="w-4 h-4 accent-slate-500 rounded cursor-pointer flex-shrink-0"
              />
            </label>
          </div>
        </div>
      </SettingsCard>

      </div>
  );
}