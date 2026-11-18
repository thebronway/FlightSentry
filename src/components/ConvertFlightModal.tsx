'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Flight, TrackedFlightLeg } from '@/types';
import { X, ShoppingBag, Loader2, AlertCircle, Plane, GitBranch } from 'lucide-react';
import { formatCurrency, getCurrencySymbol, isPointsCurrency } from '@/utils/format';
import { isValidAirlineCode, normalizeAirlineCode } from '@/utils/airline';
import { isMetroCode } from '@/utils/coLocations';
import { getTodayDateString } from '@/utils/date';
import { parseFlightLegs, serializeFlightLegs } from '@/utils/flightLegs';
import AirlineTagInput from './common/AirlineTagInput';
import ConnectingLegsSection from './flightModal/ConnectingLegsSection';
import SearchPreferencesSection from './flightModal/SearchPreferencesSection';
import RouteCorridorCoLocationSection from './flightModal/RouteCorridorCoLocationSection';
import MonitoredFlightCandidates, {
  parseMonitoredCandidates,
  ConvertCandidateFlight,
} from './convertModal/MonitoredFlightCandidates';

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
  const [itineraryType, setItineraryType] = useState<'nonstop' | 'layover'>('nonstop');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [bookingDate, setBookingDate] = useState('');
  const [airline, setAirline] = useState('');
  const [draftAirline, setDraftAirline] = useState('');
  const [flightNumber, setFlightNumber] = useState('');
  const [legs, setLegs] = useState<TrackedFlightLeg[]>([]);
  const [pnr, setPnr] = useState('');
  const [currency, setCurrency] = useState('');
  const [taxesAmount, setTaxesAmount] = useState('');
  const [pointsCurrencies, setPointsCurrencies] = useState<string[]>([]);
  const [fiatCurrency, setFiatCurrency] = useState('USD');
  const [timezone, setTimezone] = useState<string | undefined>(undefined);
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
  const [maxLayoverMinutes, setMaxLayoverMinutes] = useState<number | null>(null);
  const [excludedConnectingAirports, setExcludedConnectingAirports] = useState('');
  const [maxTotalDurationMinutes, setMaxTotalDurationMinutes] = useState<number | null>(null);
  const [selectedCandidateKey, setSelectedCandidateKey] = useState<string | null>(null);

  const prevIsOpenRef = useRef(false);
  const prevFlightIdRef = useRef<number | undefined>(undefined);

  const candidateFlights = useMemo(
    () => parseMonitoredCandidates(flight?.latestMetadata),
    [flight?.latestMetadata]
  );

  const resolveCarrierInput = useCallback((committed: string, draft: string): string => {
    const cleanCommitted = (committed || '').trim().toUpperCase();
    if (cleanCommitted) return cleanCommitted;
    const rawDraft = (draft || '').trim();
    if (!rawDraft) return '';
    const norm = normalizeAirlineCode(rawDraft);
    if (norm !== 'UN' && isValidAirlineCode(norm)) return norm;
    return rawDraft.toUpperCase();
  }, []);

  const sanitizeSingleAirport = (raw?: string | null): string => {
    const first = (raw || '').split(',')[0]?.trim().toUpperCase() || '';
    if (/^[A-Z]{3}$/.test(first) && !isMetroCode(first)) {
      return first;
    }
    return '';
  };

  const syncLegsChain = (rawLegs: TrackedFlightLeg[]): TrackedFlightLeg[] =>
    rawLegs.map((leg, idx) => ({
      airline: (leg.airline || '').trim().toUpperCase(),
      bookingAirline: leg.bookingAirline ? leg.bookingAirline.trim().toUpperCase() : null,
      flightNumber: (leg.flightNumber || '').trim().replace(/\D/g, ''),
      origin:
        idx === 0
          ? (leg.origin || '').replace(/[^a-zA-Z]/g, '').slice(0, 3).toUpperCase()
          : (rawLegs[idx - 1]?.destination || leg.origin || '')
              .replace(/[^a-zA-Z]/g, '')
              .slice(0, 3)
              .toUpperCase(),
      destination: (leg.destination || '').replace(/[^a-zA-Z]/g, '').slice(0, 3).toUpperCase(),
    }));

  const handleSelectCandidate = (c: ConvertCandidateFlight) => {
    setError(null);
    setDraftAirline('');
    setPurchasePrice(String(c.price));
    setSelectedCandidateKey(c.key);
    if (c.legs && c.legs.length >= 2) {
      setItineraryType('layover');
      setLegs(syncLegsChain(c.legs));
      setAirline(c.legs[0].airline);
      setFlightNumber(c.legs[0].flightNumber);
    } else {
      setItineraryType('nonstop');
      setLegs([]);
      setAirline(c.airline);
      setFlightNumber(c.flightNumber || '');
    }
  };

  const handleSelectCustom = () => {
    setError(null);
    setSelectedCandidateKey('custom');
    setItineraryType('nonstop');
    setLegs([]);
    setAirline('');
    setDraftAirline('');
    setFlightNumber('');
    setPurchasePrice('');
  };

  const handleItineraryTypeChange = (nextType: 'nonstop' | 'layover') => {
    setError(null);
    if (nextType === 'layover') {
      if (legs.length >= 2) {
        setItineraryType('layover');
        return;
      }
      const carryAirline = resolveCarrierInput(airline, draftAirline);
      const firstOrigin = sanitizeSingleAirport(origin || flight?.origin);
      const finalDest = sanitizeSingleAirport(destination || flight?.destination);
      const initialLegs = syncLegsChain([
        {
          airline: carryAirline,
          bookingAirline: null,
          flightNumber: flightNumber.trim().replace(/\D/g, ''),
          origin: firstOrigin,
          destination: '',
        },
        {
          airline: '',
          bookingAirline: null,
          flightNumber: '',
          origin: '',
          destination: finalDest,
        },
      ]);
      setDraftAirline('');
      setLegs(initialLegs);
      setItineraryType('layover');
    } else {
      if (legs.length > 0) {
        setAirline(legs[0].airline || airline);
        setFlightNumber(legs[0].flightNumber || flightNumber);
      }
      setLegs([]);
      setItineraryType('nonstop');
    }
  };

  const handleUpdateLeg = (index: number, patch: Partial<TrackedFlightLeg>) => {
    setError(null);
    setSelectedCandidateKey('custom');
    setLegs(prev => {
      if (index < 0 || index >= prev.length) return prev;
      const next = prev.map((leg, i) => (i === index ? { ...leg, ...patch } : leg));
      if (patch.destination !== undefined && index + 1 < next.length) {
        next[index + 1] = { ...next[index + 1], origin: patch.destination };
      }
      if (patch.origin !== undefined && index > 0 && !next[index - 1].destination) {
        next[index - 1] = { ...next[index - 1], destination: patch.origin };
      }
      const synced = syncLegsChain(next);
      if (synced[0]) {
        setAirline(synced[0].airline);
        setFlightNumber(synced[0].flightNumber);
      }
      return synced;
    });
  };

  const handleAddLeg = () => {
    setError(null);
    setSelectedCandidateKey('custom');
    setLegs(prev => {
      if (prev.length < 2 || prev.length >= 4) return prev;
      const priorLast = prev[prev.length - 1];
      return syncLegsChain([
        ...prev,
        {
          airline: '',
          bookingAirline: null,
          flightNumber: '',
          origin: priorLast.destination || '',
          destination: '',
        },
      ]);
    });
  };

  const handleRemoveLeg = (index: number) => {
    setError(null);
    setSelectedCandidateKey('custom');
    setLegs(prev => {
      if (prev.length <= 2) {
        const first = prev[0];
        setAirline(first?.airline || airline);
        setFlightNumber(first?.flightNumber || flightNumber);
        setItineraryType('nonstop');
        return [];
      }
      const filtered = prev.filter((_, i) => i !== index);
      for (let i = 0; i < filtered.length - 1; i++) {
        filtered[i + 1] = { ...filtered[i + 1], origin: filtered[i].destination };
      }
      return syncLegsChain(filtered);
    });
  };

  useEffect(() => {
    const isOpening = isOpen && !prevIsOpenRef.current;
    const isFlightChanged = isOpen && flight?.id !== prevFlightIdRef.current;

    if (isOpening || isFlightChanged) {
      if (flight) {
        const todayStr = getTodayDateString(timezone);
        const existingLegs = parseFlightLegs(flight.legs);
        const isWatchedSpecificFlight =
          flight.searchMode === 'FlightNumber' &&
          (existingLegs.length >= 2 || Boolean(flight.airline && flight.flightNumber));

        if (existingLegs.length >= 2) {
          setItineraryType('layover');
          setLegs(syncLegsChain(existingLegs));
          setAirline(existingLegs[0].airline);
          setFlightNumber(existingLegs[0].flightNumber);
        } else if (isWatchedSpecificFlight) {
          setItineraryType('nonstop');
          setLegs([]);
          setAirline((flight.airline || '').trim().toUpperCase());
          setFlightNumber((flight.flightNumber || '').trim());
        } else {
          setItineraryType('nonstop');
          setLegs([]);
          setAirline('');
          setFlightNumber('');
        }

        setDraftAirline('');
        setPurchasePrice(
          isWatchedSpecificFlight && flight.currentPrice > 0 ? String(flight.currentPrice) : ''
        );
        setBookingDate(flight.bookingDate || todayStr);
        setPnr(flight.pnr || '');
        setCurrency(flight.currency || fiatCurrency || 'USD');
        setTaxesAmount(
          flight.taxesAmount !== null && flight.taxesAmount !== undefined && flight.taxesAmount > 0
            ? String(flight.taxesAmount)
            : ''
        );
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
        setMaxLayoverMinutes(
          flight.maxLayoverMinutes !== undefined && flight.maxLayoverMinutes !== null
            ? flight.maxLayoverMinutes
            : null
        );
        setExcludedConnectingAirports(flight.excludedConnectingAirports || '');
        setMaxTotalDurationMinutes(
          flight.maxTotalDurationMinutes !== undefined && flight.maxTotalDurationMinutes !== null
            ? flight.maxTotalDurationMinutes
            : null
        );
        setError(null);
      }
    }

    prevIsOpenRef.current = isOpen;
    prevFlightIdRef.current = flight?.id;
  }, [isOpen, flight, timezone, fiatCurrency]);

  useEffect(() => {
    if (isOpen) {
      fetch('/api/settings')
        .then(res => res.json())
        .then(data => {
          if (data.currency) setFiatCurrency(data.currency);
          if (data.timezone) {
            setTimezone(data.timezone);
            setBookingDate(prev => prev || getTodayDateString(data.timezone));
          }
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

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, loading, onClose]);

  const isPoints = pointsCurrencies.includes(currency) || isPointsCurrency(currency);
  const todayStr = getTodayDateString(timezone);

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

    if (bookingDate && bookingDate > todayStr) {
      setError('Booking date cannot be in the future.');
      setLoading(false);
      return;
    }

    const rawTaxes = isPoints && taxesAmount.trim() !== '' ? parseFloat(taxesAmount) : null;
    if (rawTaxes !== null && (isNaN(rawTaxes) || rawTaxes < 0)) {
      setError('Taxes & fees must be zero or a positive amount.');
      setLoading(false);
      return;
    }
    const normalizedTaxesAmount = rawTaxes !== null && rawTaxes > 0 ? rawTaxes : null;
    const normalizedTaxesCurrency = normalizedTaxesAmount ? fiatCurrency : null;

    const isLayoverMode = itineraryType === 'layover' && legs.length >= 2;
    const resolvedAirline = resolveCarrierInput(airline, draftAirline);

    if (isLayoverMode) {
      for (let i = 0; i < legs.length; i++) {
        const leg = legs[i];
        const legLabel = `Leg ${i + 1}`;
        if (!isValidAirlineCode(leg.airline)) {
          setError(`${legLabel}: Carrier must be a valid 2-character IATA airline code (e.g. DL, B6).`);
          setLoading(false);
          return;
        }
        if (!leg.flightNumber || !/^\d+$/.test(leg.flightNumber.trim())) {
          setError(`${legLabel}: Numeric flight number is required.`);
          setLoading(false);
          return;
        }
        if (!/^[A-Z]{3}$/.test(leg.origin) || isMetroCode(leg.origin)) {
          setError(`${legLabel}: Origin must be a single 3-letter IATA airport code.`);
          setLoading(false);
          return;
        }
        if (!/^[A-Z]{3}$/.test(leg.destination) || isMetroCode(leg.destination)) {
          setError(`${legLabel}: Destination must be a single 3-letter IATA airport code.`);
          setLoading(false);
          return;
        }
        if (leg.origin === leg.destination) {
          setError(`${legLabel}: Origin and destination airports must be different.`);
          setLoading(false);
          return;
        }
      }
      if (legs[0].origin === legs[legs.length - 1].destination) {
        setError('Initial origin and final destination airports must be different.');
        setLoading(false);
        return;
      }
    } else {
      if (!resolvedAirline) {
        setError('Please enter the airline carrier code.');
        setLoading(false);
        return;
      }

      if (!isValidAirlineCode(resolvedAirline)) {
        setError("Carrier must be a valid 2-character IATA airline code (e.g. DL, B6, 9W) and cannot be 'XX' or 'UN'.");
        setLoading(false);
        return;
      }

      if (!flightNumber.trim() || !/^\d+$/.test(flightNumber.trim())) {
        setError('Flight number is required for booked flights.');
        setLoading(false);
        return;
      }
    }

    const serializedLegs = isLayoverMode ? serializeFlightLegs(legs) : null;
    const payloadAirline = isLayoverMode ? legs[0].airline.trim().toUpperCase() : resolvedAirline;
    const payloadFlightNumber = isLayoverMode
      ? legs[0].flightNumber.trim()
      : flightNumber.trim();
    const payloadOrigin = isLayoverMode
      ? legs[0].origin
      : origin.trim().toUpperCase();
    const payloadDestination = isLayoverMode
      ? legs[legs.length - 1].destination
      : destination.trim().toUpperCase();

    try {
      const res = await fetch(`/api/flights/${flight.id}/convert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          purchasePrice: priceNum,
          bookingDate: bookingDate || todayStr,
          airline: payloadAirline,
          flightNumber: payloadFlightNumber,
          legs: serializedLegs,
          pnr: pnr.trim().toUpperCase() || null,
          currency: currency || fiatCurrency,
          taxesAmount: normalizedTaxesAmount,
          taxesCurrency: normalizedTaxesCurrency,
          monitorRouteAlternatives: isPoints ? 0 : (monitorRouteAlternatives ? 1 : 0),
          origin: payloadOrigin,
          destination: payloadDestination,
          includedAirlines: includedAirlines ? includedAirlines.trim().toUpperCase() : null,
          excludedAirlines: excludedAirlines ? excludedAirlines.trim().toUpperCase() : null,
          maxStops: maxStops !== null && maxStops !== undefined ? maxStops : null,
          earliestDeparture: earliestDeparture ? earliestDeparture.trim() : null,
          latestDeparture: latestDeparture ? latestDeparture.trim() : null,
          noRedeye: noRedeye ? 1 : 0,
          maxLayoverMinutes:
            maxLayoverMinutes !== null && maxLayoverMinutes !== undefined
              ? maxLayoverMinutes
              : null,
          excludedConnectingAirports: excludedConnectingAirports
            ? excludedConnectingAirports.trim().toUpperCase()
            : null,
          maxTotalDurationMinutes:
            maxTotalDurationMinutes !== null && maxTotalDurationMinutes !== undefined
              ? maxTotalDurationMinutes
              : null,
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
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-0 sm:p-4 md:p-6 transition-colors"
    >
      <div className="bg-gunmetal-card border border-gunmetal-border w-full h-full sm:h-auto sm:max-h-[90vh] rounded-none sm:rounded-2xl shadow-2xl max-w-4xl lg:max-w-5xl xl:max-w-6xl flex flex-col overflow-hidden">
        {/* Sticky Header */}
        <div className="px-4 sm:px-6 py-4 border-b border-gunmetal-border bg-gunmetal-card flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-lg bg-emerald-950/60 border border-emerald-800/60 text-emerald-400 flex-shrink-0">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="font-bold text-base sm:text-lg text-slate-100 truncate">
                Convert to Booked
              </h2>
              <p className="text-xs text-gunmetal-muted truncate">
                {flight.origin} → {flight.destination} · {flight.departureDate}
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={loading}
            onClick={onClose}
            aria-label="Close modal"
            className="min-h-[44px] min-w-[44px] sm:min-h-[36px] sm:min-w-[36px] inline-flex items-center justify-center rounded-lg text-gunmetal-muted hover:text-slate-100 hover:bg-gunmetal-canvas transition-colors cursor-pointer flex-shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Independent Scrollable Body */}
        <form
          id="convert-flight-form"
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto [overflow-anchor:none] p-4 sm:p-6 space-y-5 min-h-0"
        >
          {error && (
            <div className="bg-rose-950/45 border border-rose-700/70 p-3.5 rounded-lg text-xs text-rose-200 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="bg-gunmetal-canvas/60 border border-gunmetal-border rounded-lg p-3.5 text-xs text-slate-300 space-y-1">
            <span className="font-semibold text-emerald-300 block">
              Transition from Watching to Booked
            </span>
            <p className="text-gunmetal-muted leading-relaxed">
              Converting records what you paid and switches tracking strictly to price drop alerts. If fares drop below your purchase price, FlightSentry alerts you to rebook and secure airline credits while preserving all historical price data.
            </p>
          </div>

          {/* Quick Select from Monitored Route Options */}
          <MonitoredFlightCandidates
            candidates={candidateFlights}
            selectedCandidateKey={selectedCandidateKey}
            currency={currency || fiatCurrency}
            onSelectCandidate={handleSelectCandidate}
            onSelectCustom={handleSelectCustom}
          />

          {/* Booked Flight Structure & Segments */}
          <div className="bg-gunmetal-canvas/60 border border-gunmetal-border rounded-xl p-4 sm:p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                Booked Flight Details
              </label>
            </div>

            <div>
              <span className="block text-[11px] font-semibold uppercase tracking-wider text-gunmetal-muted mb-1.5">
                Itinerary Structure
              </span>
              <div
                role="group"
                aria-label="Booked itinerary structure"
                className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 p-1 rounded-lg bg-gunmetal-canvas border border-gunmetal-border"
              >
                <button
                  type="button"
                  onClick={() => handleItineraryTypeChange('nonstop')}
                  className={`min-h-[44px] sm:min-h-[38px] px-3 py-2 rounded-md text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer ${
                    itineraryType === 'nonstop'
                      ? 'bg-gunmetal-border border border-slate-500 text-slate-100 shadow-sm'
                      : 'border border-transparent text-gunmetal-muted hover:text-slate-200'
                  }`}
                >
                  <Plane className={`w-3.5 h-3.5 ${itineraryType === 'nonstop' ? 'text-sky-400' : 'text-gunmetal-muted'}`} />
                  <span>Nonstop / Direct Flight</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleItineraryTypeChange('layover')}
                  className={`min-h-[44px] sm:min-h-[38px] px-3 py-2 rounded-md text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer ${
                    itineraryType === 'layover'
                      ? 'bg-gunmetal-border border border-slate-500 text-slate-100 shadow-sm'
                      : 'border border-transparent text-gunmetal-muted hover:text-slate-200'
                  }`}
                >
                  <GitBranch className={`w-3.5 h-3.5 ${itineraryType === 'layover' ? 'text-sky-400' : 'text-gunmetal-muted'}`} />
                  <span>Layover / Connecting</span>
                </button>
              </div>
            </div>

            {itineraryType === 'layover' ? (
              <ConnectingLegsSection
                legs={legs}
                departureDate={flight.departureDate}
                onUpdateLeg={handleUpdateLeg}
                onAddLeg={handleAddLeg}
                onRemoveLeg={handleRemoveLeg}
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
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
                    onDraftChange={setDraftAirline}
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
                      setFlightNumber(e.target.value.replace(/\D/g, ''));
                      setSelectedCandidateKey('custom');
                    }}
                    className="w-full min-h-[44px] sm:min-h-[38px] px-3 py-2 text-sm rounded-md bg-gunmetal-canvas text-slate-100 border border-gunmetal-border focus:border-slate-500 focus:outline-none placeholder-zinc-500 font-mono"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Purchase Price, Currency, Booking Date & PNR */}
          <div className="bg-gunmetal-canvas/60 border border-gunmetal-border rounded-xl p-4 sm:p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                {isPoints ? 'Points Redeemed & Booking Info' : 'Purchase Price & Booking Info'}
              </label>
              <div className="flex items-center gap-1.5">
                <label htmlFor="convertCurrencySelect" className="text-[11px] font-semibold text-gunmetal-muted uppercase tracking-wider">
                  Currency:
                </label>
                <select
                  id="convertCurrencySelect"
                  value={currency}
                  onChange={e => setCurrency(e.target.value)}
                  className="min-h-[36px] text-xs font-semibold rounded-md bg-gunmetal-canvas text-slate-200 border border-gunmetal-border px-2.5 py-1.5 focus:border-slate-500 focus:outline-none cursor-pointer"
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

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  {isPoints ? 'Points Paid *' : 'Amount Paid *'}
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-gunmetal-muted font-mono text-sm">
                    {isPoints ? 'pts' : getCurrencySymbol(currency || fiatCurrency)}
                  </span>
                  <input
                    required
                    type="number"
                    step={isPoints ? '1' : '0.01'}
                    min="1"
                    placeholder={flight.currentPrice ? String(flight.currentPrice) : (isPoints ? '35000' : '349.00')}
                    value={purchasePrice}
                    onChange={e => {
                      setPurchasePrice(e.target.value);
                      setSelectedCandidateKey('custom');
                    }}
                    className="w-full min-h-[44px] sm:min-h-[38px] px-3 py-2 text-sm rounded-md bg-gunmetal-canvas text-slate-100 border border-gunmetal-border focus:border-slate-500 focus:outline-none placeholder-zinc-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Booking Date *
                </label>
                <input
                  required
                  type="date"
                  max={todayStr}
                  value={bookingDate}
                  onChange={e => setBookingDate(e.target.value)}
                  className="w-full min-h-[44px] sm:min-h-[38px] px-3 py-2 text-sm rounded-md bg-gunmetal-canvas text-slate-100 border border-gunmetal-border focus:border-slate-500 focus:outline-none [color-scheme:dark]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Confirmation / PNR
                </label>
                <input
                  maxLength={8}
                  placeholder="e.g. K9XZ4B"
                  value={pnr}
                  onChange={e => setPnr(e.target.value.toUpperCase())}
                  className="w-full min-h-[44px] sm:min-h-[38px] px-3 py-2 text-sm uppercase rounded-md bg-gunmetal-canvas text-slate-100 border border-gunmetal-border focus:border-slate-500 focus:outline-none placeholder-zinc-500 font-mono"
                />
              </div>
            </div>

            <p className="text-[11px] text-gunmetal-muted">
              {isPoints
                ? 'Recorded points paid for this booking.'
                : 'Fares dropping below this price will trigger drop alerts.'}
            </p>

            {isPoints && (
              <div className="pt-3 border-t border-gunmetal-border/70 space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Taxes &amp; Fees ({fiatCurrency})
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-gunmetal-muted font-mono text-sm">
                    {getCurrencySymbol(fiatCurrency)}
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="e.g. 5.60"
                    value={taxesAmount}
                    onChange={e => setTaxesAmount(e.target.value)}
                    className="w-full min-h-[44px] sm:min-h-[38px] px-3 py-2 text-sm rounded-md bg-gunmetal-canvas text-slate-100 border border-gunmetal-border focus:border-slate-500 focus:outline-none placeholder-zinc-500 font-mono"
                  />
                </div>
                <p className="text-[11px] text-gunmetal-muted">
                  Optional cash taxes &amp; carrier fees paid in {fiatCurrency}.
                </p>
              </div>
            )}
          </div>

          {/* Also Monitor Route Alternatives Toggle (Hidden when converting to Points) */}
          {!isPoints && (
            <div className="bg-gunmetal-canvas/60 border border-gunmetal-border rounded-xl p-4 sm:p-5 space-y-3">
              <label className="min-h-[44px] sm:min-h-0 flex items-center justify-between cursor-pointer select-none gap-4">
                <div className="space-y-0.5">
                  <span className="text-sm font-semibold text-slate-200 flex flex-wrap items-center gap-2">
                    <span>Also Monitor Route Alternatives</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-800/60 uppercase">
                      Recommended
                    </span>
                  </span>
                  <span className="block text-xs text-gunmetal-muted">
                    Continue monitoring alternative flights on{' '}
                    {itineraryType === 'layover' && legs.length >= 2
                      ? `${legs[0].origin || flight.origin} → ${legs[legs.length - 1].destination || flight.destination}`
                      : `${origin || flight.origin} → ${destination || flight.destination}`}{' '}
                    to catch rebooking savings or competitor price drops.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={monitorRouteAlternatives}
                  onChange={e => setMonitorRouteAlternatives(e.target.checked)}
                  className="w-4 h-4 accent-slate-500 rounded flex-shrink-0 cursor-pointer"
                />
              </label>

              {monitorRouteAlternatives && (
                <div className="pt-3 border-t border-gunmetal-border/70 space-y-4">
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
                    maxLayoverMinutes={maxLayoverMinutes}
                    excludedConnectingAirports={excludedConnectingAirports}
                    maxTotalDurationMinutes={maxTotalDurationMinutes}
                    onEarliestChange={setEarliestDeparture}
                    onLatestChange={setLatestDeparture}
                    onNoRedeyeChange={setNoRedeye}
                    onMaxStopsChange={setMaxStops}
                    onMaxLayoverChange={setMaxLayoverMinutes}
                    onExcludedConnectingAirportsChange={setExcludedConnectingAirports}
                    onMaxTotalDurationChange={setMaxTotalDurationMinutes}
                  />
                </div>
              )}
            </div>
          )}
        </form>

        {/* Sticky Footer */}
        <div className="px-4 sm:px-6 py-3.5 border-t border-gunmetal-border bg-gunmetal-card flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 flex-shrink-0">
          <button
            type="button"
            disabled={loading}
            onClick={onClose}
            className="min-h-[44px] sm:min-h-[38px] px-4 py-2 rounded-lg text-xs sm:text-sm inline-flex items-center justify-center gap-1.5 bg-gunmetal-canvas hover:bg-gunmetal-border border border-gunmetal-border text-slate-300 hover:text-white font-semibold transition-colors disabled:opacity-45 disabled:pointer-events-none cursor-pointer"
          >
            Cancel
          </button>
          <button
            form="convert-flight-form"
            type="submit"
            disabled={loading}
            className="min-h-[44px] sm:min-h-[38px] px-4 py-2 rounded-lg text-xs sm:text-sm inline-flex items-center justify-center gap-1.5 bg-emerald-950/60 hover:bg-emerald-900/75 border border-emerald-700/80 text-emerald-200 font-semibold transition-colors disabled:opacity-45 disabled:pointer-events-none cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Converting...</span>
              </>
            ) : (
              <>
                <ShoppingBag className="w-4 h-4" />
                <span>Convert to Booked</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}