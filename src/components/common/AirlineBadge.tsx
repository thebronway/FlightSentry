'use client';

import React from 'react';
import { getAirlineTheme } from '@/utils/airlineThemes';

interface AirlineBadgeProps {
  code: string;
  flightNumber?: string | null;
  size?: 'xs' | 'sm' | 'md';
  showFlightNumber?: boolean;
  align?: 'left' | 'center' | 'right';
  className?: string;
}

export default function AirlineBadge({
  code,
  flightNumber,
  size = 'sm',
  showFlightNumber = true,
  align = 'center',
  className = '',
}: AirlineBadgeProps) {
  const theme = getAirlineTheme(code);
  const displayCode = theme.code;
  const label = showFlightNumber && flightNumber ? `${displayCode} ${flightNumber}` : displayCode;

  const sizeClasses = {
    xs: 'px-1.5 py-0.5 text-[10px]',
    sm: 'px-2 py-0.5 text-[11px]',
    md: 'px-2.5 py-1 text-xs',
  }[size];

  const dotSizes = {
    xs: 'w-1.5 h-1.5',
    sm: 'w-2 h-2',
    md: 'w-2.5 h-2.5',
  }[size];

  const alignContainerClasses = {
    left: 'left-0 items-start',
    center: 'left-1/2 -translate-x-1/2 items-center',
    right: 'right-0 items-end',
  }[align];

  const caretAlignClasses = {
    left: 'ml-3 self-start',
    center: 'self-center',
    right: 'mr-3 self-end',
  }[align];

  return (
    <div className={`group/airline relative inline-flex items-center hover:z-50 ${className}`}>
      <span
        className={`inline-flex items-center gap-1.5 rounded font-bold font-mono border bg-gunmetal-canvas text-slate-200 border-gunmetal-border shadow-sm cursor-pointer transition-colors group-hover/airline:border-slate-500 group-hover/airline:text-white ${sizeClasses}`}
      >
        <span
          className={`${dotSizes} rounded-full flex-shrink-0`}
          style={{ backgroundColor: theme.color }}
        />
        <span>{label}</span>
      </span>

      {/* Instant CSS-Driven Hover Tooltip (<150ms) */}
      <div
        className={`pointer-events-none absolute bottom-full mb-1.5 opacity-0 group-hover/airline:opacity-100 transition-opacity duration-150 ease-out z-50 flex flex-col ${alignContainerClasses}`}
      >
        <div className="bg-gunmetal-card/95 text-slate-100 text-[11px] font-sans font-semibold px-2.5 py-1 rounded shadow-2xl border border-slate-600 whitespace-nowrap backdrop-blur-sm flex items-center gap-1.5">
          <span
            className="w-1.5 h-1.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: theme.color }}
          />
          <span>{theme.name}</span>
        </div>
        <div className={`w-1.5 h-1.5 bg-gunmetal-card border-r border-b border-slate-600 rotate-45 -mt-1 ${caretAlignClasses}`} />
      </div>
    </div>
  );
}