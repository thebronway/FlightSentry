'use client';

import { useEffect, useState, useMemo } from 'react';
import { Flight, PriceHistory } from '@/types';
import { formatCurrency } from '@/utils/format';
import PriceChart from './PriceChart';
import RouteCorridorSummary from './RouteCorridorSummary';
import CarrierBreakdownTable from './CarrierBreakdownTable';
import { computeRouteCorridor } from '@/utils/routeIntelligence';
import { X, TrendingDown, TrendingUp, Calendar, Hash, ArrowRight } from 'lucide-react';

interface Props {
  flight: Flight | null;
  onClose: () => void;
}

interface DayGroup {
  dateKey: string;
  displayDate: string;
  records: PriceHistory[];
  dayHigh: number;
  dayLow: number;
  firstPrice: number;
  lastPrice: number;
  intradayDelta: number;
  hasMultipleChecks: boolean;
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

  // Group check entries by calendar day for intraday analysis
  const dayGroups: DayGroup[] = useMemo(() => {
    const groups: Record<string, PriceHistory[]> = {};

    history.forEach(item => {
      const dateKey = new Date(item.checkedAt).toISOString().split('T')[0];
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(item);
    });

    return Object.keys(groups)
      .sort((a, b) => b.localeCompare(a)) // Newest dates first
      .map(dateKey => {
        const records = groups[dateKey].sort(
          (a, b) => new Date(b.checkedAt).getTime() - new Date(a.checkedAt).getTime()
        );
        const prices = records.map(r => r.price).filter(p => typeof p === 'number' && p > 0);

        const dayHigh = prices.length > 0 ? Math.max(...prices) : 0;
        const dayLow = prices.length > 0 ? Math.min(...prices) : 0;

        // Chronological order for intraday delta (earliest to latest)
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
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-gunmetal-border flex justify-between items-center bg-gunmetal-card z-10">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-black text-slate-100 font-sans tracking-tight">
                {primaryTitle}
              </h2>
              {isFlightNumMode && (
                <span className="text-sm font-semibold text-slate-300">
                  {flight.origin} → ${flight.destination}
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

        {/* Modal Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Route Corridor High / Low / Current Summary (Header for Route Searches) */}
          {isRouteMode ? (
            <RouteCorridorSummary metrics={corridorMetrics} />
          ) : (
            /* Quick Stat Metric Badges for Specific Flight Number Searches */
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-gunmetal-canvas/60 border border-gunmetal-border p-3 rounded-lg">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-gunmetal-muted block">
                  Current Price
                </span>
                <span className="text-xl font-black text-slate-100 block mt-0.5">
                  {formatCurrency(flight.currentPrice)}
                </span>
              </div>
              <div className="bg-gunmetal-canvas/60 border border-gunmetal-border p-3 rounded-lg">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-gunmetal-muted block">
                  {flight.purchasePrice && flight.purchasePrice > 0 ? 'Purchase Price' : 'Initial Baseline'}
                </span>
                <span className="text-xl font-bold text-slate-300 block mt-0.5">
                  {formatCurrency(flight.purchasePrice && flight.purchasePrice > 0 ? flight.purchasePrice : flight.baselinePrice)}
                </span>
              </div>
              <div className="bg-gunmetal-canvas/60 border border-gunmetal-border p-3 rounded-lg">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-gunmetal-muted block">
                  All-Time Low
                </span>
                <span className="text-xl font-bold text-green-400 block mt-0.5">
                  {formatCurrency(corridorMetrics.allTimeLow)}
                </span>
              </div>
              <div className="bg-gunmetal-canvas/60 border border-gunmetal-border p-3 rounded-lg">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-gunmetal-muted block">
                  Total Checks
                </span>
                <span className="text-xl font-bold text-sky-400 block mt-0.5">
                  {history.length}
                </span>
              </div>
            </div>
          )}

          {/* Price Trend Chart Section */}
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

          {/* Carrier Breakdown Matrix (Below Graph for Route Searches) */}
          {isRouteMode && (
            <CarrierBreakdownTable history={history} />
          )}

          {/* Chronological History Log with Intraday Multi-Price Handling */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-3">
              Recorded Price Checks
            </h3>

            {loading ? (
              <div className="py-8 text-center text-gunmetal-muted text-xs">
                Loading price history...
              </div>
            ) : history.length === 0 ? (
              <div className="py-8 text-center text-gunmetal-muted text-xs border border-dashed border-gunmetal-border rounded-lg">
                No checks recorded yet for this flight.
              </div>
            ) : (
              <div className="space-y-4">
                {dayGroups.map(group => (
                  <div
                    key={group.dateKey}
                    className="border border-gunmetal-border rounded-lg bg-gunmetal-canvas/40 overflow-hidden"
                  >
                    {/* Date Header with Intraday Delta Indicator */}
                    <div className="px-4 py-2.5 bg-gunmetal-card/80 border-b border-gunmetal-border flex flex-wrap justify-between items-center gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-200">
                          {group.displayDate}
                        </span>
                        <span className="text-[11px] text-gunmetal-muted">
                          ({group.records.length} {group.records.length === 1 ? 'check' : 'checks'})
                        </span>
                      </div>

                      {/* Clever Intraday Multiple Price Summary */}
                      {group.hasMultipleChecks && (
                        <div className="flex items-center gap-2 text-xs">
                          {group.intradayDelta < 0 ? (
                            <span className="text-green-400 font-semibold flex items-center gap-1 bg-green-950/40 px-2 py-0.5 rounded border border-green-800/40">
                              <TrendingDown className="w-3.5 h-3.5" />
                              Intraday Drop: {formatCurrency(Math.abs(group.intradayDelta))}
                            </span>
                          ) : group.intradayDelta > 0 ? (
                            <span className="text-red-400 font-semibold flex items-center gap-1 bg-red-950/40 px-2 py-0.5 rounded border border-red-800/40">
                              <TrendingUp className="w-3.5 h-3.5" />
                              Intraday Rise: +{formatCurrency(group.intradayDelta)}
                            </span>
                          ) : (
                            <span className="text-slate-300 font-medium bg-gunmetal-canvas px-2 py-0.5 rounded border border-gunmetal-border text-[11px]">
                              Day Spread: {formatCurrency(group.dayLow)} – {formatCurrency(group.dayHigh)}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Check Records for this Day */}
                    <div className="divide-y divide-gunmetal-border">
                      {group.records.map(record => {
                        const checkTime = new Date(record.checkedAt).toLocaleTimeString('en-US', {
                          hour: 'numeric',
                          minute: '2-digit',
                          hour12: true,
                        });
                        const activeBenchmark = flight.purchasePrice && flight.purchasePrice > 0 
                          ? flight.purchasePrice 
                          : flight.baselinePrice;
                        const dropFromBenchmark = activeBenchmark - record.price;
                        return (
                          <div
                            key={record.id}
                            className="px-4 py-2.5 flex justify-between items-center hover:bg-gunmetal-canvas/70 transition-colors text-xs"
                          >
                            <div className="flex items-center gap-3">
                              <span className="text-gunmetal-muted font-mono w-20">
                                {checkTime}
                              </span>
                              <span className="font-bold text-sm text-slate-100">
                                {formatCurrency(record.price)}
                              </span>
                              {dropFromBenchmark > 0 && (
                                <span className="text-green-400 font-semibold text-[11px]">
                                  (-{formatCurrency(dropFromBenchmark)})
                                </span>
                              )}
                              {dropFromBenchmark < 0 && (
                                <span className="text-red-400 font-semibold text-[11px]">
                                  (+{formatCurrency(Math.abs(dropFromBenchmark))})
                                </span>
                              )}
                            </div>

                            <span
                              className={`text-[10px] px-2 py-0.5 rounded font-semibold border ${
                                record.status === 'Success'
                                  ? 'bg-green-900/30 text-green-400 border-green-800/40'
                                  : 'bg-red-900/30 text-red-400 border-red-800/40'
                              }`}
                            >
                              {record.status}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}