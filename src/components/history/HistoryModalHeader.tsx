'use client';

import { Flight } from '@/types';
import { X, Calendar } from 'lucide-react';

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
      <button
        onClick={onClose}
        className="p-2 text-gunmetal-muted hover:text-slate-100 hover:bg-gunmetal-canvas rounded-full transition-colors"
      >
        <X className="w-5 h-5" />
      </button>
    </div>
  );
}