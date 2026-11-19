'use client';

import { useEffect, useState, FormEvent } from 'react';
import { X, Pencil, Check, Trash2, AlertCircle, DollarSign, Coins, Compass } from 'lucide-react';
import { CabinClass, EmailQueueEventType, EmailQueueItem, FareTier } from '@/types';
import { getCurrencySymbol, isPointsCurrency } from '@/utils/format';
import { isValidAirlineCode } from '@/utils/airline';
import { notifySearchFinished, notifySearchStarted } from '@/utils/searchEvents';
import SettingsModalPortal from '../settings/shared/SettingsModalPortal';
import SettingsSelect from '../settings/shared/SettingsSelect';
import { ActiveFlightSummary } from './EmailQueueItemCard';

interface Props {
  isOpen: boolean;
  item: EmailQueueItem | null;
  flights: ActiveFlightSummary[];
  pointsCurrencies: string[];
  defaultFiatCurrency: string;
  onClose: () => void;
  onApplied: (queueItemId: number) => void;
}

export default function EmailQueueEditModal({
  isOpen,
  item,
  flights,
  pointsCurrencies,
  defaultFiatCurrency,
  onClose,
  onApplied,
}: Props) {
  const [eventType, setEventType] = useState<EmailQueueEventType>('new_booking');
  const [matchedFlightId, setMatchedFlightId] = useState<string>('');
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [airline, setAirline] = useState('');
  const [flightNumber, setFlightNumber] = useState('');
  const [departureDate, setDepartureDate] = useState('');
  const [departureTime, setDepartureTime] = useState('');
  const [arrivalTime, setArrivalTime] = useState('');
  const [pnr, setPnr] = useState('');
  const [isPoints, setIsPoints] = useState(false);
  const [price, setPrice] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [taxesAmount, setTaxesAmount] = useState('');
  const [cabinClass, setCabinClass] = useState<CabinClass>('economy');
  const [fareTier, setFareTier] = useState<FareTier>('Standard');

  const [detectingRoute, setDetectingRoute] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !item) return;
    setError(null);
    setEventType(item.eventType);
    setMatchedFlightId(item.matchedFlightId ? String(item.matchedFlightId) : '');
    setOrigin(item.origin || '');
    setDestination(item.destination || '');
    setAirline(item.airline || '');
    setFlightNumber(item.flightNumber || '');
    setDepartureDate(item.departureDate || '');
    setDepartureTime(item.departureTime || '');
    setArrivalTime(item.arrivalTime || '');
    setPnr(item.pnr || '');

    const itemIsPoints = Boolean(
      item.isPoints === 1 ||
        isPointsCurrency(item.currency) ||
        (item.currency && pointsCurrencies.includes(item.currency))
    );
    setIsPoints(itemIsPoints);
    setPrice(item.price !== null && item.price !== undefined ? String(item.price) : '');
    setCurrency(
      itemIsPoints
        ? item.currency || (pointsCurrencies.length > 0 ? pointsCurrencies[0] : 'PTS')
        : item.currency || defaultFiatCurrency || 'USD'
    );
    setTaxesAmount(
      item.taxesAmount !== null && item.taxesAmount !== undefined ? String(item.taxesAmount) : ''
    );
    setCabinClass(item.cabinClass || 'economy');
    setFareTier(item.fareTier || 'Standard');
  }, [isOpen, item, pointsCurrencies, defaultFiatCurrency]);

  if (!isOpen || !item) return null;

  const handlePaymentModeSwitch = (nextIsPoints: boolean) => {
    setIsPoints(nextIsPoints);
    if (nextIsPoints) {
      const nextCurr =
        isPointsCurrency(currency) || pointsCurrencies.includes(currency)
          ? currency
          : pointsCurrencies.length > 0
          ? pointsCurrencies[0]
          : 'PTS';
      setCurrency(nextCurr);
    } else {
      setCurrency(defaultFiatCurrency || 'USD');
    }
  };

  const handleAutoDetectRoute = async () => {
    const cleanCarrier = airline.trim().toUpperCase();
    const cleanNum = flightNumber.trim().replace(/\D+/g, '');
    if (!isValidAirlineCode(cleanCarrier) || !cleanNum) {
      setError('Enter a valid 2-letter carrier code and flight number first to auto-detect the route.');
      return;
    }

    setDetectingRoute(true);
    setError(null);
    const searchToken = notifySearchStarted({
      searchKind: 'route_lookup',
      context: `${cleanCarrier} ${cleanNum} • Route Lookup`,
      flightNumber: `${cleanCarrier} ${cleanNum}`,
      providerLabel: 'Aviation Route DBs',
    });
    let detectOk = false;
    let detectErr: string | null = null;
    try {
      const res = await fetch('/api/flights/lookup-route', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          airline: cleanCarrier,
          flightNumber: cleanNum,
          departureDate: departureDate || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success && data.origin && data.destination) {
        detectOk = true;
        setOrigin(data.origin);
        setDestination(data.destination);
      } else {
        detectErr = data.error || `Could not auto-detect route for ${cleanCarrier} ${cleanNum}.`;
        setError(detectErr);
      }
    } catch (err: any) {
      detectErr = err?.message || 'Route lookup failed';
      setError(detectErr);
    } finally {
      notifySearchFinished(searchToken, { ok: detectOk, errorMessage: detectErr });
      setDetectingRoute(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const parsedPrice = price.trim() !== '' ? Number(price) : null;
      const parsedTaxes = taxesAmount.trim() !== '' ? Number(taxesAmount) : null;
      const parsedFlightId = matchedFlightId.trim() !== '' ? Number(matchedFlightId) : null;
      const normalizedCurrency = isPoints
        ? currency.trim() || (pointsCurrencies[0] ?? 'PTS')
        : currency.trim().toUpperCase() || defaultFiatCurrency || 'USD';

      const res = await fetch(`/api/email-queue/${item.id}/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventType,
          matchedFlightId: parsedFlightId,
          origin: origin.trim().toUpperCase(),
          destination: destination.trim().toUpperCase(),
          airline: airline.trim().toUpperCase(),
          flightNumber: flightNumber.trim(),
          departureDate: departureDate.trim(),
          departureTime: departureTime.trim(),
          arrivalTime: arrivalTime.trim(),
          pnr: pnr.trim().toUpperCase(),
          isPoints: isPoints ? 1 : 0,
          price: parsedPrice,
          currency: normalizedCurrency,
          taxesAmount: isPoints ? parsedTaxes : null,
          taxesCurrency: isPoints && parsedTaxes ? defaultFiatCurrency || 'USD' : null,
          cabinClass,
          fareTier,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to apply edited email event');
        return;
      }

      onApplied(item.id);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Network error applying email event');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SettingsModalPortal>
      <div
        role="dialog"
        aria-modal="true"
        className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4"
      >
        <div className="bg-gunmetal-card w-full h-full sm:h-auto sm:max-h-[90vh] rounded-none sm:rounded-2xl shadow-2xl border border-gunmetal-border flex flex-col overflow-hidden max-w-2xl">
          <div className="px-4 sm:px-6 py-4 border-b border-gunmetal-border flex items-center justify-between bg-gunmetal-card">
            <div className="flex items-center gap-2">
              <Pencil className="w-4 h-4 text-sky-400" />
              <h3 className="text-base sm:text-lg font-bold text-slate-100">
                {eventType === 'cancellation'
                  ? 'Select Tracked Flight to Delete'
                  : 'Review & Edit Email Event Before Applying'}
              </h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close edit modal"
              className="min-h-[44px] min-w-[44px] sm:min-h-[36px] sm:min-w-[36px] inline-flex items-center justify-center rounded-lg text-gunmetal-muted hover:text-slate-100 hover:bg-gunmetal-canvas transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto [overflow-anchor:none] p-4 sm:p-6 space-y-4 min-h-0">
            {error && (
              <div className="p-3 rounded-lg bg-rose-950/45 border border-rose-700/70 flex items-start gap-2 text-xs text-rose-200">
                <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Event Action Type
                </label>
                <SettingsSelect
                  value={eventType}
                  onChange={(e) => setEventType(e.target.value as EmailQueueEventType)}
                >
                  <option value="new_booking" className="bg-gunmetal-card text-slate-200">
                    New Booking (Add / Convert to Booked)
                  </option>
                  <option value="schedule_change" className="bg-gunmetal-card text-slate-200">
                    Schedule Change (Update Tracked Flight)
                  </option>
                  <option value="cancellation" className="bg-gunmetal-card text-slate-200">
                    Cancellation (Delete Tracked Flight)
                  </option>
                </SettingsSelect>
              </div>

              {eventType === 'new_booking' ? (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Booking Destination
                  </label>
                  <SettingsSelect
                    value={matchedFlightId}
                    onChange={(e) => setMatchedFlightId(e.target.value)}
                  >
                    <option value="" className="bg-gunmetal-card text-slate-200">
                      Create as New Booked Flight
                    </option>
                    {flights
                      .filter((f) => f.status !== 'Booked' && !f.pnr)
                      .map((f) => (
                        <option key={f.id} value={f.id} className="bg-gunmetal-card text-slate-200">
                          Convert Watched: {f.airline && f.flightNumber ? `${f.airline} ${f.flightNumber}` : 'Route'} · {f.origin || '?'}→{f.destination || '?'} ({f.departureDate})
                        </option>
                      ))}
                  </SettingsSelect>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Target Tracked Flight *
                  </label>
                  <SettingsSelect
                    value={matchedFlightId}
                    onChange={(e) => setMatchedFlightId(e.target.value)}
                  >
                    <option value="" className="bg-gunmetal-card text-slate-200">
                      -- Select Tracked Flight --
                    </option>
                    {flights.map((f) => (
                      <option key={f.id} value={f.id} className="bg-gunmetal-card text-slate-200">
                        {f.airline} {f.flightNumber || ''} · {f.origin || '?'}→{f.destination || '?'} ({f.departureDate})
                        {f.pnr ? ` [${f.pnr}]` : ''}
                      </option>
                    ))}
                  </SettingsSelect>
                </div>
              )}
            </div>

            {eventType !== 'cancellation' ? (
              <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Origin (IATA) *
                </label>
                <input
                  type="text"
                  maxLength={3}
                  value={origin}
                  onChange={(e) => setOrigin(e.target.value.toUpperCase())}
                  placeholder="JFK"
                  className="w-full min-h-[42px] border border-gunmetal-border px-3 py-2 rounded-md bg-gunmetal-canvas text-slate-200 font-mono uppercase text-sm focus:outline-none focus:border-slate-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Destination (IATA) *
                </label>
                <input
                  type="text"
                  maxLength={3}
                  value={destination}
                  onChange={(e) => setDestination(e.target.value.toUpperCase())}
                  placeholder="LAX"
                  className="w-full min-h-[42px] border border-gunmetal-border px-3 py-2 rounded-md bg-gunmetal-canvas text-slate-200 font-mono uppercase text-sm focus:outline-none focus:border-slate-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Carrier (IATA)
                </label>
                <input
                  type="text"
                  maxLength={2}
                  value={airline}
                  onChange={(e) => setAirline(e.target.value.toUpperCase())}
                  placeholder="DL"
                  className="w-full min-h-[42px] border border-gunmetal-border px-3 py-2 rounded-md bg-gunmetal-canvas text-slate-200 font-mono uppercase text-sm focus:outline-none focus:border-slate-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Flight #
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={flightNumber}
                  onChange={(e) => setFlightNumber(e.target.value.replace(/\D+/g, ''))}
                  placeholder="1428"
                  className="w-full min-h-[42px] border border-gunmetal-border px-3 py-2 rounded-md bg-gunmetal-canvas text-slate-200 font-mono text-sm focus:outline-none focus:border-slate-500"
                />
              </div>
            </div>

            {isValidAirlineCode(airline) && flightNumber.trim().length > 0 && (!origin || !destination) && (
              <div className="flex justify-end">
                <button
                  type="button"
                  disabled={detectingRoute}
                  onClick={() => void handleAutoDetectRoute()}
                  className="min-h-[44px] sm:min-h-[36px] px-3 py-1.5 rounded-md text-xs font-semibold bg-gunmetal-canvas hover:bg-gunmetal-border text-sky-300 hover:text-white border border-gunmetal-border inline-flex items-center justify-center gap-1.5 transition-colors disabled:opacity-45 disabled:pointer-events-none cursor-pointer"
                >
                  <Compass className={`w-3.5 h-3.5 ${detectingRoute ? 'animate-spin' : ''}`} />
                  <span>{detectingRoute ? 'Detecting Route...' : `Auto-Detect Route for ${airline} ${flightNumber}`}</span>
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Departure Date *
                </label>
                <input
                  type="date"
                  value={departureDate}
                  onChange={(e) => setDepartureDate(e.target.value)}
                  className="w-full min-h-[42px] border border-gunmetal-border px-3 py-2 rounded-md bg-gunmetal-canvas text-slate-200 font-mono text-sm focus:outline-none focus:border-slate-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Departure Time
                </label>
                <input
                  type="time"
                  value={departureTime}
                  onChange={(e) => setDepartureTime(e.target.value)}
                  className="w-full min-h-[42px] border border-gunmetal-border px-3 py-2 rounded-md bg-gunmetal-canvas text-slate-200 font-mono text-sm focus:outline-none focus:border-slate-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Arrival Time
                </label>
                <input
                  type="time"
                  value={arrivalTime}
                  onChange={(e) => setArrivalTime(e.target.value)}
                  className="w-full min-h-[42px] border border-gunmetal-border px-3 py-2 rounded-md bg-gunmetal-canvas text-slate-200 font-mono text-sm focus:outline-none focus:border-slate-500"
                />
              </div>
            </div>

            {/* Booking Payment Type Toggle: Cash Fare vs Points / Miles */}
            <div className="p-3.5 rounded-xl bg-gunmetal-canvas/70 border border-gunmetal-border space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Booking Payment Type
                </span>
                <div className="inline-flex rounded-lg bg-gunmetal-canvas border border-gunmetal-border p-0.5">
                  <button
                    type="button"
                    onClick={() => handlePaymentModeSwitch(false)}
                    className={`min-h-[44px] sm:min-h-[34px] px-3 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                      !isPoints
                        ? 'bg-gunmetal-border text-slate-100 border border-slate-500 shadow-sm'
                        : 'text-gunmetal-muted hover:text-slate-200'
                    }`}
                  >
                    <DollarSign className="w-3.5 h-3.5" />
                    <span>Cash Fare</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePaymentModeSwitch(true)}
                    className={`min-h-[44px] sm:min-h-[34px] px-3 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                      isPoints
                        ? 'bg-amber-950/60 text-amber-300 border border-amber-700/60 shadow-sm'
                        : 'text-gunmetal-muted hover:text-slate-200'
                    }`}
                  >
                    <Coins className="w-3.5 h-3.5 text-amber-400" />
                    <span>Points / Miles</span>
                  </button>
                </div>
              </div>

              <div className={`grid grid-cols-1 ${isPoints ? 'sm:grid-cols-4' : 'sm:grid-cols-3'} gap-3`}>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    PNR / Confirmation
                  </label>
                  <input
                    type="text"
                    maxLength={10}
                    value={pnr}
                    onChange={(e) => setPnr(e.target.value.toUpperCase())}
                    placeholder="JIFIPH"
                    className="w-full min-h-[42px] border border-gunmetal-border px-3 py-2 rounded-md bg-gunmetal-canvas text-slate-200 font-mono uppercase text-sm focus:outline-none focus:border-slate-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    {isPoints ? 'Points Redeemed' : 'Price Paid'}
                  </label>
                  <input
                    type="number"
                    step={isPoints ? '1' : '0.01'}
                    min="0"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder={isPoints ? '15400' : '348.20'}
                    className="w-full min-h-[42px] border border-gunmetal-border px-3 py-2 rounded-md bg-gunmetal-canvas text-slate-200 font-mono text-sm focus:outline-none focus:border-slate-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    {isPoints ? 'Points Program' : 'Currency'}
                  </label>
                  {isPoints ? (
                    <SettingsSelect
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                    >
                      {pointsCurrencies.length === 0 && (
                        <option value="PTS" className="bg-gunmetal-card text-slate-200">
                          PTS (Points)
                        </option>
                      )}
                      {currency &&
                        currency !== 'PTS' &&
                        !pointsCurrencies.includes(currency) && (
                          <option value={currency} className="bg-gunmetal-card text-slate-200">
                            {currency} (Detected)
                          </option>
                        )}
                      {pointsCurrencies.map((p) => (
                        <option key={p} value={p} className="bg-gunmetal-card text-slate-200">
                          {p}
                        </option>
                      ))}
                      {pointsCurrencies.length > 0 && (
                        <option value="PTS" className="bg-gunmetal-card text-slate-200">
                          PTS (Generic Points)
                        </option>
                      )}
                    </SettingsSelect>
                  ) : (
                    <input
                      type="text"
                      maxLength={5}
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                      placeholder={defaultFiatCurrency || 'USD'}
                      className="w-full min-h-[42px] border border-gunmetal-border px-3 py-2 rounded-md bg-gunmetal-canvas text-slate-200 font-mono uppercase text-sm focus:outline-none focus:border-slate-500"
                    />
                  )}
                </div>

                {isPoints && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Taxes &amp; Fees ({getCurrencySymbol(defaultFiatCurrency)})
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={taxesAmount}
                      onChange={(e) => setTaxesAmount(e.target.value)}
                      placeholder="5.60"
                      className="w-full min-h-[42px] border border-gunmetal-border px-3 py-2 rounded-md bg-gunmetal-canvas text-slate-200 font-mono text-sm focus:outline-none focus:border-slate-500"
                    />
                  </div>
                )}
              </div>

              {isPoints && (
                <p className="text-[11px] text-amber-200/85">
                  Points bookings are added in <strong>Points-Only Manual Tracking</strong> mode (automated API checks disabled).
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Cabin Class
                </label>
                <SettingsSelect
                  value={cabinClass}
                  onChange={(e) => setCabinClass(e.target.value as CabinClass)}
                >
                  <option value="economy" className="bg-gunmetal-card text-slate-200">
                    Economy
                  </option>
                  <option value="premium_economy" className="bg-gunmetal-card text-slate-200">
                    Premium Economy
                  </option>
                  <option value="business" className="bg-gunmetal-card text-slate-200">
                    Business
                  </option>
                  <option value="first" className="bg-gunmetal-card text-slate-200">
                    First Class
                  </option>
                </SettingsSelect>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Fare Tier
                </label>
                <SettingsSelect
                  value={fareTier}
                  onChange={(e) => setFareTier(e.target.value as FareTier)}
                >
                  <option value="Standard" className="bg-gunmetal-card text-slate-200">
                    Standard
                  </option>
                  <option value="Basic Economy" className="bg-gunmetal-card text-slate-200">
                    Basic Economy
                  </option>
                </SettingsSelect>
              </div>
            </div>
              </>
            ) : (
              <div className="p-3 rounded-lg bg-rose-950/30 border border-rose-800/60 text-xs text-rose-200">
                Confirming this cancellation will permanently delete the selected tracked flight and its price history.
              </div>
            )}

            <div className="pt-3 border-t border-gunmetal-border flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="min-h-[44px] sm:min-h-[38px] px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold bg-gunmetal-canvas hover:bg-gunmetal-border text-slate-300 hover:text-white border border-gunmetal-border transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className={`min-h-[44px] sm:min-h-[38px] px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold inline-flex items-center justify-center gap-1.5 border shadow-sm transition-colors disabled:opacity-45 disabled:pointer-events-none cursor-pointer ${
                  eventType === 'cancellation'
                    ? 'bg-rose-950/60 hover:bg-rose-900/80 border-rose-700/80 text-rose-200 hover:text-white'
                    : 'bg-emerald-950/60 hover:bg-emerald-900/75 border-emerald-700/80 text-emerald-200 hover:text-white'
                }`}
              >
                {eventType === 'cancellation' ? (
                  <Trash2 className="w-4 h-4" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                <span>
                  {submitting
                    ? eventType === 'cancellation'
                      ? 'Deleting...'
                      : 'Applying...'
                    : eventType === 'cancellation'
                    ? 'Delete Flight'
                    : 'Save & Apply'}
                </span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </SettingsModalPortal>
  );
}