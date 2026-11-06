'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { Flight } from '@/types';
import { X, ShoppingBag, Loader2, AlertCircle, Pencil } from 'lucide-react';
import { formatCurrency, getCurrencySymbol } from '@/utils/format';
import { cleanDisplayTime, normalizeAirlineCode } from '@/utils/airline';
import AirlineBadge from './common/AirlineBadge';
import AirlineTagInput from './common/AirlineTagInput';
import SearchPreferencesSection from './flightModal/SearchPreferencesSection';
import RouteCorridorCoLocationSection from './flightModal/RouteCorridorCoLocationSection';

interface Props {
  isOpen: boolean;
  flight: Flight | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ConvertFlightModal({
  isOpen,
  flight,
  onClose,
  onSuccess,
}: Props) {
  const [purchasePrice, setPurchasePrice] = useState('');
  const [airline, setAirline] = useState('');
  const [flightNumber, setFlightNumber] = useState('');
  const [pnr, setPnr] = useState('');
  const [currency, setCurrency] = useState('');
  const [pointsCurrencies, setPointsCurrencies] = useState<string[]>([]);
  const [fiatCurrency, setFiatCurrency] = useState('USD');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Watched-to-Booked Route Adoption State
  const [monitorRouteAlternatives, setMonitorRouteAlternatives] = useState(true);
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [includedAirlines, setIncludedAirlines] = useState('');
  const [excludedAirlines, setExcludedAirlines] = useState('');
  const [maxStops, setMaxStops] = useState<number | null>(null);
  const [earliestDeparture, setEarliestDeparture] = useState('');
  const [latestDeparture, setLatestDeparture] = useState('');
  const [noRedeye, setNoRedeye] = useState(false);
  const [selectedCandidateKey, setSelectedCandidateKey] = useState<string | null>(null);

  const prevIsOpenRef = useRef(false);
  const prevFlightIdRef = useRef<number | undefined>(undefined);

  // Extract top lowest monitored itineraries from route price checks
  const candidateFlights = useMemo(() => {
    if (!flight?.latestMetadata) return [];
    try {
      const parsed = JSON.parse(flight.latestMetadata);
      if (!Array.isArray(parsed)) return [];
      const seen = new Set<string>();
      const list: Array<{
        key: string;
        airline: string;
        flightNumber?: string;
        price: number;
        departureTime?: string;
        stops?: number;
        isNonstop?: boolean;
      }> = [];

      for (const it of parsed) {
        const code = (it.airline || '').trim().toUpperCase();
        const fNum = (it.flightNumber || '').trim();
        const price = typeof it.price === 'number' ? it.price : 0;
        const key = `${code}-${fNum || 'var'}`;
        if (code && price > 0 && !seen.has(key)) {
          seen.add(key);
          list.push({
            key,
            airline: code,
            flightNumber: fNum || undefined,
            price,
            departureTime: it.departureTime,
            stops: it.stops,
            isNonstop: it.isNonstop !== undefined ? it.isNonstop : it.stops === 0,
          });
        }
      }
      return list.sort((a, b) => a.price - b.price).slice(0, 3);
    } catch {
      return [];
    }
  }, [flight?.latestMetadata]);

  const handleSelectCandidate = (c: { airline: string; flightNumber?: string; price: number; key: string }) => {
    setAirline(c.airline);
    setFlightNumber(c.flightNumber || '');
    setPurchasePrice(String(c.price));
    setSelectedCandidateKey(c.key);
  };

  const handleSelectCustom = () => {
    setSelectedCandidateKey('custom');
    setAirline('');
    setFlightNumber('');
    setPurchasePrice('');
  };

  useEffect(() => {
    const isOpening = isOpen && !prevIsOpenRef.current;
    const isFlightChanged = isOpen && flight?.id !== prevFlightIdRef.current;

    if (isOpening || isFlightChanged) {
      if (flight) {
        // Leave booking fields blank so user can pick from monitored options or enter manually
        setPurchasePrice('');
        setAirline('');
        setFlightNumber('');
        setPnr(flight.pnr || '');
        setCurrency(flight.currency || 'USD');
        setSelectedCandidateKey(null);

        // Copy existing route preferences and enable route monitoring by default
        setMonitorRouteAlternatives(true);
        setOrigin(flight.origin || '');
        setDestination(flight.destination || '');
        setIncludedAirlines(flight.includedAirlines || '');
        setExcludedAirlines(flight.excludedAirlines || '');
        setMaxStops(flight.maxStops !== undefined && flight.maxStops !== null ? flight.maxStops : null);
        setEarliestDeparture(flight.earliestDeparture || '');
        setLatestDeparture(flight.latestDeparture || '');
        setNoRedeye(flight.noRedeye === 1);
        setError(null);
      }
    }

    prevIsOpenRef.current = isOpen;
    prevFlightIdRef.current = flight?.id;
  }, [isOpen, flight]);

  useEffect(() => {
    if (isOpen) {
      fetch('/api/settings')
        .then(res => res.json())
        .then(data => {
          if (data.currency) setFiatCurrency(data.currency);
          if (data.pointsCurrencies) {
            try {
              const parsed = typeof data.pointsCurrencies === 'string'
                ? JSON.parse(data.pointsCurrencies)
                : data.pointsCurrencies;
              if (Array.isArray(parsed)) setPointsCurrencies(parsed);
            } catch {}
          }
        })
        .catch(() => {});
    }
  }, [isOpen]);

  const isPoints = pointsCurrencies.includes(currency);

  if (!isOpen || !flight) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const priceNum = parseFloat(purchasePrice);
    if (isNaN(priceNum) || priceNum <= 0) {
      setError('Please enter a valid purchase price.');
      setLoading(false);
      return;
    }

    if (!airline.trim()) {
      setError('Please enter the airline carrier code.');
      setLoading(false);
      return;
    }

    if (!flightNumber.trim()) {
      setError('Flight number is required for booked flights.');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`/api/flights/${flight.id}/convert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          purchasePrice: priceNum,
          airline: airline.trim().toUpperCase(),
          flightNumber: flightNumber.trim() || null,
          pnr: pnr.trim().toUpperCase() || null,
          currency: currency || fiatCurrency,
          monitorRouteAlternatives: monitorRouteAlternatives ? 1 : 0,
          origin: origin.trim().toUpperCase(),
          destination: destination.trim().toUpperCase(),
          includedAirlines: includedAirlines ? includedAirlines.trim().toUpperCase() : null,
          excludedAirlines: excludedAirlines ? excludedAirlines.trim().toUpperCase() : null,
          maxStops: maxStops !== null && maxStops !== undefined ? maxStops : null,
          earliestDeparture: earliestDeparture ? earliestDeparture.trim() : null,
          latestDeparture: latestDeparture ? latestDeparture.trim() : null,
          noRedeye: noRedeye ? 1 : 0,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to convert flight to booked');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error converting flight');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 sm:p-6 transition-colors">
      <div className="bg-gunmetal-card border border-gunmetal-border rounded-xl shadow-2xl w-full max-w-4xl lg:max-w-5xl xl:max-w-6xl max-h-[92vh] overflow-y-auto flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-gunmetal-border flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-950/60 border border-emerald-800/60 text-emerald-400">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-100">
                Convert to Booked
              </h3>
              <p className="text-xs text-gunmetal-muted">
                {flight.origin} → {flight.destination} · {flight.departureDate}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-gunmetal-muted hover:text-slate-200 hover:bg-gunmetal-canvas rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="bg-red-950/40 border border-red-800/70 p-3 rounded-md text-xs text-red-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="bg-gunmetal-canvas/60 border border-gunmetal-border rounded-lg p-3.5 text-xs text-slate-300 space-y-1">
            <span className="font-semibold text-emerald-300 block">
              Transition from Watching to Booked
            </span>
            <p className="text-gunmetal-muted leading-relaxed">
              Converting from watching to booked records what you paid and switches tracking strictly to price drop alerts. If fares drop below your purchase price, FlightSentry will alert you to rebook and secure airline savings. All previous price history remains intact.
            </p>
          </div>

          {/* Quick Select from Monitored Route Flights */}
          {candidateFlights.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Select Booked Flight (from Monitored Route Options)
                </label>
                <span className="text-[11px] text-gunmetal-muted">
                  Click a flight to pre-fill carrier, flight #, and price
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                {candidateFlights.map((c, idx) => {
                  const isSelected = selectedCandidateKey === c.key;
                  const formattedTime = cleanDisplayTime(c.departureTime);
                  const stopsLabel = c.isNonstop
                    ? 'Nonstop'
                    : c.stops === 1
                    ? '1 Stop'
                    : `${c.stops || 1} Stops`;

                  return (
                    <button
                      key={c.key}
                      type="button"
                      onClick={() => handleSelectCandidate(c)}
                      className={`p-3 rounded-lg border text-left transition-all relative flex flex-col justify-between gap-2 cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-950/40 border-emerald-500/80 ring-1 ring-emerald-500/50 shadow-md'
                          : 'bg-gunmetal-canvas/60 border-gunmetal-border hover:border-slate-500 hover:bg-gunmetal-canvas'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <AirlineBadge
                          code={c.airline}
                          flightNumber={c.flightNumber}
                          size="xs"
                        />
                        <span className="font-black text-sm text-slate-100 font-mono">
                          {formatCurrency(c.price, currency || fiatCurrency)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-gunmetal-muted">
                        <span>{stopsLabel}</span>
                        {formattedTime && <span className="font-mono text-slate-300">{formattedTime}</span>}
                      </div>
                      {idx === 0 && (
                        <span className="absolute -top-2 -right-1 text-[9px] font-bold uppercase tracking-wider bg-green-950 text-green-300 border border-green-800/80 px-1.5 py-0.2 rounded shadow-sm">
                          Lowest Fare
                        </span>
                      )}
                    </button>
                  );
                })}

                <button
                  type="button"
                  onClick={handleSelectCustom}
                  className={`p-3 rounded-lg border text-left transition-all flex flex-col justify-between gap-2 cursor-pointer ${
                    selectedCandidateKey === 'custom'
                      ? 'bg-slate-800/60 border-slate-400 ring-1 ring-slate-400/50 shadow-md text-slate-100'
                      : 'bg-gunmetal-canvas/40 border-dashed border-gunmetal-border text-gunmetal-muted hover:text-slate-300 hover:border-slate-500'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className="p-1 rounded bg-gunmetal-card border border-gunmetal-border">
                      <Pencil className="w-3.5 h-3.5 text-slate-300" />
                    </div>
                    <span className="font-bold text-xs text-slate-200">Different Flight</span>
                  </div>
                  <span className="text-[11px] text-gunmetal-muted">
                    Enter custom carrier, flight #, and price
                  </span>
                </button>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                {isPoints ? 'Points Redeemed *' : 'Purchase Price (Amount Paid) *'}
              </label>
              <div className="flex items-center gap-1.5">
                <label htmlFor="convertCurrencySelect" className="text-[11px] font-semibold text-gunmetal-muted uppercase tracking-wider">
                  Currency:
                </label>
                <select
                  id="convertCurrencySelect"
                  value={currency}
                  onChange={e => setCurrency(e.target.value)}
                  className="text-xs font-semibold rounded bg-gunmetal-card text-slate-200 border border-gunmetal-border px-2 py-1 focus:border-slate-500 focus:outline-none cursor-pointer"
                >
                  <option value={fiatCurrency}>
                    {fiatCurrency} ({getCurrencySymbol(fiatCurrency)})
                  </option>
                  {pointsCurrencies.map(p => (
                    <option key={p} value={p}>
                      {p} (Points)
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gunmetal-muted font-mono text-sm">
                {isPoints ? 'pts' : getCurrencySymbol(currency || fiatCurrency)}
              </span>
              <input
                required
                type="number"
                step={isPoints ? "1" : "0.01"}
                min="1"
                placeholder={flight.currentPrice ? String(flight.currentPrice) : (isPoints ? '35000' : '349.00')}
                value={purchasePrice}
                onChange={e => {
                  setPurchasePrice(e.target.value);
                  setSelectedCandidateKey('custom');
                }}
                className="w-full h-10 px-3 py-2 text-sm rounded-md bg-gunmetal-canvas text-slate-200 border border-gunmetal-border focus:border-slate-500 focus:outline-none placeholder-zinc-500 font-mono"
              />
            </div>
            <p className="text-[11px] text-gunmetal-muted">
              {isPoints
                ? 'Recorded points paid for this booking.'
                : 'Fares dropping below this price will trigger drop alerts.'}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Booked Carrier *
              </label>
              <AirlineTagInput
                value={airline}
                onChange={val => {
                  setAirline(val);
                  setSelectedCandidateKey('custom');
                }}
                maxTags={1}
                placeholder="e.g. DL or Delta"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Flight Number *
              </label>
              <input
                required
                pattern="\d+"
                placeholder="e.g. 523"
                value={flightNumber}
                onChange={e => {
                  setFlightNumber(e.target.value);
                  setSelectedCandidateKey('custom');
                }}
                className="w-full h-10 px-3 py-2 text-sm rounded-md bg-gunmetal-canvas text-slate-200 border border-gunmetal-border focus:border-slate-500 focus:outline-none placeholder-zinc-500 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Confirmation Code / PNR (Optional)
            </label>
            <input
              maxLength={8}
              placeholder="e.g. K9XZ4B"
              value={pnr}
              onChange={e => setPnr(e.target.value.toUpperCase())}
              className="w-full h-10 px-3 py-2 text-sm uppercase rounded-md bg-gunmetal-canvas text-slate-200 border border-gunmetal-border focus:border-slate-500 focus:outline-none placeholder-zinc-500 font-mono"
            />
          </div>

          {/* Also Monitor Route Alternatives Toggle (Enabled by default on conversion) */}
          <div className="bg-gunmetal-canvas/60 border border-gunmetal-border rounded-lg p-3.5 space-y-3">
            <label className="flex items-center justify-between cursor-pointer select-none">
              <div className="space-y-0.5">
                <span className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                  <span>Also Monitor Route Alternatives</span>
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-800/60 uppercase">
                    Recommended
                  </span>
                </span>
                <span className="block text-xs text-gunmetal-muted">
                  Continue monitoring alternative flights on {origin || flight.origin} → {destination || flight.destination} to catch rebooking savings or competitor price drops.
                </span>
              </div>
              <input
                type="checkbox"
                checked={monitorRouteAlternatives}
                onChange={e => setMonitorRouteAlternatives(e.target.checked)}
                className="w-4 h-4 accent-slate-500 rounded ml-4 flex-shrink-0 cursor-pointer"
              />
            </label>

            {monitorRouteAlternatives && (
              <div className="pt-3 border-t border-gunmetal-border/70 space-y-4 animate-in fade-in duration-150">
                <RouteCorridorCoLocationSection
                  origin={origin}
                  destination={destination}
                  physicalOrigin={flight.origin}
                  physicalDestination={flight.destination}
                  onScopeChange={updates => {
                    if (updates.origin !== undefined) setOrigin(updates.origin);
                    if (updates.destination !== undefined) setDestination(updates.destination);
                  }}
                />

                <p className="text-[11px] text-emerald-300/90 font-medium">
                  Route preferences copied from your watched flight. You can refine airline filters or timing constraints below:
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                      Route Airline Inclusions (Optional)
                    </label>
                    <AirlineTagInput
                      value={includedAirlines}
                      onChange={setIncludedAirlines}
                      placeholder="e.g. DL, AA (type & press space or comma)"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                      Route Airline Exclusions (Optional)
                    </label>
                    <AirlineTagInput
                      value={excludedAirlines}
                      onChange={setExcludedAirlines}
                      placeholder="e.g. NK, F9 (type & press space or comma)"
                    />
                  </div>
                </div>

                <SearchPreferencesSection
                  earliestDeparture={earliestDeparture}
                  latestDeparture={latestDeparture}
                  noRedeye={noRedeye}
                  maxStops={maxStops}
                  onEarliestChange={setEarliestDeparture}
                  onLatestChange={setLatestDeparture}
                  onNoRedeyeChange={setNoRedeye}
                  onMaxStopsChange={setMaxStops}
                />
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-gunmetal-border flex items-center justify-end gap-2.5">
            <button
              type="button"
              disabled={loading}
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold bg-gunmetal-canvas hover:bg-gunmetal-border text-slate-300 border border-gunmetal-border rounded-md transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-xs font-semibold bg-emerald-950/70 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-700/70 rounded-md transition-colors flex items-center gap-1.5 disabled:opacity-50 shadow-sm"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Converting...</span>
                </>
              ) : (
                <>
                  <ShoppingBag className="w-3.5 h-3.5" />
                  <span>Convert to Booked</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}