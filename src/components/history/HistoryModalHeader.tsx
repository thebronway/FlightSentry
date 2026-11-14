'use client';

import { useMemo } from 'react';
import { Flight, Settings } from '@/types';
import { X, Plus, RotateCcw, Coins } from 'lucide-react';
import AirlineBadge from '../common/AirlineBadge';
import GoogleIcon from '../GoogleIcon';
import FlightRouteDisplay from '../flightCardShared/FlightRouteDisplay';
import FlightStatusBadges from '../flightCardShared/FlightStatusBadges';
import FlightCabinBadges from '../flightCardShared/FlightCabinBadges';
import FlightTargetAlertChip from '../flightCardShared/FlightTargetAlertChip';
import { getGoogleFlightsUrl, getOperatingAirlines } from '@/utils/airline';
import { isPointsCurrency } from '@/utils/format';

interface Props {
  flight: Flight;
  settings?: Settings | null;
  isFlightNumMode: boolean;
  onClose: () => void;
  onOpenManualEntry?: () => void;
  onOpenRebook?: () => void;
}

export default function HistoryModalHeader({
  flight,
  settings,
  isFlightNumMode,
  onClose,
  onOpenManualEntry,
  onOpenRebook,
}: Props) {
  const isPurchased = flight.purchasePrice !== null && flight.purchasePrice !== undefined && flight.purchasePrice > 0;
  const operatingAirlines = useMemo(() => getOperatingAirlines(flight), [flight]);
  const googleFlightsUrl = getGoogleFlightsUrl(flight, settings?.currency);

  return (
    <div className="px-4 py-3.5 sm:px-6 sm:py-4 border-b border-gunmetal-border flex flex-col lg:flex-row lg:items-start justify-between gap-3.5 sm:gap-4 bg-gunmetal-card z-10 flex-shrink-0">
      <div className="min-w-0 flex-1 space-y-2.5">
        {/* Status Badges Row Above Flight / Route */}
        <div className="flex items-center justify-between gap-3">
          <FlightStatusBadges flight={flight} size="sm" align="start" layout="row" />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close history modal"
            className="lg:hidden min-h-[44px] min-w-[44px] inline-flex items-center justify-center -mr-2 -mt-1 text-gunmetal-muted hover:text-slate-100 hover:bg-gunmetal-canvas rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Flight / Route Display */}
        <div className="min-w-0">
          <FlightRouteDisplay flight={flight} variant="card" />
        </div>

        {/* Operating Airlines Bubble Row (Route Mode) */}
        {!isPurchased && !isFlightNumMode && operatingAirlines.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            {operatingAirlines.map((code, idx) => (
              <AirlineBadge
                key={code}
                code={code}
                size="xs"
                showFlightNumber={false}
                align={idx === 0 ? 'left' : 'center'}
              />
            ))}
          </div>
        )}

        {/* Cabin, Fare Restrictions, Points Currency & Notification Target Badges */}
        <div className="flex flex-wrap items-center gap-1.5">
          <FlightCabinBadges flight={flight} size="sm" showRebookSavings showPnr />
          {flight.currency && isPointsCurrency(flight.currency) && (
            <span className="bg-amber-950/60 text-amber-300 border border-amber-800/60 px-2 py-0.5 rounded text-xs font-semibold inline-flex items-center gap-1 flex-shrink-0">
              <Coins className="w-3 h-3 text-amber-400" /> {flight.currency}
            </span>
          )}
          <FlightTargetAlertChip flight={flight} settings={settings} size="sm" />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-1 sm:flex sm:flex-wrap items-stretch sm:items-center gap-2 flex-shrink-0 w-full lg:w-auto">
        {onOpenRebook && (flight.status === 'Booked' || isPurchased) && (
          <button
            type="button"
            onClick={onOpenRebook}
            className="min-h-[44px] sm:min-h-[36px] flex items-center justify-center sm:justify-start gap-1.5 px-3.5 py-2 sm:py-1.5 text-xs font-semibold bg-gunmetal-canvas hover:bg-gunmetal-border border border-gunmetal-border text-slate-200 hover:text-white rounded-lg sm:rounded-md shadow-sm transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
            <span>Log Flight Rebook</span>
          </button>
        )}
        {onOpenManualEntry && (
          <button
            type="button"
            onClick={onOpenManualEntry}
            className="min-h-[44px] sm:min-h-[36px] flex items-center justify-center sm:justify-start gap-1.5 px-3.5 py-2 sm:py-1.5 text-xs font-semibold bg-gunmetal-canvas hover:bg-gunmetal-border border border-gunmetal-border text-slate-200 hover:text-white rounded-lg sm:rounded-md shadow-sm transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
            <span>Log Manual Price Entry</span>
          </button>
        )}
        <a
          href={googleFlightsUrl}
          target="_blank"
          rel="noopener noreferrer"
          title="Search this itinerary on Google Flights"
          className="min-h-[44px] sm:min-h-[36px] flex items-center justify-center sm:justify-start gap-1.5 px-3.5 py-2 sm:py-1.5 text-xs font-semibold bg-gunmetal-canvas hover:bg-blue-950/30 border border-gunmetal-border text-slate-200 hover:text-[#4285F4] rounded-lg sm:rounded-md shadow-sm transition-colors"
        >
          <GoogleIcon className="w-3.5 h-3.5 flex-shrink-0" />
          <span>Google Flights</span>
        </a>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close history modal"
          className="hidden lg:inline-flex min-h-[44px] min-w-[44px] items-center justify-center text-gunmetal-muted hover:text-slate-100 hover:bg-gunmetal-canvas rounded-full transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}