'use client';

import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { getCoLocationInfo } from '@/utils/coLocations';
import { resolveLoyaltyProgram, expandAlliancesToAirlines, resolveAllianceKey } from '@/utils/airlineThemes';
import { normalizeAirlineCode, isValidAirlineCode } from '@/utils/airline';
import AirlineTagInput from '../common/AirlineTagInput';
import RouteCorridorCoLocationSection from './RouteCorridorCoLocationSection';
import { TrackingOption } from './useFlightModalState';

interface Props {
  trackingType: TrackingOption;
  showRouteDetails: boolean;
  origin: string;
  destination: string;
  departureDate: string;
  minDepartureDate: string;
  includedAirlines: string;
  excludedAirlines: string;
  isPoints?: boolean;
  currency?: string;
  onOriginChange: (val: string) => void;
  onDestinationChange: (val: string) => void;
  onDepartureDateChange: (val: string) => void;
  onIncludedAirlinesChange: (val: string) => void;
  onExcludedAirlinesChange: (val: string) => void;
}

export default function RouteSection({
  trackingType,
  showRouteDetails,
  origin,
  destination,
  departureDate,
  minDepartureDate,
  includedAirlines,
  excludedAirlines,
  isPoints = false,
  currency,
  onOriginChange,
  onDestinationChange,
  onDepartureDateChange,
  onIncludedAirlinesChange,
  onExcludedAirlinesChange,
}: Props) {
  const isRouteWatch = trackingType === 'route_watch';

  if (!isRouteWatch && !showRouteDetails) {
    return null;
  }

  const [draftIncluded, setDraftIncluded] = useState('');
  const originInfo = isRouteWatch ? getCoLocationInfo(origin) : null;
  const destInfo = isRouteWatch ? getCoLocationInfo(destination) : null;

  const loyaltyProgram = isRouteWatch && isPoints ? resolveLoyaltyProgram(currency) : null;
  const routeLoyaltyWarning = (() => {
    if (!loyaltyProgram) return null;
    const draftToken = draftIncluded.trim();
    const resolvedDraft = draftToken
      ? resolveAllianceKey(draftToken) || (() => {
          const norm = normalizeAirlineCode(draftToken);
          return norm !== 'UN' && isValidAirlineCode(norm) ? norm : (isValidAirlineCode(draftToken.toUpperCase()) ? draftToken.toUpperCase() : '');
        })()
      : '';
    const combinedInclusions = [includedAirlines, resolvedDraft].filter(Boolean).join(', ');
    const expandedSelected = expandAlliancesToAirlines(combinedInclusions);
    const recommendedTag = loyaltyProgram.alliance || loyaltyProgram.hostCarriers[0];
    const networkLabel = loyaltyProgram.allianceName
      ? `${loyaltyProgram.allianceName} alliance or partner airline`
      : `${loyaltyProgram.hostCarriers.join('/')} or partner airline`;

    if (expandedSelected.length === 0) {
      return {
        message: `${currency} (${loyaltyProgram.programLabel}) typically applies to ${networkLabel} flights. Consider adding ${recommendedTag} under Airline Inclusions (optional).`,
        recommendedTag,
      };
    }

    const hasIncompatible = expandedSelected.some(code => !loyaltyProgram.allowedCarriers.includes(code));
    if (hasIncompatible) {
      return {
        message: `One or more selected airlines may not be bookable with ${currency} (${loyaltyProgram.programLabel}), which generally requires a ${networkLabel}.`,
        recommendedTag,
      };
    }

    return null;
  })();

  const handleAirportInput = (raw: string, setter: (val: string) => void) => {
    if (isRouteWatch) {
      setter(raw.toUpperCase());
    } else {
      setter(raw.replace(/[^a-zA-Z]/g, '').slice(0, 3).toUpperCase());
    }
  };

  return (
    <div className="bg-gunmetal-canvas/60 border border-gunmetal-border rounded-xl p-4 sm:p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
          Route & Airports
        </label>
        <span className="text-[11px] text-gunmetal-muted">
          {isRouteWatch
            ? 'Origin and destination airport or co-location codes'
            : 'Single 3-letter IATA airport codes (use Route Alternatives below for co-location clusters)'}
        </span>
      </div>

      <div className={`grid ${isRouteWatch ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2'} gap-3`}>
        {/* Departure Date for Route Watch */}
        {isRouteWatch && (
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Departure Date *
            </label>
            <input
              required
              type="date"
              min={minDepartureDate}
              value={departureDate}
              onChange={e => onDepartureDateChange(e.target.value)}
              className="w-full h-10 px-3 py-2 text-sm rounded-md bg-gunmetal-canvas text-slate-200 border border-gunmetal-border focus:border-slate-500 focus:outline-none [color-scheme:dark]"
            />
          </div>
        )}

        {/* Origin */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
            Origin Airport (IATA) *
          </label>
          <input
            required
            maxLength={isRouteWatch ? 30 : 3}
            pattern={isRouteWatch ? undefined : "[A-Za-z]{3}"}
            placeholder={isRouteWatch ? "e.g. DCA, WAS, or DFW, DAL" : "e.g. DCA"}
            value={origin}
            onChange={e => handleAirportInput(e.target.value, onOriginChange)}
            className="w-full h-10 px-3 py-2 text-sm uppercase rounded-md bg-gunmetal-canvas text-slate-200 border border-gunmetal-border focus:border-slate-500 focus:outline-none placeholder-zinc-500 font-mono"
          />
          {originInfo && (
            <div className="flex flex-wrap items-center justify-between gap-1.5 mt-1 text-[11px]">
              <span className="text-gunmetal-muted font-sans">{originInfo.description}</span>
              {originInfo.suggestedCode && originInfo.suggestedActionLabel && (
                <button
                  type="button"
                  onClick={() => onOriginChange(originInfo.suggestedCode!)}
                  className="text-sky-400 hover:text-sky-300 font-semibold underline transition-colors"
                >
                  {originInfo.suggestedActionLabel} &rarr;
                </button>
              )}
            </div>
          )}
        </div>

        {/* Destination */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
            Destination Airport (IATA) *
          </label>
          <input
            required
            maxLength={isRouteWatch ? 30 : 3}
            pattern={isRouteWatch ? undefined : "[A-Za-z]{3}"}
            placeholder={isRouteWatch ? "e.g. LAX, NYC, or MIA, FLL" : "e.g. LAX"}
            value={destination}
            onChange={e => handleAirportInput(e.target.value, onDestinationChange)}
            className="w-full h-10 px-3 py-2 text-sm uppercase rounded-md bg-gunmetal-canvas text-slate-200 border border-gunmetal-border focus:border-slate-500 focus:outline-none placeholder-zinc-500 font-mono"
          />
          {destInfo && (
            <div className="flex flex-wrap items-center justify-between gap-1.5 mt-1 text-[11px]">
              <span className="text-gunmetal-muted font-sans">{destInfo.description}</span>
              {destInfo.suggestedCode && destInfo.suggestedActionLabel && (
                <button
                  type="button"
                  onClick={() => onDestinationChange(destInfo.suggestedCode!)}
                  className="text-sky-400 hover:text-sky-300 font-semibold underline transition-colors"
                >
                  {destInfo.suggestedActionLabel} &rarr;
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Non-blocking Miles / Alliance Warning for Route Watch */}
      {routeLoyaltyWarning && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 rounded-lg bg-amber-950/35 border border-amber-700/60 text-xs text-amber-200">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <span className="font-semibold text-amber-100">Carrier &amp; Miles Notice: </span>
              {routeLoyaltyWarning.message}
            </div>
          </div>
          {routeLoyaltyWarning.recommendedTag && !includedAirlines.split(',').map(s => s.trim().toUpperCase()).includes(routeLoyaltyWarning.recommendedTag) && (
            <button
              type="button"
              onClick={() => {
                const existing = includedAirlines.split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
                onIncludedAirlinesChange([...existing, routeLoyaltyWarning.recommendedTag!].join(', '));
              }}
              className="self-end sm:self-center flex-shrink-0 px-2.5 py-1.5 text-xs font-semibold bg-amber-900/50 hover:bg-amber-800/60 text-amber-100 border border-amber-700/60 rounded-md transition-colors cursor-pointer whitespace-nowrap"
            >
              + Add {routeLoyaltyWarning.recommendedTag}
            </button>
          )}
        </div>
      )}

      {/* Airline Inclusions & Exclusions for Route Watching */}
      {isRouteWatch && (
        <div className="pt-2 border-t border-gunmetal-border/70 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Airline Inclusions (Optional)
            </label>
            <AirlineTagInput
              value={includedAirlines}
              onChange={onIncludedAirlinesChange}
              onDraftChange={setDraftIncluded}
              placeholder="e.g. DL, AA (type & press space or comma)"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Airline Exclusions (Optional)
            </label>
            <AirlineTagInput
              value={excludedAirlines}
              onChange={onExcludedAirlinesChange}
              placeholder="e.g. NK, F9 (type & press space or comma)"
            />
          </div>
        </div>
      )}

      </div>
  );
}