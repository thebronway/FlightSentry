'use client';

import { Coins, Wrench } from 'lucide-react';

interface Props {
  variant: 'points' | 'cash-manual';
}

export default function ManualModeNoticeCard({ variant }: Props) {
  const isPoints = variant === 'points';

  return (
    <div
      className={`rounded-xl p-4 sm:p-5 space-y-2 text-xs leading-relaxed border ${
        isPoints
          ? 'bg-amber-950/20 border-amber-900/40 text-amber-200/90'
          : 'bg-sky-950/20 border-sky-900/40 text-slate-300'
      }`}
    >
      <div
        className={`flex items-center gap-2 font-bold ${
          isPoints ? 'text-amber-100' : 'text-slate-100'
        }`}
      >
        {isPoints ? (
          <Coins className="w-4 h-4 text-amber-400" />
        ) : (
          <Wrench className="w-4 h-4 text-sky-400" />
        )}
        <span>
          {isPoints ? 'Award Points Flight Configuration' : 'Manual Cash Tracking Configuration'}
        </span>
      </div>
      <p>
        {isPoints
          ? 'Flight search providers and scrapers only index standard cash fares and do not support dynamic loyalty reward charts or award space availability.'
          : 'Automated background checks are disabled in Manual Tracking Mode. Log observed fare updates anytime from the price history modal.'}
      </p>
      <ul className="list-disc list-inside space-y-1 text-gunmetal-muted text-[11px] pt-1">
        <li>Automated price drop &amp; surge alerts are hidden</li>
        <li>Automated notification dispatch is disabled</li>
        <li>Background price polling is disabled</li>
      </ul>
    </div>
  );
}