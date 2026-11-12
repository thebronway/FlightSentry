'use client';

import { useEffect, useState } from 'react';
import { Flight, Settings } from '@/types';
import RouteCorridorSummary from './RouteCorridorSummary';
import CarrierBreakdownTable from './CarrierBreakdownTable';
import { computeRouteCorridor } from '@/utils/routeIntelligence';
import { useFlightHistory } from './history/useFlightHistory';
import HistoryModalHeader from './history/HistoryModalHeader';
import FlightStatBadges from './history/FlightStatBadges';
import HistoryChartSection from './history/HistoryChartSection';
import HistoryIntradayLog from './history/HistoryIntradayLog';
import ManualPriceEntryModal from './history/ManualPriceEntryModal';
import RebookFlightModal from './history/RebookFlightModal';

interface Props {
  flight: Flight | null;
  settings?: Settings | null;
  onClose: () => void;
  onUpdateFlight?: (updatedFlight?: Flight) => void;
}

export default function HistoryModal({ flight, settings, onClose, onUpdateFlight }: Props) {
  const { history, loading, dayGroups, loadHistory } = useFlightHistory(flight);
  const [overlayRouteFloor, setOverlayRouteFloor] = useState(false);
  const [isManualEntryOpen, setIsManualEntryOpen] = useState(false);
  const [isRebookOpen, setIsRebookOpen] = useState(false);

  // Default route floor overlay to hidden on every flight modal open to prevent visual clutter
  useEffect(() => {
    setOverlayRouteFloor(false);
  }, [flight?.id]);

  if (!flight) return null;

  const isFlightNumMode = Boolean(flight.searchMode === 'FlightNumber' && flight.flightNumber);
  const isRouteMode = !isFlightNumMode;
  const isPurchased = flight.purchasePrice !== null && flight.purchasePrice !== undefined && flight.purchasePrice > 0;
  const isPast = flight.status === 'Past';

  const corridorMetrics = computeRouteCorridor(history, flight.currentPrice);

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-0 sm:p-4 md:p-6 transition-all"
    >
      <div
        className={`border w-full h-full sm:h-auto sm:max-h-[90vh] sm:rounded-2xl shadow-2xl max-w-4xl lg:max-w-5xl xl:max-w-6xl flex flex-col overflow-hidden ${
          isPast
            ? 'border-slate-800/80 bg-gunmetal-card'
            : isPurchased
            ? 'border-gunmetal-border border-l-4 border-l-emerald-500 bg-gunmetal-card'
            : 'border-gunmetal-border border-l-4 border-l-sky-500/70 bg-gunmetal-card'
        }`}
      >
        <HistoryModalHeader
          flight={flight}
          settings={settings}
          isFlightNumMode={isFlightNumMode}
          onClose={onClose}
          onOpenManualEntry={() => setIsManualEntryOpen(true)}
          onOpenRebook={() => setIsRebookOpen(true)}
        />

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 sm:space-y-6 min-h-0">
          {isRouteMode ? (
            <RouteCorridorSummary metrics={corridorMetrics} currency={flight.currency} />
          ) : (
            <FlightStatBadges
              flight={flight}
              allTimeLow={corridorMetrics.allTimeLow}
              totalChecks={history.length}
            />
          )}

          {overlayRouteFloor && isFlightNumMode && (
            <RouteCorridorSummary metrics={corridorMetrics} currency={flight.currency} />
          )}

          <HistoryChartSection
            flight={flight}
            history={history}
            isFlightNumMode={isFlightNumMode}
            overlayRouteFloor={overlayRouteFloor}
            onToggleOverlay={() => setOverlayRouteFloor(prev => !prev)}
          />

          {(isRouteMode || overlayRouteFloor) && <CarrierBreakdownTable history={history} flight={flight} />}

          <HistoryIntradayLog
            dayGroups={dayGroups}
            flight={flight}
            loading={loading}
            totalChecks={history.length}
          />
        </div>
      </div>

      <ManualPriceEntryModal
        isOpen={isManualEntryOpen}
        flight={flight}
        onClose={() => setIsManualEntryOpen(false)}
        onSuccess={(updatedFlight) => {
          if (flight?.id) loadHistory(flight.id, false);
          if (onUpdateFlight) onUpdateFlight(updatedFlight);
        }}
      />

      <RebookFlightModal
        isOpen={isRebookOpen}
        flight={flight}
        onClose={() => setIsRebookOpen(false)}
        onSuccess={(updatedFlight) => {
          if (flight?.id) loadHistory(flight.id, false);
          if (onUpdateFlight) onUpdateFlight(updatedFlight);
        }}
      />
    </div>
  );
}