'use client';

import { Flight, PriceHistory } from '@/types';
import { DayGroup } from './types';
import { formatCurrency } from '@/utils/format';
import { TrendingDown, TrendingUp, ExternalLink } from 'lucide-react';
import AirlineBadge from '../common/AirlineBadge';

const SOURCE_LABEL_MAP: Record<string, string> = {
  serpapi: 'SerpAPI',
  searchapi: 'SearchApi.io',
  hasdata: 'HasData',
  fastflights: 'Fast-Flights',
  'Price Paid': 'Price Paid',
  manual: 'Price Paid',
};

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

                  // Resolve route for this check record
                  let checkRoute = flight.origin && flight.destination ? `${flight.origin} → ${flight.destination}` : null;
                  if (record.metadata) {
                    try {
                      const meta = JSON.parse(record.metadata);
                      if (Array.isArray(meta) && meta.length > 0) {
                        const matchingIt = meta.find((it: any) =>
                          it.origin && it.destination &&
                          (it.price === record.price || (record.airline && it.airline === record.airline))
                        ) || meta[0];
                        if (matchingIt?.origin && matchingIt?.destination) {
                          checkRoute = `${matchingIt.origin} → ${matchingIt.destination}`;
                        }
                      }
                    } catch {
                      // Ignored
                    }
                  }

                  return (
                    <div
                      key={record.id}
                      className="px-4 py-2.5 flex justify-between items-center hover:bg-gunmetal-canvas/70 transition-colors text-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="text-gunmetal-muted font-mono w-20 flex-shrink-0">
                          {checkTime}
                        </span>
                        {record.airline && (
                          <AirlineBadge
                            code={record.airline}
                            flightNumber={record.flightNumber}
                            size="xs"
                          />
                        )}
                        {checkRoute && (
                          <span className="text-[11px] font-mono text-slate-300 font-semibold px-2 py-0.5 rounded bg-gunmetal-card border border-gunmetal-border whitespace-nowrap">
                            {checkRoute}
                          </span>
                        )}
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

                      <div className="flex items-center gap-2">
                        {(() => {
                          let isRebooked = false;
                          let creditClaimed = 0;
                          if (record.status === 'Booked' && record.metadata) {
                            try {
                              const meta = JSON.parse(record.metadata);
                              if (meta.milestone === 'Rebooked Flight') {
                                isRebooked = true;
                                creditClaimed = Number(meta.creditClaimed || 0);
                              }
                            } catch {
                              // Ignored
                            }
                          }

                          return (
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded font-semibold border ${
                                record.status === 'Success'
                                  ? 'bg-green-900/30 text-green-400 border-green-800/40'
                                  : isRebooked
                                  ? 'bg-emerald-900/50 text-emerald-300 border-emerald-600/70'
                                  : record.status === 'Booked'
                                  ? 'bg-emerald-900/40 text-emerald-300 border-emerald-700/60'
                                  : 'bg-red-900/30 text-red-400 border-red-800/40'
                              }`}
                            >
                              {isRebooked
                                ? creditClaimed > 0
                                  ? `Rebooked (+${formatCurrency(creditClaimed)} Savings)`
                                  : 'Rebooked Fare'
                                : record.status === 'Booked'
                                ? 'Initial Booking'
                                : record.status}
                            </span>
                          );
                        })()}
                        {record.sourceUsed && (
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded font-semibold border ${
                              record.sourceUsed === 'Price Paid' || record.sourceUsed === 'manual'
                                ? 'bg-emerald-950/60 text-emerald-300 border-emerald-700/70 shadow-sm'
                                : record.sourceUsed === 'fastflights'
                                ? 'bg-amber-950/40 text-amber-300 border-amber-800/40'
                                : 'bg-slate-800/60 text-slate-300 border-slate-700/60'
                            }`}
                            title={`Data Source: ${SOURCE_LABEL_MAP[record.sourceUsed] || record.sourceUsed}`}
                          >
                            {SOURCE_LABEL_MAP[record.sourceUsed] || record.sourceUsed}
                          </span>
                        )}
                        {(record.status === 'Success' || record.status === 'Booked') && (
                          <a
                            href={`https://www.google.com/travel/flights?q=Flights%20to%20${flight.destination}%20from%20${flight.origin}%20on%20${flight.departureDate}${record.airline ? `%20${encodeURIComponent(record.airline)}` : ''}${record.flightNumber ? `%20${encodeURIComponent(record.flightNumber)}` : ''}%20oneway`}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Search this check on Google Flights"
                            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold bg-gunmetal-canvas hover:bg-gunmetal-border border border-gunmetal-border text-slate-200 hover:text-white rounded-md shadow-sm transition-colors"
                          >
                            <span>Google Flights</span>
                            <ExternalLink className="w-3.5 h-3.5 text-sky-400" />
                          </a>
                        )}
                      </div>
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