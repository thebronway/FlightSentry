'use client';

import { PriceChartProps } from './priceChart/types';
import { usePriceChartScales } from './priceChart/usePriceChartScales';
import CarrierFilterPills from './priceChart/CarrierFilterPills';
import ChartScrubberTooltip from './priceChart/ChartScrubberTooltip';

export default function PriceChart({
  history,
  baselinePrice,
  purchasePrice,
  searchMode = 'Route',
}: PriceChartProps) {
  const {
    sorted,
    allOperatingAirlines,
    activeAirlines,
    toggleAirline,
    toggleAll,
    isMultiAirlineMode,
    width,
    height,
    padLeft,
    padTop,
    plotWidth,
    plotHeight,
    getY,
    xCoords,
    yTicks,
    benchmarkY,
    benchmarkPrice,
    benchmarkLabel,
    areaPath,
    floorLinePath,
    airlineSeries,
    plottedDots,
    hoveredIndex,
    setHoveredIndex,
    activeRecord,
    activeX,
    activeY,
    activeDelta,
    activeSummaries,
  } = usePriceChartScales({
    history,
    baselinePrice,
    purchasePrice,
    searchMode,
  });

  if (sorted.length === 0) {
    return (
      <div className="h-52 flex flex-col items-center justify-center border border-dashed border-gunmetal-border rounded-lg bg-gunmetal-canvas/40 text-gunmetal-muted text-xs">
        <p className="font-medium text-slate-300">No successful price points recorded yet</p>
        <p className="mt-1">Future automatic and manual checks will plot here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {isMultiAirlineMode && (
        <CarrierFilterPills
          allOperatingAirlines={allOperatingAirlines}
          activeAirlines={activeAirlines}
          onToggleAirline={toggleAirline}
          onToggleAll={toggleAll}
        />
      )}

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
                {benchmarkLabel}: ${Math.round(benchmarkPrice)}
              </text>
            </g>
          )}

          {areaPath && <path d={areaPath} fill="url(#priceGradient)" />}

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

          {plottedDots.map(dot => {
            const isHoveredCheck = hoveredIndex === dot.checkIdx;
            return (
              <g key={dot.id} className="cursor-pointer">
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

        {activeRecord && activeX !== null && activeY !== null && (
          <ChartScrubberTooltip
            activeRecord={activeRecord}
            activeX={activeX}
            activeY={activeY}
            activeDelta={activeDelta}
            benchmarkLabel={benchmarkLabel}
            isMultiAirlineMode={isMultiAirlineMode}
            activeSummaries={activeSummaries}
            chartWidth={width}
          />
        )}
      </div>
    </div>
  );
}