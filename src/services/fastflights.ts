import { Flight, RouteItinerary } from '../types';
import { DataSourceResult } from './datasource';
import { fetchFlightsHtml, parse, createQuery, Passengers, Integration, CaptchaError, HttpError, type Query, type IntegrationOptions } from 'fast-flights-ts';
import { normalizeAirlineCode, getAirlineName, cleanFlightNumber, expandAlliancesToAirlines } from '../utils/airline';
import { filterItinerariesBySearchPreferences } from '../utils/routeIntelligence';
import { resolveToAirportList } from '../utils/coLocations';

const formatSimpleDatetime = (dt: any): string | undefined => {
  if (!dt) return undefined;
  if (typeof dt === 'string') {
    const trimmed = dt.trim();
    return trimmed && !trimmed.includes('undefined') ? trimmed : undefined;
  }
  if (typeof dt === 'object') {
    let timeStr = '';
    // fast-flights-ts returns time as [hour, minute]
    if (Array.isArray(dt.time) && dt.time.length >= 2) {
      const h = Number(dt.time[0]);
      const m = Number(dt.time[1]);
      if (!isNaN(h) && !isNaN(m)) {
        timeStr = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
      }
    } else if (typeof dt.time === 'string' && dt.time.trim() && !dt.time.includes('undefined')) {
      timeStr = dt.time.trim();
    } else if (dt.hours !== undefined || dt.hour !== undefined) {
      const h = Number(dt.hours ?? dt.hour);
      const m = Number(dt.minutes ?? dt.minute ?? 0);
      if (!isNaN(h)) {
        timeStr = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
      }
    }

    let dateStr = '';
    if (Array.isArray(dt.date) && dt.date.length >= 3) {
      dateStr = `${dt.date[0]}-${String(dt.date[1]).padStart(2, '0')}-${String(dt.date[2]).padStart(2, '0')}`;
    } else if (typeof dt.date === 'string' && dt.date.trim() && !dt.date.includes('undefined')) {
      dateStr = dt.date.trim();
    }

    const combined = [dateStr, timeStr].filter(Boolean).join(' ');
    return combined || undefined;
  }
  return undefined;
};

class GoogleFlightsHtmlIntegration extends Integration {
  async fetchHtml(q: Query | string, opts?: IntegrationOptions): Promise<string> {
    const targetUrl = typeof q === 'string' ? q : q.url();
    const res = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        Cookie: 'SOCS=CAESHAgBEhJnd3NfMjAyMzA4MTAtMF9SQzIaAmVuIAEaBgiAo_CmBg; CONSENT=YES+cb.20210720-07-p0.en+FX+410',
      },
      signal: opts?.signal ?? AbortSignal.timeout(opts?.timeout ?? 15000),
    });

    const html = await res.text();

    if (
      res.status === 429 ||
      res.url.includes('consent.google.com') ||
      html.includes('unusual traffic') ||
      html.includes('/sorry/index')
    ) {
      throw new CaptchaError(html.length);
    }

    if (!res.ok) {
      throw new HttpError(res.status, html.length, `Google Flights HTTP ${res.status}`);
    }

    return html;
  }
}

const googleFlightsHtmlIntegration = new GoogleFlightsHtmlIntegration();

const parseDs1Itineraries = (html: string): any[] => {
  const classMarker = 'class="ds:1"';
  const classIdx = html.indexOf(classMarker);
  if (classIdx !== -1) {
    const tagClose = html.indexOf('>', classIdx + classMarker.length);
    const endIdx = tagClose !== -1 ? html.indexOf('</script>', tagClose + 1) : -1;
    if (tagClose !== -1 && endIdx !== -1) {
      const js = html.slice(tagClose + 1, endIdx);
      const dataIdx = js.indexOf('data:');
      const lastComma = js.lastIndexOf(',');
      if (dataIdx !== -1 && lastComma > dataIdx + 5) {
        try {
          const payload = JSON.parse(js.slice(dataIdx + 5, lastComma));
          if (Array.isArray(payload)) {
            const rawBuckets = [
              ...(Array.isArray(payload[2]?.[0]) ? payload[2][0] : []),
              ...(Array.isArray(payload[3]?.[0]) ? payload[3][0] : []),
            ];
            const parsed: any[] = [];
            for (const k of rawBuckets) {
              const flightArr = k?.[0];
              if (!Array.isArray(flightArr)) continue;
              const price = k?.[1]?.[0]?.[1] ?? 0;
              const airlineNames = Array.isArray(flightArr[1]) ? flightArr[1] : [];
              const rawLegs = Array.isArray(flightArr[2]) ? flightArr[2] : [];
              const legs = rawLegs
                .filter((sf: any) => Array.isArray(sf))
                .map((sf: any) => {
                  const carrierInfo = Array.isArray(sf[22]) ? sf[22] : [];
                  const legCarrierCode = typeof carrierInfo[0] === 'string' ? carrierInfo[0].trim() : '';
                  const legFlightNum = carrierInfo[1] !== undefined && carrierInfo[1] !== null ? String(carrierInfo[1]).trim() : '';
                  const legCarrierName = typeof carrierInfo[3] === 'string' ? carrierInfo[3].trim() : '';
                  return {
                    airline: legCarrierCode || legCarrierName || airlineNames[0] || '',
                    flight_number: legFlightNum,
                    from_airport: { code: sf[3] ?? '', name: sf[4] ?? '' },
                    to_airport: { code: sf[6] ?? '', name: sf[5] ?? '' },
                    departure: {
                      date: sf[20] ?? [0, 0, 0],
                      time: [sf[8]?.[0] ?? 0, sf[8]?.[1] ?? 0],
                    },
                    arrival: {
                      date: sf[21] ?? [0, 0, 0],
                      time: [sf[10]?.[0] ?? 0, sf[10]?.[1] ?? 0],
                    },
                    duration: typeof sf[11] === 'number' ? sf[11] : 0,
                    plane_type: sf[17] ?? '',
                  };
                });

              parsed.push({
                type: flightArr[0] ?? '',
                price,
                airlines: airlineNames,
                total_duration: typeof flightArr[9] === 'number' ? flightArr[9] : undefined,
                flights: legs,
              });
            }
            if (parsed.length > 0) {
              return parsed;
            }
          }
        } catch {
          // Fall back to fast-flights-ts built-in parser
        }
      }
    }
  }

  return Array.from(parse(html));
};

export const checkFastFlightsPrice = async (
  flight: Flight,
  currency: string = 'USD'
): Promise<DataSourceResult> => {
  try {
    const fastFlightsSeatMap: Record<string, 'economy' | 'premium-economy' | 'business' | 'first'> = {
      economy: 'economy',
      premium_economy: 'premium-economy',
      business: 'business',
      first: 'first',
    };
    const seat = fastFlightsSeatMap[flight.cabinClass || 'economy'] || 'economy';

    const origins = resolveToAirportList(flight.origin);
    const destinations = resolveToAirportList(flight.destination);

    const fromList = origins.length > 0 ? origins : [flight.origin || ''];
    const toList = destinations.length > 0 ? destinations : [flight.destination || ''];

    const results: any[] = [];
    const pairErrors: string[] = [];

    for (const fromAirport of fromList) {
      for (const toAirport of toList) {
        try {
          const query = createQuery({
            flights: [
              { 
                date: flight.departureDate, 
                from_airport: fromAirport, 
                to_airport: toAirport 
              }
            ],
            seat,
            trip: 'one-way',
            passengers: new Passengers({ adults: 1 }),
            max_stops: flight.searchMode === 'Route' && flight.maxStops !== undefined && flight.maxStops !== null ? flight.maxStops : undefined,
            language: 'en-US',
            currency: (currency || 'USD') as any,
          });

          const html = await fetchFlightsHtml(query, {
            integration: googleFlightsHtmlIntegration,
            timeout: 15000,
            maxRetries: 1,
            retryDelay: 2000,
          });
          const legResults = parseDs1Itineraries(html);
          console.log(`[FastFlights] Pair ${fromAirport} -> ${toAirport} returned ${legResults.length} itineraries`);
          if (Array.isArray(legResults) && legResults.length > 0) {
            results.push(...legResults);
          }
        } catch (pairErr: any) {
          const msg = pairErr?.message || String(pairErr);
          console.warn(`[FastFlights] Pair ${fromAirport} -> ${toAirport} failed:`, msg);
          pairErrors.push(msg);
        }
      }
    }

    if (!results || results.length === 0) {
      if (pairErrors.length > 0) {
        const sampleError = pairErrors[0].toLowerCase();
        if (
          sampleError.includes('429') ||
          sampleError.includes('captcha') ||
          sampleError.includes('unusual traffic') ||
          sampleError.includes('consent') ||
          sampleError.includes('blocked')
        ) {
          return {
            price: null,
            status: 'RateLimited',
            errorMessage: `Google Flights anti-bot / CAPTCHA challenge detected (${pairErrors[0]})`,
          };
        }
        if (sampleError.includes('missing flight data at') || sampleError.includes('rpc response missing')) {
          return {
            price: null,
            status: 'Error',
            errorMessage: `Google Flights RPC response missing flight payload (${pairErrors[0]})`,
          };
        }
        return {
          price: null,
          status: 'Error',
          errorMessage: `Fast-Flights scraper query failed: ${pairErrors[0]}`,
        };
      }
      return { price: null, status: 'SoldOut', errorMessage: 'Upstream search returned 0 available flight itineraries for this route/date' };
    }

    const parsedItineraries: RouteItinerary[] = results
      .filter((f: any) => typeof f.price === 'number' && f.price > 0)
      .map((f: any) => {
        const firstLeg = f.flights?.[0] || {};
        const lastLeg = f.flights?.[f.flights.length - 1] || firstLeg;
        const rawAirline = (Array.isArray(f.airlines) && f.airlines[0]) ? f.airlines[0] : (firstLeg.airline || '');
        const rawFlightNum = (firstLeg.flight_number || firstLeg.flightNumber || '').toString();
        const code = normalizeAirlineCode(rawAirline, rawFlightNum);
        const flightNum = cleanFlightNumber(rawFlightNum, code);
        const stops = Math.max(0, (f.flights?.length || 1) - 1);

        const departureTime = formatSimpleDatetime(firstLeg.departure) || firstLeg.departure_time;
        const arrivalTime = formatSimpleDatetime(lastLeg.arrival) || lastLeg.arrival_time;

        const rawDep = typeof firstLeg.from_airport === 'string'
          ? firstLeg.from_airport
          : firstLeg.from_airport?.code || firstLeg.departure_airport?.id;
        const rawArr = typeof lastLeg.to_airport === 'string'
          ? lastLeg.to_airport
          : lastLeg.to_airport?.code || lastLeg.arrival_airport?.id;
        const legOrigin = typeof rawDep === 'string' && rawDep.trim().length === 3 ? rawDep.trim().toUpperCase() : undefined;
        const legDestination = typeof rawArr === 'string' && rawArr.trim().length === 3 ? rawArr.trim().toUpperCase() : undefined;

        const layoverAirports = (f.flights && f.flights.length > 1)
          ? f.flights.slice(0, -1).map((leg: any) => {
              const arr = typeof leg.to_airport === 'string'
                ? leg.to_airport
                : leg.to_airport?.code || leg.arrival_airport?.id || '';
              return arr.trim().toUpperCase();
            }).filter((c: string) => c.length === 3)
          : undefined;

        const summedLegMins = Array.isArray(f.flights)
          ? f.flights.reduce((sum: number, leg: any) => sum + (typeof leg.duration === 'number' ? leg.duration : 0), 0)
          : 0;
        const durationMins = typeof f.total_duration === 'number'
          ? f.total_duration
          : summedLegMins > 0
          ? summedLegMins
          : undefined;

        return {
          airline: code,
          airlineName: rawAirline || getAirlineName(code),
          flightNumber: flightNum || undefined,
          origin: legOrigin,
          destination: legDestination,
          price: f.price,
          departureTime,
          arrivalTime,
          duration: durationMins ? `${Math.floor(durationMins / 60)}h ${durationMins % 60}m` : undefined,
          durationMinutes: durationMins,
          stops,
          isNonstop: stops === 0,
          layoverAirports,
        };
      });

    // 1. Specific Flight Number matching
    if (flight.searchMode === 'FlightNumber' && flight.flightNumber) {
      const targetCode = normalizeAirlineCode(flight.airline || '', flight.flightNumber);
      const targetNum = cleanFlightNumber(flight.flightNumber, targetCode);

      const targetFlight = results.find((f: any) => {
        const apiAirlineCodes = (f.airlines || []).map((a: string) => normalizeAirlineCode(a, ''));
        const hasAirline = targetCode ? apiAirlineCodes.includes(targetCode) : true;

        const legs = f.flights || [];
        return legs.some((leg: any) => {
          const rawNum = (leg.flight_number || leg.flightNumber || '').toString();
          const legCode = normalizeAirlineCode(leg.airline || '', rawNum);
          const legNum = cleanFlightNumber(rawNum, legCode);
          const matchesAirline = targetCode
            ? (legCode === targetCode || (legCode === 'UN' && hasAirline))
            : true;
          return matchesAirline && legNum === targetNum;
        });
      });

      if (targetFlight && typeof targetFlight.price === 'number') {
        let alternatives: RouteItinerary[] | undefined = undefined;
        if (flight.monitorRouteAlternatives === 1) {
          alternatives = filterItinerariesBySearchPreferences(parsedItineraries, flight);
          if (flight.includedAirlines) {
            const included = expandAlliancesToAirlines(flight.includedAirlines);
            alternatives = alternatives.filter((it: RouteItinerary) => included.includes(it.airline));
          }
          if (flight.excludedAirlines) {
            const excluded = expandAlliancesToAirlines(flight.excludedAirlines);
            alternatives = alternatives.filter((it: RouteItinerary) => !excluded.includes(it.airline));
          }
        }
        return {
          price: targetFlight.price,
          status: 'Success',
          leadingAirline: targetCode,
          leadingFlightNumber: flight.flightNumber,
          itineraries: alternatives,
        };
      }
      return {
        price: null,
        status: 'SoldOut',
        errorMessage: `Fast-Flights returned ${results.length} itineraries, but flight ${targetCode} ${targetNum} was not found`,
      };
    }

    // 2. Route Mode: candidate filtering
    let candidates: RouteItinerary[] = parsedItineraries;
    if (flight.airline && flight.airline.toUpperCase() !== 'ALL') {
      const targetCode = normalizeAirlineCode(flight.airline);
      const target = flight.airline.toLowerCase();
      candidates = candidates.filter(
        (it: RouteItinerary) =>
          it.airline === targetCode ||
          it.airline.toLowerCase() === target ||
          (it.airlineName?.toLowerCase().includes(target) ?? false)
      );
    }
    if (flight.includedAirlines) {
      const included = expandAlliancesToAirlines(flight.includedAirlines);
      candidates = candidates.filter((it: RouteItinerary) => included.includes(it.airline));
    }
    if (flight.excludedAirlines) {
      const excluded = expandAlliancesToAirlines(flight.excludedAirlines);
      candidates = candidates.filter((it: RouteItinerary) => !excluded.includes(it.airline));
    }

    // Apply time-of-day and redeye search preferences
    candidates = filterItinerariesBySearchPreferences(candidates, flight);
    const eligibleItineraries = filterItinerariesBySearchPreferences(parsedItineraries, flight);

    if (candidates.length > 0) {
      candidates.sort((a, b) => a.price - b.price);
      const lowest = candidates[0];
      return {
        price: lowest.price,
        status: 'Success',
        leadingAirline: lowest.airline,
        leadingFlightNumber: lowest.flightNumber,
        itineraries: eligibleItineraries,
      };
    }

    return { 
      price: null, 
      status: 'SoldOut', 
      errorMessage: `No flights matching airline filters (${flight.airline || flight.includedAirlines || 'all'}) found` 
    };
  } catch (error: any) {
    const rawMsg = error?.message || (typeof error === 'string' ? error : 'Scraper query failed');
    console.error('[FastFlights] Exception during price lookup:', rawMsg);

    const lower = rawMsg.toLowerCase();
    if (
      lower.includes('429') ||
      lower.includes('captcha') ||
      lower.includes('unusual traffic') ||
      lower.includes('consent') ||
      lower.includes('blocked')
    ) {
      return {
        price: null,
        status: 'RateLimited',
        errorMessage: `Google Flights anti-bot / CAPTCHA challenge detected (${rawMsg})`,
      };
    }

    if (lower.includes('timeout') || lower.includes('aborted') || lower.includes('econnreset')) {
      return {
        price: null,
        status: 'Error',
        errorMessage: `Connection timed out connecting to Google Flights (${rawMsg})`,
      };
    }

    if (lower.includes('econnrefused') || lower.includes('enotfound') || lower.includes('fetch failed')) {
      return {
        price: null,
        status: 'Error',
        errorMessage: `Network connection failed reaching Google Flights (${rawMsg})`,
      };
    }

    // Google Flights blocked the scraper or returned a bot challenge / missing flight payload
    if (lower.includes('missing flight data at') || lower.includes('rpc response missing')) {
      return {
        price: null,
        status: 'Error',
        errorMessage: 'Google Flights blocked the scraper (anti-bot challenge or rate limit)',
      };
    }

    return {
      price: null,
      status: 'Error',
      errorMessage: `Fast-Flights scraper error: ${rawMsg}`,
    };
  }
};