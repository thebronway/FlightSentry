'use client';

import { useEffect, useState, useMemo } from 'react';
import { Flight, PriceHistory } from '@/types';
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

  useEffect(() => {
    if (flight?.id) {
      setLoading(true);
      fetch(`/api/history/${flight.id}`)
        .then(res => res.json())
        .then(data => {
          setHistory(Array.isArray(data) ? data : []);
          setLoading(false);
        })
        .catch(err => {
          console.error('Failed to load history:', err);
          setLoading(false);
        });
    } else {
      setHistory([]);
    }
  }, [flight]);

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
      <div className="bg-gunmetal-card border border-gunmetal-border rounded-xl shadow-2xl w-full max-w-4xl max-h-[88vh] flex flex-col overflow-hidden">
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

          <div>
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Price History Graph
              </h3>
              <span className="text-[11px] text-gunmetal-muted">
                Hover over data points to inspect checks
              </span>
            </div>
            <PriceChart
              history={history}
              baselinePrice={flight.baselinePrice}
              purchasePrice={flight.purchasePrice}
              searchMode={flight.searchMode}
            />
          </div>

          {isRouteMode && <CarrierBreakdownTable history={history} />}

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