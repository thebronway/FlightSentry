'use client';

import { useLayoutEffect, useRef, useState, useCallback } from 'react';
import { PriceHistory } from '@/types';
import { CarrierCheckSummary } from './types';
import { formatCurrency } from '@/utils/format';
import { getAirlineColor, getAirlineName, cleanDisplayTime } from '@/utils/airline';
import { ArrowRight, X } from 'lucide-react';

interface Props {
  activeRecord: PriceHistory;
  activeX: number;
  activeY: number;
  activeDelta: number;
  benchmarkLabel: string;
  isMultiAirlineMode: boolean;
  activeSummaries: CarrierCheckSummary[];
  chartWidth: number;
  chartHeight: number;
  currency?: string | null;
  isTouchPinned?: boolean;
  onDismiss?: () => void;
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
  chartHeight,
  currency,
  isTouchPinned = false,
  onDismiss,
}: Props) {
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ left: number; top: number; ready: boolean }>({
    left: 12,
    top: 10,
    ready: false,
  });

  const updatePosition = useCallback(() => {
    const tooltipEl = tooltipRef.current;
    const containerEl = tooltipEl?.parentElement;
    if (!tooltipEl || !containerEl) return;

    const containerRect = containerEl.getBoundingClientRect();
    const tooltipRect = tooltipEl.getBoundingClientRect();
    if (containerRect.width === 0 || tooltipRect.width === 0) return;

    const scaleX = containerRect.width / chartWidth;
    const scaleY = containerRect.height / chartHeight;
    const anchorX = activeX * scaleX;
    const anchorY = activeY * scaleY;

    const containerPad = 8;
    const viewportPad = 12;

    // Horizontal clamping within both container and viewport
    const idealLeft = anchorX - tooltipRect.width / 2;
    const minLeft = Math.max(containerPad, viewportPad - containerRect.left);
    const maxLeft = Math.min(
      containerRect.width - tooltipRect.width - containerPad,
      window.innerWidth - viewportPad - containerRect.left - tooltipRect.width
    );
    const clampedLeft =
      maxLeft >= minLeft
        ? Math.max(minLeft, Math.min(maxLeft, idealLeft))
        : minLeft;

    // Vertical placement: prefer above active point, flip below if clipped by container or viewport
    const aboveTop = anchorY - tooltipRect.height - 14;
    const belowTop = anchorY + 16;
    const minTop = Math.max(containerPad, viewportPad - containerRect.top);
    const maxTop = Math.min(
      containerRect.height - tooltipRect.height - containerPad,
      window.innerHeight - viewportPad - containerRect.top - tooltipRect.height
    );

    let chosenTop = aboveTop;
    if (aboveTop < minTop && belowTop <= maxTop) {
      chosenTop = belowTop;
    } else if (aboveTop < minTop && belowTop > maxTop) {
      chosenTop = Math.max(minTop, Math.min(Math.max(minTop, maxTop), aboveTop));
    } else {
      chosenTop = Math.max(minTop, Math.min(Math.max(minTop, maxTop), aboveTop));
    }

    setCoords({ left: clampedLeft, top: chosenTop, ready: true });
  }, [activeX, activeY, chartWidth, chartHeight]);

  useLayoutEffect(() => {
    updatePosition();
    window.addEventListener('resize', updatePosition);
    return () => window.removeEventListener('resize', updatePosition);
  }, [updatePosition, activeRecord.id, activeSummaries.length]);

  return (
    <div
      ref={tooltipRef}
      style={{
        left: `${coords.left}px`,
        top: `${coords.top}px`,
        visibility: coords.ready ? 'visible' : 'hidden',
      }}
      className="absolute pointer-events-none z-20 bg-gunmetal-card/95 border border-slate-600 p-2.5 sm:p-3 rounded-lg shadow-2xl text-xs backdrop-blur-md min-w-[195px] max-w-[calc(100vw-24px)]"
    >
      <div className="flex items-center justify-between gap-2 border-b border-gunmetal-border pb-1.5 mb-2 text-[11px] text-gunmetal-muted">
        <div className="flex items-center gap-2">
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
        {isTouchPinned && onDismiss && (
          <button
            type="button"
            onPointerDown={e => e.stopPropagation()}
            onClick={e => {
              e.stopPropagation();
              onDismiss();
            }}
            aria-label="Dismiss chart tooltip"
            className="pointer-events-auto -mr-1 -my-1 p-1.5 rounded text-gunmetal-muted hover:text-slate-100 hover:bg-gunmetal-canvas transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {isMultiAirlineMode && activeSummaries.length > 0 ? (
        <div className="space-y-1.5">
          {activeSummaries
            .sort((a, b) => a.price - b.price)
            .map((s, idx) => {
              const isFloor = idx === 0;
              const formattedTime = cleanDisplayTime(s.departureTime);

              return (
                <div
                  key={s.airline}
                  className={`flex items-center justify-between gap-2.5 text-xs px-2 py-1.5 rounded transition-colors ${
                    isFloor
                      ? 'bg-green-950/50 border border-green-800/50 font-bold'
                      : 'hover:bg-gunmetal-canvas'
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-1.5 min-w-0">
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
                    {s.origin && s.destination && (
                      <span className="inline-flex items-center gap-0.5 text-[10px] text-sky-400 font-mono font-medium">
                        <span>{s.origin}</span>
                        <ArrowRight className="w-2.5 h-2.5 text-gunmetal-muted flex-shrink-0" />
                        <span>{s.destination}</span>
                      </span>
                    )}
                    {formattedTime && (
                      <span className="text-[10px] text-gunmetal-muted">
                        {formattedTime}
                      </span>
                    )}
                    {s.flightCount > 1 && (
                      <span className="text-[9px] text-sky-400 bg-sky-950/60 px-1.5 py-0.2 rounded border border-sky-800/50 font-mono font-semibold">
                        {s.flightCount} dep
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 font-mono flex-shrink-0">
                    <span className={isFloor ? 'text-green-300' : 'text-slate-200'}>
                      {formatCurrency(s.price, currency)}
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
            <span>{formatCurrency(activeRecord.price, currency)}</span>
            <span
              className={`text-[10px] font-semibold ${
                activeDelta > 0 ? 'text-green-400' : activeDelta < 0 ? 'text-red-400' : 'text-slate-400'
              }`}
            >
              {activeDelta > 0
                ? `-${formatCurrency(activeDelta, currency)}`
                : activeDelta < 0
                ? `+${formatCurrency(Math.abs(activeDelta), currency)}`
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