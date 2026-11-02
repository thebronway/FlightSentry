'use client';

import { Flight } from '@/types';
import { X, Calendar, ExternalLink } from 'lucide-react';

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
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-black text-slate-100 font-sans tracking-tight">
            {primaryTitle}
          </h2>
          {isFlightNumMode && (
            <span className="text-sm font-semibold text-slate-300">
              {flight.origin} → {flight.destination}
            </span>
          )}
        </div>
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