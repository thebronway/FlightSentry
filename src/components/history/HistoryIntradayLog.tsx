'use client';

import { Flight, PriceHistory } from '@/types';
import { DayGroup } from './types';
import { formatCurrency } from '@/utils/format';
import HistoryCheckRow from './HistoryCheckRow';

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
                        ▼ Intraday Drop: {formatCurrency(Math.abs(group.intradayDelta), flight.currency)}
                      </span>
                    ) : group.intradayDelta > 0 ? (
                      <span className="text-red-400 font-semibold flex items-center gap-1 bg-red-950/40 px-2 py-0.5 rounded border border-red-800/40">
                        ▲ Intraday Rise: {formatCurrency(group.intradayDelta, flight.currency)}
                      </span>
                    ) : (
                      <span className="text-slate-300 font-medium bg-gunmetal-canvas px-2 py-0.5 rounded border border-gunmetal-border text-[11px]">
                        Day Spread: {formatCurrency(group.dayLow, flight.currency)} – {formatCurrency(group.dayHigh, flight.currency)}
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="divide-y divide-gunmetal-border">
                {group.records.map((record: PriceHistory) => (
                  <HistoryCheckRow key={record.id} record={record} flight={flight} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}