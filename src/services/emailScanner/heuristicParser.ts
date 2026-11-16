import { ParsedFlightEmailEvent } from '../../types';
import {
  extractItineraryWindow,
  extractPaymentWindow,
  preprocessEmailContent,
} from './parser/textPreprocessor';
import {
  classifyEventType,
  detectCarrierFromDomain,
  detectCarrierFromText,
  extractFlightIdentity,
  extractPnr,
  isKnownTravelSender,
  resolveSenderDomain,
} from './parser/identityExtractor';
import {
  extractCabinAndFare,
  extractDepartureDate,
  extractRoute,
  extractTimes,
} from './parser/itineraryExtractor';
import { extractPaymentDetails } from './parser/paymentExtractor';

export function extractHeuristicFlightEvents(params: {
  fromAddress?: string | null;
  subject?: string | null;
  emailDate?: string | null;
  textBody?: string | null;
  htmlBody?: string | null;
  configuredPointsCurrencies?: string[];
}): ParsedFlightEmailEvent[] {
  const preprocessed = preprocessEmailContent({
    fromAddress: params.fromAddress,
    subject: params.subject,
    textBody: params.textBody,
    htmlBody: params.htmlBody,
  });

  const domain = resolveSenderDomain(preprocessed.effectiveFromAddress);
  if (!isKnownTravelSender(domain, preprocessed.combinedText)) {
    return [];
  }

  const eventType = classifyEventType(
    preprocessed.cleanSubject,
    preprocessed.combinedText
  );
  if (!eventType) {
    return [];
  }

  const resolvedCarrier =
    detectCarrierFromDomain(domain) ||
    detectCarrierFromText(preprocessed.combinedText);

  const itineraryWindow = extractItineraryWindow(preprocessed.combinedText);
  const paymentWindow = extractPaymentWindow(preprocessed.combinedText);

  const pnr = extractPnr(preprocessed.combinedText, preprocessed.cleanSubject);

  const itinIdentity = itineraryWindow
    ? extractFlightIdentity(itineraryWindow, resolvedCarrier)
    : { airline: resolvedCarrier, flightNumber: null };
  const fallbackIdentity =
    itinIdentity.airline && itinIdentity.flightNumber
      ? itinIdentity
      : extractFlightIdentity(preprocessed.combinedText, resolvedCarrier);
  const airline = itinIdentity.airline || fallbackIdentity.airline;
  const flightNumber = itinIdentity.flightNumber || fallbackIdentity.flightNumber;

  const { origin, destination } = extractRoute(
    preprocessed.combinedText,
    itineraryWindow
  );
  const departureDate = extractDepartureDate(
    preprocessed.combinedText,
    itineraryWindow,
    params.emailDate
  );
  const { departureTime, arrivalTime } = extractTimes(
    preprocessed.combinedText,
    itineraryWindow
  );
  const { cabinClass, fareTier } = extractCabinAndFare(preprocessed.combinedText);
  const payment = extractPaymentDetails(
    paymentWindow,
    airline,
    params.configuredPointsCurrencies || []
  );

  const hasActionableData = Boolean(
    (origin && destination && departureDate) ||
    (airline && flightNumber && departureDate) ||
    (pnr && (airline || origin || departureDate))
  );

  if (!hasActionableData) {
    return [];
  }

  const confidence =
    origin && destination && departureDate && (airline || pnr)
      ? 'high'
      : (origin && destination) || (airline && flightNumber)
      ? 'medium'
      : 'low';

  return [
    {
      eventType,
      pnr,
      airline,
      flightNumber,
      origin,
      destination,
      departureDate,
      departureTime,
      arrivalTime,
      cabinClass,
      fareTier,
      price: payment.price,
      currency: payment.currency,
      isPoints: payment.isPoints,
      taxesAmount: payment.taxesAmount,
      taxesCurrency: payment.taxesCurrency,
      confidence,
      parserSource: 'heuristic',
    },
  ];
}