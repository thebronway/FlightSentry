'use client';

import { Settings, CabinClass, FareTier } from '@/types';
import SettingsIntroBanner from './shared/SettingsIntroBanner';
import CabinFareDefaultsCard from './searchPreferences/CabinFareDefaultsCard';
import StopsRedeyeDefaultsCard from './searchPreferences/StopsRedeyeDefaultsCard';
import LayoverDurationDefaultsCard from './searchPreferences/LayoverDurationDefaultsCard';
import AirlineFiltersDefaultsCard from './searchPreferences/AirlineFiltersDefaultsCard';
import IngestionDiversityCard from './searchPreferences/IngestionDiversityCard';

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

export default function SearchPreferencesTab({
  settings,
  onChange,
  onAutoSave,
}: Props) {
  const savePref = async (updated: Settings, message: string) => {
    onChange(updated);
    if (onAutoSave) {
      await onAutoSave(updated, 'searchprefs', undefined, message);
    }
  };

  return (
    <div className="space-y-6 pt-2">
      <SettingsIntroBanner
        title="Instance-Wide Flight Search Defaults"
        description="Configure global search preferences, default fare tiers, stops, airline filters, and itinerary ingestion limits. New flight tracking monitors will automatically inherit these settings as initial defaults."
      />

      <CabinFareDefaultsCard
        cabinClass={settings.defaultCabinClass || 'economy'}
        fareTier={settings.defaultFareTier || 'Standard'}
        onCabinClassChange={(val: CabinClass) =>
          savePref({ ...settings, defaultCabinClass: val }, 'Default cabin class updated')
        }
        onFareTierChange={(val: FareTier) =>
          savePref({ ...settings, defaultFareTier: val }, 'Default fare tier updated')
        }
      />

      <StopsRedeyeDefaultsCard
        maxStops={settings.defaultMaxStops}
        noRedeye={settings.defaultNoRedeye === 1}
        onMaxStopsChange={val =>
          savePref({ ...settings, defaultMaxStops: val }, 'Default maximum stops updated')
        }
        onNoRedeyeToggle={checked =>
          savePref(
            { ...settings, defaultNoRedeye: checked ? 1 : 0 },
            `Redeye filter default set to ${checked ? 'exclude' : 'include'}`
          )
        }
      />

      <LayoverDurationDefaultsCard
        maxLayoverMinutes={settings.defaultMaxLayoverMinutes}
        maxTotalDurationMinutes={settings.defaultMaxTotalDurationMinutes}
        excludedConnectingAirports={settings.defaultExcludedConnectingAirports || ''}
        onMaxLayoverChange={val =>
          savePref({ ...settings, defaultMaxLayoverMinutes: val }, 'Default maximum layover duration updated')
        }
        onMaxTotalDurationChange={val =>
          savePref({ ...settings, defaultMaxTotalDurationMinutes: val }, 'Default maximum trip duration updated')
        }
        onExcludedAirportsDraftChange={val =>
          onChange({ ...settings, defaultExcludedConnectingAirports: val })
        }
        onExcludedAirportsCommit={val =>
          savePref(
            { ...settings, defaultExcludedConnectingAirports: val || null },
            'Default excluded connecting airports updated'
          )
        }
      />

      <AirlineFiltersDefaultsCard
        includedAirlines={settings.defaultIncludedAirlines || ''}
        excludedAirlines={settings.defaultExcludedAirlines || ''}
        onIncludedChange={val =>
          savePref({ ...settings, defaultIncludedAirlines: val || null }, 'Default airline inclusions updated')
        }
        onExcludedChange={val =>
          savePref({ ...settings, defaultExcludedAirlines: val || null }, 'Default airline exclusions updated')
        }
      />

      <IngestionDiversityCard
        maxStoredItineraries={settings.maxStoredItineraries ?? 12}
        carrierDiversityEnabled={(settings.carrierDiversityEnabled ?? 1) === 1}
        onMaxStoredDraftChange={val => onChange({ ...settings, maxStoredItineraries: val })}
        onMaxStoredCommit={val => {
          const clamped = Math.min(24, Math.max(6, Math.round(val)));
          return savePref(
            { ...settings, maxStoredItineraries: clamped },
            `Max stored itineraries set to ${clamped}`
          );
        }}
        onCarrierDiversityToggle={checked =>
          savePref(
            { ...settings, carrierDiversityEnabled: checked ? 1 : 0 },
            `Carrier diversity engine ${checked ? 'enabled' : 'disabled'}`
          )
        }
      />
    </div>
  );
}