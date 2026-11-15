'use client';

import { useEffect, useMemo, useState } from 'react';
import { Flight, PriceHistory, Settings } from '@/types';
import RouteCorridorSummary from './RouteCorridorSummary';
import CarrierBreakdownTable from './CarrierBreakdownTable';
import {
  computeRouteCorridor,
  computeStopComparisonMetrics,
  filterHistoryForStopView,
  StopViewMode,
} from '@/utils/routeIntelligence';
import { buildDayGroups, useFlightHistory } from './history/useFlightHistory';
import HistoryModalHeader from './history/HistoryModalHeader';
import HistoryStopFilterBar from './history/HistoryStopFilterBar';
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
  const { history, loading, loadHistory } = useFlightHistory(flight);
  const [overlayRouteFloor, setOverlayRouteFloor] = useState(false);
  const [previewOppositeStops, setPreviewOppositeStops] = useState(false);
  const [isManualEntryOpen, setIsManualEntryOpen] = useState(false);
  const [isRebookOpen, setIsRebookOpen] = useState(false);

  // Reset ephemeral modal-only toggles whenever a different flight is opened
  useEffect(() => {
    setOverlayRouteFloor(false);
    setPreviewOppositeStops(false);
  }, [flight?.id]);

  const isNonstopSaved = flight?.maxStops === 0;
  const activeStopViewMode: StopViewMode = isNonstopSaved
    ? (previewOppositeStops ? 'all-stops' : 'nonstop-only')
    : (previewOppositeStops ? 'nonstop-only' : 'all-stops');

  const rawHistoryById = useMemo(() => {
    const map: Record<number, PriceHistory> = {};
    history.forEach(item => {
      map[item.id] = item;
    });
    return map;
  }, [history]);

  const filteredHistory = useMemo(() => {
    if (!flight) return [];
    return filterHistoryForStopView(history, activeStopViewMode, flight.maxStops);
  }, [history, activeStopViewMode, flight]);

  const filteredDayGroups = useMemo(() => buildDayGroups(filteredHistory), [filteredHistory]);

  const stopComparison = useMemo(() => {
    if (!flight) return null;
    return computeStopComparisonMetrics(history, flight);
  }, [history, flight]);

  if (!flight) return null;

  const isFlightNumMode = Boolean(flight.searchMode === 'FlightNumber' && flight.flightNumber);
  const isRouteMode = !isFlightNumMode;
  const isPurchased = flight.purchasePrice !== null && flight.purchasePrice !== undefined && flight.purchasePrice > 0;
  const isPast = flight.status === 'Past';

  const canToggleStops =
    isRouteMode || flight.monitorRouteAlternatives === 1 || history.some(h => Boolean(h.metadata));

  const effectiveCurrentFloor = isNonstopSaved
    ? flight.currentPrice
    : previewOppositeStops
    ? (stopComparison?.current.nonstop ?? 0)
    : flight.currentPrice;

  const corridorMetrics = computeRouteCorridor(filteredHistory, effectiveCurrentFloor);

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
          {canToggleStops && (
            <HistoryStopFilterBar
              savedMaxStops={flight.maxStops}
              previewOppositeStops={previewOppositeStops}
              onTogglePreview={setPreviewOppositeStops}
            />
          )}

          {isRouteMode ? (
            <RouteCorridorSummary
              metrics={corridorMetrics}
              currency={flight.currency}
              baselinePrice={flight.baselinePrice}
              purchasePrice={flight.purchasePrice}
              stopComparison={stopComparison}
              showStopComparison={previewOppositeStops}
            />
          ) : (
            <FlightStatBadges
              flight={flight}
              allTimeLow={corridorMetrics.allTimeLow}
              totalChecks={filteredHistory.length}
              stopComparison={stopComparison}
              showStopComparison={previewOppositeStops}
            />
          )}

          {overlayRouteFloor && isFlightNumMode && (
            <RouteCorridorSummary
              metrics={corridorMetrics}
              currency={flight.currency}
              baselinePrice={flight.baselinePrice}
              purchasePrice={flight.purchasePrice}
              stopComparison={stopComparison}
              showStopComparison={previewOppositeStops}
            />
          )}

          <HistoryChartSection
            flight={flight}
            history={filteredHistory}
            rawHistory={history}
            isFlightNumMode={isFlightNumMode}
            overlayRouteFloor={overlayRouteFloor}
            onToggleOverlay={() => setOverlayRouteFloor(prev => !prev)}
            showStopComparison={previewOppositeStops}
          />

          {(isRouteMode || overlayRouteFloor) && (
            <CarrierBreakdownTable history={filteredHistory} flight={flight} />
          )}

          <HistoryIntradayLog
            dayGroups={filteredDayGroups}
            rawHistoryById={rawHistoryById}
            flight={flight}
            loading={loading}
            totalChecks={filteredHistory.length}
            showStopComparison={previewOppositeStops}
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