'use client';

import { useState } from 'react';
import { Flight, Settings } from '@/types';
import CondensedTableHeader from './flightCardCondensed/CondensedTableHeader';
import CondensedFlightRow from './flightCardCondensed/CondensedFlightRow';
import CondensedMobileCard from './flightCardCondensed/CondensedMobileCard';

interface Props {
  flights: Flight[];
  settings?: Settings | null;
  onRefresh: () => void;
  onShowHistory: (flight: Flight) => void;
  onEdit: (flight: Flight) => void;
  onConvertToBooked?: (flight: Flight) => void;
  onOpenManualCheck?: (flight: Flight) => void;
  onRebook?: (flight: Flight) => void;
  onDelete: (flight: Flight) => void;
}

export default function FlightCardCondensed({
  flights,
  settings,
  onRefresh,
  onShowHistory,
  onEdit,
  onConvertToBooked,
  onOpenManualCheck,
  onRebook,
  onDelete,
}: Props) {
  const [hoveredHistoryFlightId, setHoveredHistoryFlightId] = useState<number | null>(null);

  return (
    <>
      {/* Mobile Stacked View (<= 1286px / min-[1287px]:hidden) */}
      <div className="block min-[1287px]:hidden space-y-2.5">
        {flights.map(flight => (
          <CondensedMobileCard
            key={flight.id}
            flight={flight}
            settings={settings}
            onRefresh={onRefresh}
            onShowHistory={onShowHistory}
            onEdit={onEdit}
            onConvertToBooked={onConvertToBooked}
            onOpenManualCheck={onOpenManualCheck}
            onRebook={onRebook}
            onDelete={onDelete}
          />
        ))}
      </div>

      {/* Desktop Condensed Table (>= 1287px / hidden min-[1287px]:block) */}
      <div className="hidden min-[1287px]:block bg-gunmetal-card rounded-lg border border-gunmetal-border shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <CondensedTableHeader />
          <tbody className="divide-y divide-gunmetal-border text-sm">
            {flights.map(flight => (
              <CondensedFlightRow
                key={flight.id}
                flight={flight}
                settings={settings}
                isHistoryHovered={hoveredHistoryFlightId === flight.id}
                onRefresh={onRefresh}
                onShowHistory={onShowHistory}
                onEdit={onEdit}
                onConvertToBooked={onConvertToBooked}
                onOpenManualCheck={onOpenManualCheck}
                onRebook={onRebook}
                onDelete={onDelete}
                onHoverHistory={setHoveredHistoryFlightId}
              />
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}