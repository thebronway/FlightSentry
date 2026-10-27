'use client';

import { useState, useMemo } from 'react';
import { PriceHistory, SearchMode } from '@/types';
import { CarrierCheckSummary, PlottedDot, AirlineSeries } from './types';
import { parseHistoryItineraries } from '@/utils/routeIntelligence';
import { getAirlineColor } from '@/utils/airline';

interface ScaleParams {
  history: PriceHistory[];
  baselinePrice: number;
  purchasePrice?: number | null;
  searchMode?: SearchMode;
}

export function usePriceChartScales({
  history,
  baselinePrice,
  purchasePrice,
  searchMode = 'Route',
}: ScaleParams) {
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

  const [selectedAirlines, setSelectedAirlines] = useState<Record<string, boolean>>({});

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

  const minPrice = allPlottedPrices.length > 0 ? Math.min(...allPlottedPrices) : 0;
  const maxPrice = allPlottedPrices.length > 0 ? Math.max(...allPlottedPrices) : 100;
  const priceRange = maxPrice - minPrice;
  const verticalPadding = priceRange === 0 ? (maxPrice * 0.1 || 20) : priceRange * 0.2;
  const yMin = Math.max(0, minPrice - verticalPadding);
  const yMax = maxPrice + verticalPadding;
  const yRange = yMax - yMin;

  const getY = (price: number) => {
    if (yRange <= 0) return padTop + plotHeight / 2;
    return padTop + plotHeight - ((price - yMin) / yRange) * plotHeight;
  };

  // Time X scale calculation with anti-collision spacing
  const minTime = sorted.length > 0 ? new Date(sorted[0].checkedAt).getTime() : 0;
  const maxTime = sorted.length > 0 ? new Date(sorted[sorted.length - 1].checkedAt).getTime() : 0;
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

  const maxX = xCoords[xCoords.length - 1] || padLeft;
  if (maxX > padLeft + plotWidth) {
    const totalShifted = maxX - padLeft;
    for (let i = 0; i < xCoords.length; i++) {
      xCoords[i] = padLeft + ((xCoords[i] - padLeft) / totalShifted) * plotWidth;
    }
  }

  // Construct SVG paths
  const floorLinePath = sorted
    .map((d, i) => `${i === 0 ? 'M' : 'L'} ${xCoords[i].toFixed(1)} ${getY(d.price).toFixed(1)}`)
    .join(' ');

  const areaPath = !isMultiAirlineMode && sorted.length > 1
    ? `${floorLinePath} L ${xCoords[xCoords.length - 1].toFixed(1)} ${padTop + plotHeight} L ${xCoords[0].toFixed(1)} ${padTop + plotHeight} Z`
    : '';

  const airlineSeries: AirlineSeries[] = allOperatingAirlines
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

  // Exactly 1 dot per carrier per check; horizontal dodge for identical fares
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

    const priceBuckets: Record<number, CarrierCheckSummary[]> = {};
    candidates.forEach(s => {
      if (!priceBuckets[s.price]) priceBuckets[s.price] = [];
      priceBuckets[s.price].push(s);
    });

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

  return {
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
  };
}