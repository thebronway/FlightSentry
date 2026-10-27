'use client';

import { useState, useMemo } from 'react';
import { PriceHistory, SearchMode, RouteItinerary } from '@/types';
import { formatCurrency } from '@/utils/format';
import { getAirlineColor, getAirlineName, cleanDisplayTime } from '@/utils/airline';
import { parseHistoryItineraries } from '@/utils/routeIntelligence';

interface Props {
  history: PriceHistory[];
  baselinePrice: number;
  purchasePrice?: number | null;
  searchMode?: SearchMode;
}

interface CarrierCheckSummary {
  airline: string;
  price: number;
  flightNumber?: string;
  departureTime?: string;
  flightCount: number;
}

interface PlottedDot {
  id: string;
  checkIdx: number;
  airline: string;
  price: number;
  flightNumber?: string;
  departureTime?: string;
  flightCount: number;
  nominalX: number;
  nominalY: number;
  x: number;
  y: number;
  color: string;
  isFloor: boolean;
}

export default function PriceChart({ history, baselinePrice, purchasePrice, searchMode = 'Route' }: Props) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const isPurchased = purchasePrice !== null && purchasePrice !== undefined && purchasePrice > 0;
  const benchmarkPrice = isPurchased ? purchasePrice! : baselinePrice;
  const benchmarkLabel = isPurchased ? 'Paid' : 'Initial';

  // Filter valid checks and sort chronologically (oldest to newest)
  const sorted = useMemo(() => {
    return [...history]
      .filter(h => typeof h.price === 'number' && h.price > 0 && h.status === 'Success')
      .sort((a, b) => new Date(a.checkedAt).getTime() - new Date(b.checkedAt).getTime());
  }, [history]);

  // Extract all distinct operating airlines across all checks
  const allOperatingAirlines = useMemo(() => {
    const set = new Set<string>();
    sorted.forEach(h => {
      if (h.airline) set.add(h.airline.toUpperCase());
      const its = parseHistoryItineraries(h);
      its.forEach(it => {
        if (it.airline) set.add(it.airline.toUpperCase());
      });
    });
    return Array.from(set).sort();
  }, [sorted]);

  // Selected airlines for dynamic trendline toggling (defaults to all enabled)
  const [selectedAirlines, setSelectedAirlines] = useState<Record<string, boolean>>({});

  // Ensure newly discovered airlines are enabled by default
  const activeAirlines = useMemo(() => {
    const active: Record<string, boolean> = {};
    allOperatingAirlines.forEach(code => {
      active[code] = selectedAirlines[code] !== undefined ? selectedAirlines[code] : true;
    });
    return active;
  }, [allOperatingAirlines, selectedAirlines]);

  const toggleAirline = (code: string) => {
    setSelectedAirlines(prev => ({
      ...prev,
      [code]: prev[code] !== undefined ? !prev[code] : false,
    }));
  };

  const toggleAll = (enable: boolean) => {
    const updated: Record<string, boolean> = {};
    allOperatingAirlines.forEach(code => {
      updated[code] = enable;
    });
    setSelectedAirlines(updated);
  };

  // For each check, aggregate itineraries to 1 best-price entry per carrier
  const checkCarrierSummaries = useMemo(() => {
    return sorted.map(h => {
      const carrierMap: Record<string, CarrierCheckSummary> = {};
      const itineraries = parseHistoryItineraries(h);

      if (itineraries.length > 0) {
        itineraries.forEach(it => {
          const code = (it.airline || '').toUpperCase();
          if (!code || typeof it.price !== 'number' || it.price <= 0) return;

          if (!carrierMap[code]) {
            carrierMap[code] = {
              airline: code,
              price: it.price,
              flightNumber: it.flightNumber || undefined,
              departureTime: it.departureTime || undefined,
              flightCount: 1,
            };
          } else {
            carrierMap[code].flightCount += 1;
            if (it.price < carrierMap[code].price) {
              carrierMap[code].price = it.price;
              carrierMap[code].flightNumber = it.flightNumber || carrierMap[code].flightNumber;
              carrierMap[code].departureTime = it.departureTime || carrierMap[code].departureTime;
            }
          }
        });
      } else if (h.airline) {
        const code = h.airline.toUpperCase();
        carrierMap[code] = {
          airline: code,
          price: h.price,
          flightNumber: h.flightNumber || undefined,
          flightCount: 1,
        };
      }

      return carrierMap;
    });
  }, [sorted]);

  if (sorted.length === 0) {
    return (
      <div className="h-52 flex flex-col items-center justify-center border border-dashed border-gunmetal-border rounded-lg bg-gunmetal-canvas/40 text-gunmetal-muted text-xs">
        <p className="font-medium text-slate-300">No successful price points recorded yet</p>
        <p className="mt-1">Future automatic and manual checks will plot here.</p>
      </div>
    );
  }

  const isMultiAirlineMode = searchMode === 'Route' && allOperatingAirlines.length > 1;

  // Chart dimensions & margins
  const width = 740;
  const height = 250;
  const padLeft = 55;
  const padRight = 35;
  const padTop = 30;
  const padBottom = 35;
  const plotWidth = width - padLeft - padRight;
  const plotHeight = height - padTop - padBottom;

  // Compute all prices to scale Y axis appropriately
  const allPlottedPrices: number[] = [];
  sorted.forEach((d, idx) => {
    allPlottedPrices.push(d.price);
    if (isMultiAirlineMode) {
      const summaries = checkCarrierSummaries[idx];
      Object.values(summaries).forEach(s => {
        if (activeAirlines[s.airline]) {
          allPlottedPrices.push(s.price);
        }
      });
    }
  });
  if (benchmarkPrice > 0) allPlottedPrices.push(benchmarkPrice);

  const minPrice = Math.min(...allPlottedPrices);
  const maxPrice = Math.max(...allPlottedPrices);
  const priceRange = maxPrice - minPrice;
  const verticalPadding = priceRange === 0 ? (maxPrice * 0.1 || 20) : priceRange * 0.2;
  const yMin = Math.max(0, minPrice - verticalPadding);
  const yMax = maxPrice + verticalPadding;
  const yRange = yMax - yMin;

  const getY = (price: number) => {
    return padTop + plotHeight - ((price - yMin) / yRange) * plotHeight;
  };

  // Time X scale calculation with anti-collision spacing
  const minTime = new Date(sorted[0].checkedAt).getTime();
  const maxTime = new Date(sorted[sorted.length - 1].checkedAt).getTime();
  const timeSpan = maxTime - minTime;
  const minGap = 32;

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

  const maxX = xCoords[xCoords.length - 1];
  if (maxX > padLeft + plotWidth) {
    const totalShifted = maxX - padLeft;
    for (let i = 0; i < xCoords.length; i++) {
      xCoords[i] = padLeft + ((xCoords[i] - padLeft) / totalShifted) * plotWidth;
    }
  }

  // Construct SVG paths
  // 1. Overall route floor line
  const floorLinePath = sorted
    .map((d, i) => `${i === 0 ? 'M' : 'L'} ${xCoords[i].toFixed(1)} ${getY(d.price).toFixed(1)}`)
    .join(' ');

  const areaPath = !isMultiAirlineMode && sorted.length > 1
    ? `${floorLinePath} L ${xCoords[xCoords.length - 1].toFixed(1)} ${padTop + plotHeight} L ${xCoords[0].toFixed(1)} ${padTop + plotHeight} Z`
    : '';

  // 2. Multi-airline trendlines (connects each carrier's best fare across checks)
  const airlineSeries = allOperatingAirlines
    .filter(code => activeAirlines[code])
    .map(code => {
      const points: { x: number; y: number; price: number; checkIdx: number }[] = [];
      sorted.forEach((_, idx) => {
        const summary = checkCarrierSummaries[idx][code];
        if (summary) {
          points.push({
            x: xCoords[idx],
            y: getY(summary.price),
            price: summary.price,
            checkIdx: idx,
          });
        }
      });

      const pathString = points
        .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
        .join(' ');

      return {
        airline: code,
        color: getAirlineColor(code),
        points,
        pathString,
      };
    });

  // 3. Exactly 1 dot per carrier per check; horizontal dodge only when DIFFERENT carriers share the same fare
  const plottedDots: PlottedDot[] = [];

  sorted.forEach((record, checkIdx) => {
    const nominalX = xCoords[checkIdx];
    const summaries = checkCarrierSummaries[checkIdx];

    const candidates = isMultiAirlineMode
      ? Object.values(summaries).filter(s => activeAirlines[s.airline])
      : [
          {
            airline: record.airline || 'FL',
            price: record.price,
            flightNumber: record.flightNumber || undefined,
            departureTime: undefined,
            flightCount: 1,
          },
        ];

    // Group by exact price level
    const priceBuckets: Record<number, CarrierCheckSummary[]> = {};
    candidates.forEach(s => {
      if (!priceBuckets[s.price]) priceBuckets[s.price] = [];
      priceBuckets[s.price].push(s);
    });

    // Dodge competing airlines side-by-side with 14px gap (dots are 11px diameter)
    const dotSpacing = 14;
    Object.entries(priceBuckets).forEach(([priceStr, group]) => {
      const price = Number(priceStr);
      const nominalY = getY(price);
      const count = group.length;

      group.forEach((carrier, j) => {
        const xOffset = count > 1 ? (j - (count - 1) / 2) * dotSpacing : 0;
        plottedDots.push({
          id: `${carrier.airline}-${checkIdx}`,
          checkIdx,
          airline: carrier.airline,
          price: carrier.price,
          flightNumber: carrier.flightNumber,
          departureTime: carrier.departureTime,
          flightCount: carrier.flightCount,
          nominalX,
          nominalY,
          x: nominalX + xOffset,
          y: nominalY,
          color: getAirlineColor(carrier.airline),
          isFloor: carrier.price === record.price,
        });
      });
    });
  });

  const benchmarkY = benchmarkPrice > 0 ? getY(benchmarkPrice) : null;
  const yTicks = [0, 0.33, 0.66, 1].map(ratio => yMin + yRange * ratio);

  // Active hovered check details
  const activeRecord = hoveredIndex !== null ? sorted[hoveredIndex] : null;
  const activeX = hoveredIndex !== null ? xCoords[hoveredIndex] : null;
  const activeY = activeRecord ? getY(activeRecord.price) : null;
  const activeDelta = activeRecord ? benchmarkPrice - activeRecord.price : 0;
  const activeSummaries = hoveredIndex !== null
    ? Object.values(checkCarrierSummaries[hoveredIndex]).filter(
        s => !isMultiAirlineMode || activeAirlines[s.airline]
      )
    : [];

  return (
    <div className="space-y-3">
      {/* Interactive Carrier Filter Pill Bar (City-Pair Route Searches) */}
      {isMultiAirlineMode && (
        <div className="flex flex-wrap items-center justify-between gap-2 bg-gunmetal-canvas/70 border border-gunmetal-border p-2.5 rounded-lg text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mr-1 select-none">
              Airlines:
            </span>
            {allOperatingAirlines.map(code => {
              const isSelected = activeAirlines[code];
              const brandColor = getAirlineColor(code);
              return (
                <button
                  key={code}
                  type="button"
                  onClick={() => toggleAirline(code)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all border ${
                    isSelected
                      ? 'bg-gunmetal-card text-white border-slate-600 shadow-sm'
                      : 'bg-gunmetal-canvas text-gunmetal-muted border-gunmetal-border/60 opacity-40 hover:opacity-75'
                  }`}
                  style={{
                    borderLeftColor: isSelected ? brandColor : undefined,
                    borderLeftWidth: isSelected ? '3px' : undefined,
                  }}
                >
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: brandColor }}
                  />
                  <span>{code}</span>
                  <span className="text-[10px] text-gunmetal-muted font-normal hidden sm:inline">
                    {getAirlineName(code).replace(/ (Air Lines|Airlines|Airways|Air)$/i, '')}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2 text-[11px] text-gunmetal-muted ml-auto">
            <button
              type="button"
              onClick={() => toggleAll(true)}
              className="hover:text-slate-200 transition-colors"
            >
              All
            </button>
            <span>•</span>
            <button
              type="button"
              onClick={() => toggleAll(false)}
              className="hover:text-slate-200 transition-colors"
            >
              None
            </button>
          </div>
        </div>
      )}

      {/* SVG Canvas Container */}
      <div className="relative w-full overflow-hidden bg-gunmetal-canvas/60 border border-gunmetal-border rounded-lg p-3">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto select-none"
          onMouseLeave={() => setHoveredIndex(null)}
        >
          <defs>
            <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.25" />
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

          {/* Single Mode Gradient Fill */}
          {areaPath && <path d={areaPath} fill="url(#priceGradient)" />}

          {/* Overall Route Floor Reference Line */}
          {sorted.length > 1 && (
            <path
              d={floorLinePath}
              fill="none"
              stroke={isMultiAirlineMode ? '#64748b' : '#38bdf8'}
              strokeWidth={isMultiAirlineMode ? '1.5' : '2.5'}
              strokeDasharray={isMultiAirlineMode ? '3 3' : undefined}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={isMultiAirlineMode ? 0.6 : 1}
            />
          )}

          {/* Multi-Airline Distinct Trendlines */}
          {isMultiAirlineMode &&
            airlineSeries.map(series => {
              if (series.points.length <= 1) return null;
              return (
                <path
                  key={series.airline}
                  d={series.pathString}
                  fill="none"
                  stroke={series.color}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity={0.9}
                />
              );
            })}

          {/* Vertical Crosshair Line on Hover */}
          {activeX !== null && (
            <line
              x1={activeX}
              y1={padTop}
              x2={activeX}
              y2={padTop + plotHeight}
              stroke="#94a3b8"
              strokeDasharray="2 2"
              strokeWidth="1"
              opacity="0.85"
            />
          )}

          {/* Interactive Data Points (Enlarged & Side-by-Side Dodged for Colliding Fares) */}
          {plottedDots.map(dot => {
            const isHoveredCheck = hoveredIndex === dot.checkIdx;
            return (
              <g key={dot.id} className="cursor-pointer">
                {/* Visual Circle (Radius 5.5 normal, 7.5 on hover) */}
                <circle
                  cx={dot.x}
                  cy={dot.y}
                  r={isHoveredCheck ? 7.5 : 5.5}
                  fill={isMultiAirlineMode ? dot.color : (isHoveredCheck ? '#ffffff' : dot.isFloor ? '#4ade80' : '#38bdf8')}
                  stroke="#0f0f11"
                  strokeWidth={isHoveredCheck ? 2.5 : 1.5}
                  className="transition-all duration-150"
                  onMouseEnter={() => setHoveredIndex(dot.checkIdx)}
                />
              </g>
            );
          })}

          {/* Invisible Full-Height Hover Hit Bars for Synchronized Scrubbing */}
          {sorted.map((_, i) => (
            <rect
              key={i}
              x={i === 0 ? padLeft : (xCoords[i] + xCoords[i - 1]) / 2}
              y={padTop}
              width={
                i === sorted.length - 1
                  ? padLeft + plotWidth - (xCoords[i] + (xCoords[i - 1] || padLeft)) / 2
                  : (xCoords[i + 1] - (xCoords[i - 1] || padLeft)) / 2
              }
              height={plotHeight}
              fill="transparent"
              className="cursor-pointer"
              onMouseEnter={() => setHoveredIndex(i)}
            />
          ))}

          {/* Date Ticks on X-Axis */}
          {sorted.map((record, i) => {
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

        {/* Synchronized Crosshair Tooltip with Multi-Airline Comparison Badge */}
        {activeRecord && activeX !== null && activeY !== null && (
          <div
            className="absolute pointer-events-none z-20 bg-gunmetal-card/95 border border-slate-600 p-3 rounded-lg shadow-2xl text-xs backdrop-blur-md min-w-[210px]"
            style={{
              left: `${Math.min(Math.max(activeX - 105, 12), width - 235)}px`,
              top: `${Math.max(activeY - 80, 10)}px`,
            }}
          >
            {/* Timestamp Header */}
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

            {/* Multi-Airline Price Comparison List (1 Clean Entry Per Operating Airline) */}
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
              /* Single-Flight Tooltip Fallback */
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
        )}
      </div>
    </div>
  );
}