'use client';

import { Flight } from '@/types';
import { X, Calendar, ExternalLink, Tag, ShoppingBag, Pause, Clock } from 'lucide-react';
import AirlineBadge from '../common/AirlineBadge';
import { getActiveCoLocationBadge } from '@/utils/coLocations';

interface Props {
  flight: Flight;
  isFlightNumMode: boolean;
  primaryTitle: string;
  onClose: () => void;
}

export default function HistoryModalHeader({
  flight,
  isFlightNumMode,
  primaryTitle,
  onClose,
}: Props) {
  const cabinClassQuery = flight.cabinClass === 'premium_economy'
    ? '%20premium%20economy'
    : flight.cabinClass === 'business'
    ? '%20business'
    : flight.cabinClass === 'first'
    ? '%20first%20class'
    : '';

  const flightNumQuery = isFlightNumMode && flight.flightNumber
    ? `%20${encodeURIComponent(flight.airline)}%20${encodeURIComponent(flight.flightNumber)}`
    : '';

  const googleFlightsUrl = `https://www.google.com/travel/flights?q=Flights%20to%20${flight.destination}%20from%20${flight.origin}%20on%20${flight.departureDate}${flightNumQuery}${cabinClassQuery}%20oneway`;

  return (
    <div className="px-6 py-4 border-b border-gunmetal-border flex justify-between items-center bg-gunmetal-card z-10">
      <div>
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-2xl font-black text-slate-100 font-sans tracking-tight">
            {isFlightNumMode ? (
              <span>{flight.airline} {flight.flightNumber}</span>
            ) : (
              <span>{flight.origin} → {flight.destination}</span>
            )}
          </h2>
          {flight.airline && (
            <AirlineBadge
              code={flight.airline}
              flightNumber={isFlightNumMode ? flight.flightNumber : null}
              size="sm"
            />
          )}
          {flight.status === 'Watching' ? (
            <span className="bg-sky-950/60 text-sky-300 border border-sky-800/50 px-2 py-0.5 rounded text-xs font-semibold flex items-center gap-1">
              <Tag className="w-3 h-3 text-sky-400" /> Watching
            </span>
          ) : flight.status === 'Booked' ? (
            <span className="bg-emerald-950/60 text-emerald-300 border border-emerald-800/60 px-2 py-0.5 rounded text-xs font-semibold flex items-center gap-1">
              <ShoppingBag className="w-3 h-3 text-emerald-400" /> Booked
            </span>
          ) : flight.status === 'Paused' ? (
            <span className="bg-amber-950/60 text-amber-300 border border-amber-800/60 px-2 py-0.5 rounded text-xs font-semibold flex items-center gap-1">
              <Pause className="w-3 h-3 text-amber-400" /> Paused
            </span>
          ) : (
            <span className="bg-slate-800/50 text-slate-400 border border-slate-700/50 px-2 py-0.5 rounded text-xs font-semibold flex items-center gap-1">
              <Clock className="w-3 h-3 text-slate-400" /> Past
            </span>
          )}
          {isFlightNumMode && flight.origin && flight.destination && (
            <span className="text-base font-bold text-sky-400 font-mono px-2.5 py-0.5 rounded bg-sky-950/40 border border-sky-800/40">
              {flight.origin} → {flight.destination}
            </span>
          )}
        </div>
        {(() => {
          const originBadge = getActiveCoLocationBadge(flight.origin);
          const destBadge = getActiveCoLocationBadge(flight.destination);
          if (!originBadge && !destBadge) return null;
          return (
            <div className="flex flex-wrap items-center gap-2 mt-1.5 text-[11px]">
              {originBadge && (
                <span className="px-2 py-0.5 rounded bg-sky-950/50 text-sky-300 border border-sky-800/50 font-sans">
                  Origin: {originBadge}
                </span>
              )}
              {destBadge && (
                <span className="px-2 py-0.5 rounded bg-sky-950/50 text-sky-300 border border-sky-800/50 font-sans">
                  Dest: {destBadge}
                </span>
              )}
            </div>
          );
        })()}
        <div className="flex items-center gap-3 text-xs text-gunmetal-muted mt-1 font-medium">
          <span className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            Departure: {flight.departureDate}
          </span>
          <span>•</span>
          <span className="capitalize">{flight.cabinClass.replace('_', ' ')}</span>
          <span>•</span>
          <span>{flight.fareTier}</span>
          {flight.pnr && (
            <>
              <span>•</span>
              <span className="text-slate-300">PNR: {flight.pnr}</span>
            </>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <a
          href={googleFlightsUrl}
          target="_blank"
          rel="noopener noreferrer"
          title="Search this itinerary on Google Flights"
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-gunmetal-canvas hover:bg-gunmetal-border border border-gunmetal-border text-slate-200 hover:text-white rounded-md shadow-sm transition-colors"
        >
          <span>Google Flights</span>
          <ExternalLink className="w-3.5 h-3.5 text-sky-400" />
        </a>
        <button
          onClick={onClose}
          className="p-2 text-gunmetal-muted hover:text-slate-100 hover:bg-gunmetal-canvas rounded-full transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}