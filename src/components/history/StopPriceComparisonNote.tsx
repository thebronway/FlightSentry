'use client';

import { StopPriceBreakdown } from '@/utils/routeIntelligence';
import { formatCurrency } from '@/utils/format';

interface Props {
  breakdown: StopPriceBreakdown;
  currency?: string | null;
  align?: 'left' | 'center';
}

export default function StopPriceComparisonNote({
  breakdown,
  currency,
  align = 'left',
}: Props) {
  const justifyClass = align === 'center' ? 'justify-center' : 'justify-start';

  return (
    <div
      className={`mt-1.5 pt-1.5 border-t border-gunmetal-border/60 flex flex-col gap-0.5 text-[10px] font-mono ${
        align === 'center' ? 'items-center' : 'items-start'
      }`}
    >
      <div className={`flex items-center gap-1 ${justifyClass}`}>
        <span className="text-sky-400 font-semibold">Non-stop:</span>
        <span className="text-slate-200 font-bold">
          {breakdown.nonstop !== null ? formatCurrency(breakdown.nonstop, currency) : '—'}
        </span>
      </div>
      <div className={`flex items-center gap-1 ${justifyClass}`}>
        <span className="text-amber-400 font-semibold">With stops:</span>
        <span className="text-slate-300 font-semibold">
          {breakdown.withStops !== null ? formatCurrency(breakdown.withStops, currency) : '—'}
        </span>
      </div>
    </div>
  );
}