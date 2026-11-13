'use client';

import { PriceHistory } from '@/types';
import { formatCurrency } from '@/utils/format';

const SOURCE_LABEL_MAP: Record<string, string> = {
  serpapi: 'SerpAPI',
  searchapi: 'SearchApi.io',
  hasdata: 'HasData',
  'flightsentry-scraper': 'FlightSentry-Scraper',
  fastflights: 'Fast-Flights',
  'Price Paid': 'Price Paid',
  manual: 'Manual Price Entry',
};

interface Props {
  record: PriceHistory;
  currency?: string | null;
}

export default function HistoryCheckBadges({ record, currency }: Props) {
  const isManualCheck = record.sourceUsed === 'manual';
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

  // 1. Rebooked booking milestone
  if (isRebooked) {
    return (
      <>
        <span className="text-[10px] px-2 py-0.5 rounded font-semibold border bg-emerald-900/50 text-emerald-300 border-emerald-600/70">
          {creditClaimed > 0
            ? `Rebooked (+${formatCurrency(creditClaimed, currency)} Savings)`
            : 'Rebooked Fare'}
        </span>
        <span className="text-[10px] px-2 py-0.5 rounded font-semibold border bg-emerald-950/60 text-emerald-300 border-emerald-700/70 shadow-sm">
          Price Paid
        </span>
      </>
    );
  }

  // 2. Initial Booking milestone
  if (record.status === 'Booked') {
    return (
      <>
        <span className="text-[10px] px-2 py-0.5 rounded font-semibold border bg-emerald-950/60 text-emerald-400 border-emerald-800/50">
          Initial Booking
        </span>
        <span className="text-[10px] px-2 py-0.5 rounded font-semibold border bg-emerald-950/60 text-emerald-300 border-emerald-700/70 shadow-sm">
          Price Paid
        </span>
      </>
    );
  }

  // 3. Single badge for manual price checks
  if (isManualCheck) {
    return (
      <span className="text-[10px] px-2 py-0.5 rounded font-semibold border bg-sky-950/60 text-sky-300 border-sky-700/60 shadow-sm">
        Manual Check
      </span>
    );
  }

  // 4. Automated provider check (Status + Source provider)
  return (
    <>
      <span
        className={`text-[10px] px-2 py-0.5 rounded font-semibold border ${
          record.status === 'Success'
            ? 'bg-green-900/30 text-green-400 border-green-800/40'
            : record.status === 'Paused'
            ? 'bg-amber-950/50 text-amber-300 border-amber-800/50'
            : 'bg-red-900/30 text-red-400 border-red-800/40'
        }`}
      >
        {record.status}
      </span>
      {record.sourceUsed && (
        <span
          className={`text-[10px] px-2 py-0.5 rounded font-semibold border ${
            record.sourceUsed === 'flightsentry-scraper' || record.sourceUsed === 'fastflights'
              ? 'bg-amber-950/40 text-amber-300 border-amber-800/40'
              : 'bg-slate-800/60 text-slate-300 border-slate-700/60'
          }`}
          title={`Data Source: ${SOURCE_LABEL_MAP[record.sourceUsed] || record.sourceUsed}`}
        >
          {SOURCE_LABEL_MAP[record.sourceUsed] || record.sourceUsed}
        </span>
      )}
    </>
  );
}