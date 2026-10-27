'use client';

import { PriceHistory } from '@/types';
import { CarrierCheckSummary } from './types';
import { formatCurrency } from '@/utils/format';
import { getAirlineColor, getAirlineName, cleanDisplayTime } from '@/utils/airline';

interface Props {
  activeRecord: PriceHistory;
  activeX: number;
  activeY: number;
  activeDelta: number;
  benchmarkLabel: string;
  isMultiAirlineMode: boolean;
  activeSummaries: CarrierCheckSummary[];
  chartWidth: number;
}

export default function ChartScrubberTooltip({
  activeRecord,
  activeX,
  activeY,
  activeDelta,
  benchmarkLabel,
  isMultiAirlineMode,
  activeSummaries,
  chartWidth,
}: Props) {
  return (
    <div
      className="absolute pointer-events-none z-20 bg-gunmetal-card/95 border border-slate-600 p-3 rounded-lg shadow-2xl text-xs backdrop-blur-md min-w-[210px]"
      style={{
        left: `${Math.min(Math.max(activeX - 105, 12), chartWidth - 235)}px`,
        top: `${Math.max(activeY - 80, 10)}px`,
      }}
    >
      <div className="flex items-center justify-between border-b border-gunmetal-border pb-1.5 mb-2 text-[11px] text-gunmetal-muted">
        <span>
          {new Date(activeRecord.checkedAt).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
          })}
        </span>
        <span className="font-mono">
          {new Date(activeRecord.checkedAt).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
          })}
        </span>
      </div>

      {isMultiAirlineMode && activeSummaries.length > 0 ? (
        <div className="space-y-1.5 max-h-56 overflow-y-auto pr-0.5">
          {activeSummaries
            .sort((a, b) => a.price - b.price)
            .map((s, idx) => {
              const isFloor = idx === 0;
              const formattedTime = cleanDisplayTime(s.departureTime);
              return (
                <div
                  key={s.airline}
                  className={`flex items-center justify-between gap-3 text-xs px-2 py-1 rounded ${
                    isFloor ? 'bg-green-950/50 border border-green-800/50 font-bold' : 'hover:bg-gunmetal-canvas'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: getAirlineColor(s.airline) }}
                    />
                    <span className="text-slate-100 font-semibold">{s.airline}</span>
                    {s.flightNumber && (
                      <span className="text-[11px] text-slate-300 font-mono">
                        #{s.flightNumber}
                      </span>
                    )}
                    {formattedTime && (
                      <span className="text-[10px] text-gunmetal-muted">
                        {formattedTime}
                      </span>
                    )}
                    {s.flightCount > 1 && (
                      <span className="text-[9px] text-gunmetal-muted bg-gunmetal-canvas px-1 py-0.2 rounded border border-gunmetal-border/50">
                        {s.flightCount} flights
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 font-mono">
                    <span className={isFloor ? 'text-green-300' : 'text-slate-200'}>
                      {formatCurrency(s.price)}
                    </span>
                    {isFloor && (
                      <span className="text-[9px] uppercase px-1 py-0.2 rounded bg-green-900/70 text-green-300 font-bold">
                        Low
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
        </div>
      ) : (
        <div className="space-y-1">
          <div className="font-bold text-slate-100 flex items-center justify-between gap-3 text-sm">
            <span>{formatCurrency(activeRecord.price)}</span>
            <span
              className={`text-[10px] font-semibold ${
                activeDelta > 0 ? 'text-green-400' : activeDelta < 0 ? 'text-red-400' : 'text-slate-400'
              }`}
            >
              {activeDelta > 0
                ? `-${formatCurrency(activeDelta)}`
                : activeDelta < 0
                ? `+${formatCurrency(Math.abs(activeDelta))}`
                : benchmarkLabel}
            </span>
          </div>
          {activeRecord.airline && (
            <div className="text-[10px] text-gunmetal-muted flex items-center gap-1.5">
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: getAirlineColor(activeRecord.airline) }}
              />
              <span>{getAirlineName(activeRecord.airline)}</span>
              {activeRecord.flightNumber && <span>#{activeRecord.flightNumber}</span>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}