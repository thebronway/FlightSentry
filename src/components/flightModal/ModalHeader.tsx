'use client';

import { X } from 'lucide-react';
import { Flight } from '@/types';
import { TrackingOption } from './useFlightModalState';

interface Props {
  initialFlight?: Flight | null;
  trackingType: TrackingOption;
  onCloseRequest: () => void;
}

export default function ModalHeader({ initialFlight, trackingType, onCloseRequest }: Props) {
  const title = initialFlight
    ? initialFlight.status === 'Booked'
      ? 'Edit Booked Flight'
      : initialFlight.searchMode === 'FlightNumber' || initialFlight.flightNumber
      ? 'Edit Watched Flight'
      : 'Edit Watched Route'
    : trackingType === 'flight_booked'
    ? 'Track Booked Flight'
    : trackingType === 'flight_watch'
    ? 'Watch Specific Flight'
    : 'Watch Route';

  return (
    <div className="px-5 py-4 border-b border-gunmetal-border flex justify-between items-center sticky top-0 bg-gunmetal-card z-20">
      <div>
        <h2 className="text-lg sm:text-xl font-bold text-slate-100">
          {title}
        </h2>
        <p className="text-xs text-gunmetal-muted hidden sm:block mt-0.5">
          {initialFlight ? 'Update tracking preferences, cadences, or alert thresholds' : 'Configure flight parameters and alert settings'}
        </p>
      </div>
      <button
        type="button"
        onClick={onCloseRequest}
        aria-label="Close modal"
        className="min-w-[44px] min-h-[44px] flex items-center justify-center text-gunmetal-muted hover:text-slate-200 hover:bg-gunmetal-canvas rounded-lg transition-colors cursor-pointer"
      >
        <X className="w-5 h-5" />
      </button>
    </div>
  );
}