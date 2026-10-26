'use client';

import { useState } from 'react';
import { PriceHistory } from '@/types';
import { formatCurrency } from '@/utils/format';

interface Props {
  history: PriceHistory[];
  baselinePrice: number;
  purchasePrice?: number | null;
}

export default function PriceChart({ history, baselinePrice, purchasePrice }: Props) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const isPurchased = purchasePrice !== null && purchasePrice !== undefined && purchasePrice > 0;
  const benchmarkPrice = isPurchased ? purchasePrice! : baselinePrice;
  const benchmarkLabel = isPurchased ? 'Paid' : 'Initial';

  // Filter valid checks and sort chronologically (oldest to newest)
  const sorted = [...history]
    .filter(h => typeof h.price === 'number' && h.price > 0 && h.status === 'Success')
    .sort((a, b) => new Date(a.checkedAt).getTime() - new Date(b.checkedAt).getTime());

  if (sorted.length === 0) {
    return (
      <div className="h-52 flex flex-col items-center justify-center border border-dashed border-gunmetal-border rounded-lg bg-gunmetal-canvas/40 text-gunmetal-muted text-xs">
        <p className="font-medium text-slate-300">No successful price points recorded yet</p>
        <p className="mt-1">Future automatic and manual checks will plot here.</p>
      </div>
    );
  }

  // Chart dimensions & margins
  const width = 740;
  const height = 230;
  const padLeft = 55;
  const padRight = 35;
  const padTop = 30;
  const padBottom = 35;
  const plotWidth = width - padLeft - padRight;
  const plotHeight = height - padTop - padBottom;

  // Price Y scale calculation (include benchmarkPrice to keep reference line inside bounds)
  const prices = sorted.map(d => d.price);
  if (benchmarkPrice > 0) prices.push(benchmarkPrice);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const priceRange = maxPrice - minPrice;
  const verticalPadding = priceRange === 0 ? (maxPrice * 0.1 || 20) : priceRange * 0.2;
  const yMin = Math.max(0, minPrice - verticalPadding);
  const yMax = maxPrice + verticalPadding;
  const yRange = yMax - yMin;

  const getY = (price: number) => {
    return padTop + plotHeight - ((price - yMin) / yRange) * plotHeight;
  };

  // Time X scale calculation with intraday anti-collision spacing
  const minTime = new Date(sorted[0].checkedAt).getTime();
  const maxTime = new Date(sorted[sorted.length - 1].checkedAt).getTime();
  const timeSpan = maxTime - minTime;

  const minGap = 32; // Minimum pixel gap to keep multiple checks on the same day clearly separated
  const xCoords: number[] = [];

  for (let i = 0; i < sorted.length; i++) {
    const t = new Date(sorted[i].checkedAt).getTime();
    const rawX = padLeft + (timeSpan > 0 ? ((t - minTime) / timeSpan) * plotWidth : plotWidth / 2);

    if (i === 0) {
      xCoords.push(rawX);
    } else {
      const prevX = xCoords[i - 1];
      xCoords.push(Math.max(rawX, prevX + minGap));
    }
  }

  // Re-scale into bounded plotting width if shifted by minGap
  const maxX = xCoords[xCoords.length - 1];
  if (maxX > padLeft + plotWidth) {
    const totalShifted = maxX - padLeft;
    for (let i = 0; i < xCoords.length; i++) {
      xCoords[i] = padLeft + ((xCoords[i] - padLeft) / totalShifted) * plotWidth;
    }
  }

  // Construct SVG Path
  const linePath = sorted
    .map((d, i) => `${i === 0 ? 'M' : 'L'} ${xCoords[i].toFixed(1)} ${getY(d.price).toFixed(1)}`)
    .join(' ');

  const areaPath = sorted.length > 1
    ? `${linePath} L ${xCoords[xCoords.length - 1].toFixed(1)} ${padTop + plotHeight} L ${xCoords[0].toFixed(1)} ${padTop + plotHeight} Z`
    : '';

  // Benchmark Reference line Y (Paid or Initial)
  const benchmarkY = benchmarkPrice > 0 ? getY(benchmarkPrice) : null;

  // Y-axis grid levels (4 ticks)
  const yTicks = [0, 0.33, 0.66, 1].map(ratio => yMin + yRange * ratio);

  // Active hovered point details
  const activeRecord = hoveredIndex !== null ? sorted[hoveredIndex] : null;
  const activeX = hoveredIndex !== null ? xCoords[hoveredIndex] : null;
  const activeY = activeRecord ? getY(activeRecord.price) : null;
  const activeDelta = activeRecord ? benchmarkPrice - activeRecord.price : 0;

  return (
    <div className="relative w-full overflow-hidden bg-gunmetal-canvas/60 border border-gunmetal-border rounded-lg p-3">
      {/* SVG Canvas */}
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto select-none"
        onMouseLeave={() => setHoveredIndex(null)}
      >
        <defs>
          <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Horizontal Grid Lines */}
        {yTicks.map((val, idx) => {
          const y = getY(val);
          return (
            <g key={idx}>
              <line
                x1={padLeft}
                y1={y}
                x2={padLeft + plotWidth}
                y2={y}
                stroke="#2d2d31"
                strokeDasharray="2 3"
                strokeWidth="1"
              />
              <text
                x={padLeft - 8}
                y={y + 3}
                fill="#9aa0a6"
                fontSize="10"
                textAnchor="end"
                fontFamily="sans-serif"
              >
                ${Math.round(val)}
              </text>
            </g>
          );
        })}

        {/* Benchmark Reference Line (Paid or Initial) */}
        {benchmarkY !== null && (
          <g>
            <line
              x1={padLeft}
              y1={benchmarkY}
              x2={padLeft + plotWidth}
              y2={benchmarkY}
              stroke="#94a3b8"
              strokeDasharray="4 4"
              strokeWidth="1.5"
              opacity="0.75"
            />
            <text
              x={padLeft + plotWidth}
              y={benchmarkY - 6}
              textAnchor="end"
              fill="#94a3b8"
              fontSize="10"
              fontWeight="600"
              fontFamily="sans-serif"
            >
              {benchmarkLabel}: {formatCurrency(benchmarkPrice)}
            </text>
          </g>
        )}

        {/* Gradient Area Fill */}
        {areaPath && <path d={areaPath} fill="url(#priceGradient)" />}

        {/* Price Trend Line */}
        {sorted.length > 1 && (
          <path
            d={linePath}
            fill="none"
            stroke="#38bdf8"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* Vertical Crosshair Line */}
        {activeX !== null && (
          <line
            x1={activeX}
            y1={padTop}
            x2={activeX}
            y2={padTop + plotHeight}
            stroke="#94a3b8"
            strokeDasharray="2 2"
            strokeWidth="1"
            opacity="0.8"
          />
        )}

        {/* Interactive Data Points */}
        {sorted.map((record, i) => {
          const cx = xCoords[i];
          const cy = getY(record.price);
          const isHovered = hoveredIndex === i;
          const isAllTimeLow = record.price === minPrice;

          return (
            <g key={record.id} className="cursor-pointer">
              <circle
                cx={cx}
                cy={cy}
                r={isHovered ? 6 : isAllTimeLow ? 4.5 : 3.5}
                fill={isHovered ? '#ffffff' : isAllTimeLow ? '#4ade80' : '#38bdf8'}
                stroke="#0f0f11"
                strokeWidth={isHovered ? 2.5 : 1.5}
                onMouseEnter={() => setHoveredIndex(i)}
              />
              {/* Invisible larger hover hit target */}
              <circle
                cx={cx}
                cy={cy}
                r={14}
                fill="transparent"
                onMouseEnter={() => setHoveredIndex(i)}
              />
            </g>
          );
        })}

        {/* Date Ticks on X-Axis */}
        {sorted.map((record, i) => {
          // Render tick label for first point, last point, or when day changes
          const prevRecord = i > 0 ? sorted[i - 1] : null;
          const currDate = new Date(record.checkedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          const prevDate = prevRecord ? new Date(prevRecord.checkedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : null;

          if (i === 0 || i === sorted.length - 1 || currDate !== prevDate) {
            return (
              <text
                key={record.id}
                x={xCoords[i]}
                y={padTop + plotHeight + 18}
                fill="#9aa0a6"
                fontSize="9"
                textAnchor="middle"
                fontFamily="sans-serif"
              >
                {currDate}
              </text>
            );
          }
          return null;
        })}
      </svg>

      {/* Dynamic Hover Tooltip */}
      {activeRecord && activeX !== null && activeY !== null && (
        <div
          className="absolute pointer-events-none z-10 bg-gunmetal-card/95 border border-slate-600 px-3 py-2 rounded-md shadow-xl text-xs backdrop-blur-sm transition-all"
          style={{
            left: `${Math.min(Math.max(activeX - 60, 10), width - 150)}px`,
            top: `${Math.max(activeY - 55, 10)}px`,
          }}
        >
          <div className="font-bold text-slate-100 flex items-center justify-between gap-3">
            <span>{formatCurrency(activeRecord.price)}</span>
            <span className={`text-[10px] font-semibold ${activeDelta > 0 ? 'text-green-400' : activeDelta < 0 ? 'text-red-400' : 'text-slate-400'}`}>
              {activeDelta > 0 ? `-${formatCurrency(activeDelta)}` : activeDelta < 0 ? `+${formatCurrency(Math.abs(activeDelta))}` : benchmarkLabel}
            </span>
          </div>
          <div className="text-[10px] text-gunmetal-muted mt-0.5">
            {new Date(activeRecord.checkedAt).toLocaleString('en-US', {
              month: 'short',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
              hour12: true,
            })}
          </div>
        </div>
      )}
    </div>
  );
}