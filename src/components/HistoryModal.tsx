'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { Flight, PriceHistory } from '@/types';
import { Layers } from 'lucide-react';
import PriceChart from './PriceChart';
import RouteCorridorSummary from './RouteCorridorSummary';
import CarrierBreakdownTable from './CarrierBreakdownTable';
import { computeRouteCorridor } from '@/utils/routeIntelligence';
import { DayGroup } from './history/types';
import HistoryModalHeader from './history/HistoryModalHeader';
import FlightStatBadges from './history/FlightStatBadges';
import HistoryIntradayLog from './history/HistoryIntradayLog';

interface Props {
  flight: Flight | null;
  onClose: () => void;
}

export default function HistoryModal({ flight, onClose }: Props) {
  const [history, setHistory] = useState<PriceHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [overlayRouteFloor, setOverlayRouteFloor] = useState(false);

  // Default route floor overlay to hidden on every flight modal open to prevent visual clutter
  useEffect(() => {
    setOverlayRouteFloor(false);
  }, [flight?.id]);

  const loadHistory = useCallback((flightId: number, silent = false) => {
    if (!silent) setLoading(true);
    fetch(`/api/history/${flightId}`)
      .then(res => res.json())
      .then(data => {
        setHistory(Array.isArray(data) ? data : []);
      })
      .catch(err => {
        console.error('Failed to load history:', err);
      })
      .finally(() => {
        if (!silent) setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (flight?.id) {
      loadHistory(flight.id, false);

      const handleVisibilityOrFocus = () => {
        if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
          loadHistory(flight.id, true);
        }
      };

      window.addEventListener('focus', handleVisibilityOrFocus);
      document.addEventListener('visibilitychange', handleVisibilityOrFocus);

      // Silent background polling every 30s while modal is open
      const pollInterval = setInterval(() => {
        if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
          loadHistory(flight.id, true);
        }
      }, 30000);

      return () => {
        window.removeEventListener('focus', handleVisibilityOrFocus);
        document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
        clearInterval(pollInterval);
      };
    } else {
      setHistory([]);
    }
  }, [flight?.id, loadHistory]);

  // Silently reload history points whenever the parent flight price updates
  useEffect(() => {
    if (flight?.id) {
      loadHistory(flight.id, true);
    }
  }, [flight?.currentPrice, flight?.updatedAt, flight?.id, loadHistory]);

  const dayGroups: DayGroup[] = useMemo(() => {
    const groups: Record<string, PriceHistory[]> = {};

    history.forEach(item => {
      const dateKey = new Date(item.checkedAt).toISOString().split('T')[0];
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(item);
    });

    return Object.keys(groups)
      .sort((a, b) => b.localeCompare(a))
      .map(dateKey => {
        const records = groups[dateKey].sort(
          (a, b) => new Date(b.checkedAt).getTime() - new Date(a.checkedAt).getTime()
        );
        const prices = records.map(r => r.price).filter(p => typeof p === 'number' && p > 0);

        const dayHigh = prices.length > 0 ? Math.max(...prices) : 0;
        const dayLow = prices.length > 0 ? Math.min(...prices) : 0;

        const chrono = [...records].sort(
          (a, b) => new Date(a.checkedAt).getTime() - new Date(b.checkedAt).getTime()
        );
        const firstPrice = chrono[0]?.price || 0;
        const lastPrice = chrono[chrono.length - 1]?.price || 0;
        const intradayDelta = lastPrice - firstPrice;

        const displayDate = new Date(`${dateKey}T12:00:00Z`).toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        });

        return {
          dateKey,
          displayDate,
          records,
          dayHigh,
          dayLow,
          firstPrice,
          lastPrice,
          intradayDelta,
          hasMultipleChecks: records.length > 1,
        };
      });
  }, [history]);

  if (!flight) return null;

  const isFlightNumMode = flight.searchMode === 'FlightNumber' && flight.flightNumber;
  const isRouteMode = !isFlightNumMode;
  const primaryTitle = isFlightNumMode
    ? `${flight.airline} ${flight.flightNumber}`
    : `${flight.origin} → ${flight.destination}`;

  const corridorMetrics = computeRouteCorridor(history, flight.currentPrice);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 sm:p-6 transition-all">
      <div className="bg-gunmetal-card border border-gunmetal-border rounded-xl shadow-2xl w-full max-w-4xl lg:max-w-5xl xl:max-w-6xl max-h-[88vh] flex flex-col overflow-hidden">
        <HistoryModalHeader
          flight={flight}
          isFlightNumMode={Boolean(isFlightNumMode)}
          primaryTitle={primaryTitle}
          onClose={onClose}
        />

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {isRouteMode ? (
            <RouteCorridorSummary metrics={corridorMetrics} />
          ) : (
            <FlightStatBadges
              flight={flight}
              allTimeLow={corridorMetrics.allTimeLow}
              totalChecks={history.length}
            />
          )}

          {overlayRouteFloor && isFlightNumMode && (
            <RouteCorridorSummary metrics={corridorMetrics} />
          )}

          <div>
            <div className="flex flex-wrap justify-between items-center gap-2 mb-2">
              <div className="flex items-center gap-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Price History Graph
                </h3>
                {isFlightNumMode && (flight.monitorRouteAlternatives === 1 || history.some(h => Boolean(h.metadata))) && (
                  <button
                    type="button"
                    onClick={() => setOverlayRouteFloor(prev => !prev)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold border transition-all cursor-pointer ${
                      overlayRouteFloor
                        ? 'bg-sky-950/60 border-sky-500 text-sky-300 shadow-sm'
                        : 'bg-gunmetal-canvas border-gunmetal-border text-gunmetal-muted hover:text-slate-200 hover:border-slate-500'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>{overlayRouteFloor ? 'Route Floor Overlay: ON' : 'Overlay Route Floor'}</span>
                  </button>
                )}
              </div>
              <span className="text-[11px] text-gunmetal-muted">
                {overlayRouteFloor
                  ? 'Viewing route floor & competitor trends'
                  : 'Hover over data points to inspect checks'}
              </span>
            </div>
            <PriceChart
              history={history}
              baselinePrice={flight.baselinePrice}
              purchasePrice={flight.purchasePrice}
              searchMode={overlayRouteFloor ? 'Route' : flight.searchMode}
              overlayRouteFloor={overlayRouteFloor}
              currency={flight.currency}
            />
          </div>

          {(isRouteMode || overlayRouteFloor) && <CarrierBreakdownTable history={history} flight={flight} />}

          <HistoryIntradayLog
            dayGroups={dayGroups}
            flight={flight}
            loading={loading}
            totalChecks={history.length}
          />
        </div>
      </div>
    </div>
  );
}