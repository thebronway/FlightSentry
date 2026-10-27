'use client';

import { Flight, PriceHistory } from '@/types';
import { DayGroup } from './types';
import { formatCurrency } from '@/utils/format';
import { TrendingDown, TrendingUp } from 'lucide-react';

interface Props {
  dayGroups: DayGroup[];
  flight: Flight;
  loading: boolean;
  totalChecks: number;
}

export default function HistoryIntradayLog({
  dayGroups,
  flight,
  loading,
  totalChecks,
}: Props) {
  return (
    <div>
      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-3">
        Recorded Price Checks
      </h3>

      {loading ? (
        <div className="py-8 text-center text-gunmetal-muted text-xs">
          Loading price history...
        </div>
      ) : totalChecks === 0 ? (
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
              <div className="px-4 py-2.5 bg-gunmetal-card/80 border-b border-gunmetal-border flex flex-wrap justify-between items-center gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs text-slate-200">
                    {group.displayDate}
                  </span>
                  <span className="text-[11px] text-gunmetal-muted">
                    ({group.records.length} {group.records.length === 1 ? 'check' : 'checks'})
                  </span>
                </div>

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

              <div className="divide-y divide-gunmetal-border">
                {group.records.map((record: PriceHistory) => {
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
  );
}