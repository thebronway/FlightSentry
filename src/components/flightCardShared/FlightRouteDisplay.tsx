'use client';

import { Fragment } from 'react';
import { Flight } from '@/types';
import { ArrowRight } from 'lucide-react';
import { getAirlineTheme, getOperatingAirlines } from '@/utils/airline';
import { resolveLocationDisplay } from '@/utils/coLocations';
import { parseFlightLegs, getLayoverAirports } from '@/utils/flightLegs';
import AirlineBadge from '../common/AirlineBadge';
import Tooltip from '../common/Tooltip';

interface FlightRouteDisplayProps {
  flight: Flight;
  variant?: 'card' | 'condensed';
  showOperatingAirlines?: boolean;
}

export default function FlightRouteDisplay({
  flight,
  variant = 'card',
  showOperatingAirlines = true,
}: FlightRouteDisplayProps) {
  const isFlightNumMode = flight.searchMode === 'FlightNumber' && Boolean(flight.flightNumber);
  const originDisplay = resolveLocationDisplay(flight.origin);
  const destDisplay = resolveLocationDisplay(flight.destination);
  const isCondensed = variant === 'condensed';
  const operatingAirlines = getOperatingAirlines(flight);

  if (isFlightNumMode) {
    const trackedLegs = parseFlightLegs(flight.legs);
    if (trackedLegs.length >= 2) {
      const layovers = getLayoverAirports(trackedLegs);
      const airportChain = [trackedLegs[0].origin, ...trackedLegs.map(l => l.destination)];
      return (
        <div>
          <div className="flex flex-wrap items-center gap-1.5">
            {trackedLegs.map((leg, idx) => {
              const legTheme = getAirlineTheme(leg.airline);
              return (
                <Fragment key={`${leg.airline}-${leg.flightNumber}-${idx}`}>
                  {idx > 0 && (
                    <ArrowRight className={`${isCondensed ? 'w-2.5 h-2.5' : 'w-3 h-3'} text-gunmetal-muted flex-shrink-0`} />
                  )}
                  <span
                    className={`inline-flex items-center rounded-lg border shadow-sm font-sans font-bold ${
                      isCondensed
                        ? 'gap-1 px-1.5 py-0.5 text-[11px]'
                        : 'gap-1.5 px-2.5 py-1 text-xs sm:text-sm'
                    }`}
                    style={{
                      backgroundColor: `${legTheme.color}15`,
                      borderColor: `${legTheme.color}60`,
                    }}
                  >
                    <span
                      className={`rounded-full flex-shrink-0 ${isCondensed ? 'w-1.5 h-1.5' : 'w-2 h-2'}`}
                      style={{ backgroundColor: legTheme.color }}
                    />
                    <span className="text-slate-100">{isCondensed ? legTheme.code : legTheme.shortName}</span>
                    <span className="font-mono font-black" style={{ color: legTheme.color }}>
                      {leg.flightNumber}
                    </span>
                  </span>
                </Fragment>
              );
            })}
            {flight.bookingAirline && flight.bookingAirline !== trackedLegs[0].airline && (
              <span
                className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-gunmetal-canvas border border-gunmetal-border text-slate-300 whitespace-nowrap"
                title={`Booked via ${flight.bookingAirline}`}
              >
                Booked via {flight.bookingAirline}
              </span>
            )}
          </div>

          <div className={`text-xs text-gunmetal-muted flex flex-wrap items-center gap-1.5 ${isCondensed ? 'mt-1' : 'mt-1.5'}`}>
            {!isCondensed && (
              <>
                <span className="text-xs text-gunmetal-muted font-medium">{flight.departureDate}</span>
                <span className="text-xs text-gunmetal-muted">•</span>
              </>
            )}

            <div className="inline-flex flex-wrap items-center gap-1">
              {airportChain.map((code, idx) => {
                const isLayoverStop = idx > 0 && idx < airportChain.length - 1;
                return (
                  <Fragment key={`${code}-${idx}`}>
                    {idx > 0 && (
                      <ArrowRight className="w-3 h-3 text-gunmetal-muted flex-shrink-0" />
                    )}
                    <span
                      className={`rounded font-mono font-bold shadow-sm ${
                        isLayoverStop
                          ? 'bg-sky-950/60 border border-sky-700/60 text-sky-300'
                          : 'bg-slate-800/90 border border-sky-700/60 text-slate-100'
                      } ${isCondensed ? 'px-1.5 py-0.5 text-[11px]' : 'px-1.5 py-0.5 text-xs'}`}
                    >
                      {code}
                    </span>
                  </Fragment>
                );
              })}
            </div>

            {layovers.length > 0 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded border text-[10px] font-semibold bg-sky-950/60 text-sky-300 border-sky-800/60">
                {layovers.length} {layovers.length === 1 ? 'stop' : 'stops'} · {layovers.join(', ')}
              </span>
            )}

            {isCondensed && flight.pnr && <span>• PNR: {flight.pnr}</span>}
          </div>
        </div>
      );
    }

    const theme = getAirlineTheme(flight.airline);
    return (
      <div>
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center rounded-lg border shadow-sm font-sans font-bold ${
              isCondensed
                ? 'gap-1.5 px-2 py-0.5 text-xs'
                : 'gap-2 px-3 py-1 text-base'
            }`}
            style={{
              backgroundColor: `${theme.color}15`,
              borderColor: `${theme.color}60`,
            }}
          >
            <span
              className={`rounded-full flex-shrink-0 ${isCondensed ? 'w-2 h-2' : 'w-2.5 h-2.5'}`}
              style={{ backgroundColor: theme.color }}
            />
            <span className="text-slate-100">{theme.shortName}</span>
            <span className="font-mono font-black" style={{ color: theme.color }}>
              {flight.flightNumber}
            </span>
          </span>
          {flight.bookingAirline && flight.bookingAirline !== flight.airline && (
            <span
              className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-gunmetal-canvas border border-gunmetal-border text-slate-300 whitespace-nowrap"
              title={`Operated by ${flight.airline}, booked via ${flight.bookingAirline}`}
            >
              Booked via {flight.bookingAirline}
            </span>
          )}
        </div>

        <div className={`text-xs text-gunmetal-muted flex flex-wrap items-center gap-1.5 ${isCondensed ? 'mt-1' : 'mt-1.5'}`}>
          {!isCondensed && (
            <>
              <span className="text-xs text-gunmetal-muted font-medium">{flight.departureDate}</span>
              {flight.origin && flight.destination && <span className="text-xs text-gunmetal-muted">•</span>}
            </>
          )}

          {flight.origin && flight.destination && (
            <div className="inline-flex items-center gap-1.5">
              {originDisplay.isCluster && originDisplay.tooltipText ? (
                <Tooltip content={originDisplay.tooltipText} align="left">
                  <span className={`rounded font-mono font-bold shadow-sm cursor-help bg-sky-950/60 border border-sky-500/70 text-sky-200 ${
                    isCondensed ? 'px-2 py-0.5 text-xs' : 'px-1.5 py-0.5 text-xs'
                  }`}>
                    {originDisplay.code}
                  </span>
                </Tooltip>
              ) : (
                <span className={`rounded font-mono font-bold shadow-sm bg-slate-800/90 border border-sky-700/60 text-slate-100 ${
                  isCondensed ? 'px-2 py-0.5 text-xs' : 'px-1.5 py-0.5 text-xs'
                }`}>
                  {originDisplay.code}
                </span>
              )}

              <ArrowRight className="w-3 h-3 text-gunmetal-muted flex-shrink-0" />

              {destDisplay.isCluster && destDisplay.tooltipText ? (
                <Tooltip content={destDisplay.tooltipText} align="center">
                  <span className={`rounded font-mono font-bold shadow-sm cursor-help bg-sky-950/60 border border-sky-500/70 text-sky-200 ${
                    isCondensed ? 'px-2 py-0.5 text-xs' : 'px-1.5 py-0.5 text-xs'
                  }`}>
                    {destDisplay.code}
                  </span>
                </Tooltip>
              ) : (
                <span className={`rounded font-mono font-bold shadow-sm bg-slate-800/90 border border-sky-700/60 text-slate-100 ${
                  isCondensed ? 'px-2 py-0.5 text-xs' : 'px-1.5 py-0.5 text-xs'
                }`}>
                  {destDisplay.code}
                </span>
              )}
            </div>
          )}

          {isCondensed && flight.pnr && <span>• PNR: {flight.pnr}</span>}
        </div>
      </div>
    );
  }

  // Route Mode
  return (
    <div>
      <div className="flex items-center gap-2">
        {originDisplay.isCluster && originDisplay.tooltipText ? (
          <Tooltip content={originDisplay.tooltipText} align="left">
            <span className={`rounded font-mono shadow-sm cursor-help bg-sky-950/60 border border-sky-500/70 text-sky-200 ${
              isCondensed ? 'px-2 py-0.5 font-bold text-xs' : 'px-3 py-1 font-black text-lg rounded-lg'
            }`}>
              {originDisplay.code}
            </span>
          </Tooltip>
        ) : (
          <span className={`rounded font-mono shadow-sm bg-slate-800/90 border border-sky-700/60 text-slate-100 ${
            isCondensed ? 'px-2 py-0.5 font-bold text-xs' : 'px-3 py-1 font-black text-lg rounded-lg'
          }`}>
            {originDisplay.code}
          </span>
        )}

        <ArrowRight className={`${isCondensed ? 'w-3 h-3' : 'w-4 h-4'} text-gunmetal-muted flex-shrink-0`} />

        {destDisplay.isCluster && destDisplay.tooltipText ? (
          <Tooltip content={destDisplay.tooltipText} align="center">
            <span className={`rounded font-mono shadow-sm cursor-help bg-sky-950/60 border border-sky-500/70 text-sky-200 ${
              isCondensed ? 'px-2 py-0.5 font-bold text-xs' : 'px-3 py-1 font-black text-lg rounded-lg'
            }`}>
              {destDisplay.code}
            </span>
          </Tooltip>
        ) : (
          <span className={`rounded font-mono shadow-sm bg-slate-800/90 border border-sky-700/60 text-slate-100 ${
            isCondensed ? 'px-2 py-0.5 font-bold text-xs' : 'px-3 py-1 font-black text-lg rounded-lg'
          }`}>
            {destDisplay.code}
          </span>
        )}
      </div>

      {!isCondensed && (
        <p className="text-xs text-gunmetal-muted font-medium mt-1.5">
          {flight.departureDate}
        </p>
      )}

      {isCondensed && showOperatingAirlines && (
        <div className="text-xs text-gunmetal-muted flex flex-wrap items-center gap-1 mt-1">
          {operatingAirlines.length > 0 ? (
            operatingAirlines.map((code, idx) => (
              <AirlineBadge
                key={code}
                code={code}
                size="xs"
                showFlightNumber={false}
                align={idx === 0 ? 'left' : 'center'}
              />
            ))
          ) : flight.airline ? (
            <AirlineBadge code={flight.airline} size="xs" showFlightNumber={false} align="left" />
          ) : flight.includedAirlines ? (
            <span>{flight.includedAirlines}</span>
          ) : (
            <span>All Airlines</span>
          )}
          {flight.pnr && <span>• PNR: {flight.pnr}</span>}
        </div>
      )}
    </div>
  );
}