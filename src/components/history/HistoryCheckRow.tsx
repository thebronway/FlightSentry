'use client';

import { Flight, PriceHistory } from '@/types';
import { formatCurrency } from '@/utils/format';
import { ArrowRight } from 'lucide-react';
import AirlineBadge from '../common/AirlineBadge';
import GoogleIcon from '../GoogleIcon';
import { resolveLocationDisplay } from '@/utils/coLocations';
import HistoryCheckBadges from './HistoryCheckBadges';

interface Props {
  record: PriceHistory;
  flight: Flight;
}

export default function HistoryCheckRow({ record, flight }: Props) {
  const checkTime = new Date(record.checkedAt).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  const activeBenchmark =
    flight.purchasePrice && flight.purchasePrice > 0
      ? flight.purchasePrice
      : flight.baselinePrice;
  const dropFromBenchmark = activeBenchmark - record.price;

  // Resolve route for this check record
  let checkOrigin = flight.origin || '';
  let checkDestination = flight.destination || '';
  if (record.metadata) {
    try {
      const meta = JSON.parse(record.metadata);
      if (Array.isArray(meta) && meta.length > 0) {
        const matchingIt =
          meta.find(
            (it: any) =>
              it.origin &&
              it.destination &&
              (it.price === record.price || (record.airline && it.airline === record.airline))
          ) || meta[0];
        if (matchingIt?.origin && matchingIt?.destination) {
          checkOrigin = matchingIt.origin;
          checkDestination = matchingIt.destination;
        }
      }
    } catch {
      // Ignored
    }
  }

  const hasCheckRoute = Boolean(checkOrigin && checkDestination);
  const origDisp = hasCheckRoute ? resolveLocationDisplay(checkOrigin) : null;
  const destDisp = hasCheckRoute ? resolveLocationDisplay(checkDestination) : null;

  const googleFlightsUrl = `https://www.google.com/travel/flights?q=Flights%20to%20${encodeURIComponent(
    checkDestination || flight.destination || ''
  )}%20from%20${encodeURIComponent(checkOrigin || flight.origin || '')}%20on%20${flight.departureDate}${
    record.airline ? `%20${encodeURIComponent(record.airline)}` : ''
  }${record.flightNumber ? `%20${encodeURIComponent(record.flightNumber)}` : ''}%20oneway`;

  return (
    <div className="px-3.5 sm:px-4 py-3 sm:py-2.5 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2.5 hover:bg-gunmetal-canvas/70 transition-colors text-xs">
      <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
        <span className="text-gunmetal-muted font-mono sm:w-20 flex-shrink-0">
          {checkTime}
        </span>
        {record.airline && (
          <AirlineBadge
            code={record.airline}
            flightNumber={record.flightNumber}
            size="xs"
          />
        )}
        {origDisp && destDisp && (
          <span className="inline-flex items-center gap-1 whitespace-nowrap">
            <span
              className={`px-1.5 py-0.5 rounded font-mono text-[10px] font-bold shadow-sm ${
                origDisp.isCluster
                  ? 'bg-sky-950/60 border border-sky-500/70 text-sky-200'
                  : 'bg-slate-900/80 border border-sky-900/50 text-slate-300'
              }`}
            >
              {origDisp.code}
            </span>
            <ArrowRight className="w-2.5 h-2.5 text-gunmetal-muted flex-shrink-0" />
            <span
              className={`px-1.5 py-0.5 rounded font-mono text-[10px] font-bold shadow-sm ${
                destDisp.isCluster
                  ? 'bg-sky-950/60 border border-sky-500/70 text-sky-200'
                  : 'bg-slate-900/80 border border-sky-900/50 text-slate-300'
              }`}
            >
              {destDisp.code}
            </span>
          </span>
        )}
        <span className="font-bold text-sm text-slate-100 font-mono">
          {formatCurrency(record.price, flight.currency)}
        </span>
        {dropFromBenchmark > 0 && (
          <span className="text-green-400 font-semibold text-[11px] font-mono">
            ▼ {formatCurrency(dropFromBenchmark, flight.currency)}
          </span>
        )}
        {dropFromBenchmark < 0 && (
          <span className="text-red-400 font-semibold text-[11px] font-mono">
            ▲ {formatCurrency(Math.abs(dropFromBenchmark), flight.currency)}
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <HistoryCheckBadges record={record} currency={flight.currency} />
        </div>
        {(record.status === 'Success' || record.status === 'Booked') && (
          <a
            href={googleFlightsUrl}
            target="_blank"
            rel="noopener noreferrer"
            title="Search this check on Google Flights"
            className="min-h-[44px] sm:min-h-[30px] flex items-center justify-center gap-1.5 px-3 sm:px-2.5 py-2 sm:py-1 text-xs font-semibold bg-gunmetal-canvas hover:bg-blue-950/30 border border-gunmetal-border text-slate-200 hover:text-[#4285F4] rounded-lg sm:rounded-md shadow-sm transition-colors ml-auto sm:ml-0"
          >
            <GoogleIcon className="w-3.5 h-3.5" />
            <span>Google Flights</span>
          </a>
        )}
      </div>
    </div>
  );
}