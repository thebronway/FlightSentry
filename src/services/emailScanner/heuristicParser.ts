import { ParsedFlightEmailEvent } from '../../types';
import {
  extractItineraryWindow,
  extractPaymentWindow,
  preprocessEmailContent,
  segmentItineraryBlocks,
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
    emailDate: params.emailDate,
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
  const { cabinClass: globalCabinClass, fareTier: globalFareTier } = extractCabinAndFare(
    preprocessed.combinedText
  );
  const payment = extractPaymentDetails(
    paymentWindow,
    resolvedCarrier,
    params.configuredPointsCurrencies || []
  );

  const rawSegments = itineraryWindow ? segmentItineraryBlocks(itineraryWindow) : [];
  const candidateScopes = rawSegments.length > 0 ? rawSegments : [''];
  const events: ParsedFlightEmailEvent[] = [];
  const seenLegKeys = new Set<string>();

  for (let i = 0; i < candidateScopes.length; i++) {
    const segScope = candidateScopes[i];

    const segIdentity = segScope
      ? extractFlightIdentity(segScope, resolvedCarrier)
      : { airline: resolvedCarrier, flightNumber: null };
    const fallbackIdentity =
      segIdentity.airline && segIdentity.flightNumber
        ? segIdentity
        : extractFlightIdentity(preprocessed.combinedText, resolvedCarrier);
    const airline = segIdentity.airline || fallbackIdentity.airline;
    const flightNumber = segIdentity.flightNumber || fallbackIdentity.flightNumber;

    const { origin, destination } = extractRoute(preprocessed.combinedText, segScope);
    const departureDate = extractDepartureDate(
      preprocessed.combinedText,
      segScope,
      params.emailDate
    );
    const { departureTime, arrivalTime } = extractTimes(
      preprocessed.combinedText,
      segScope
    );
    const segCabin = segScope ? extractCabinAndFare(segScope) : { cabinClass: null, fareTier: null };
    const cabinClass = segCabin.cabinClass || globalCabinClass;
    const fareTier = segCabin.fareTier || globalFareTier;

    const hasActionableData = Boolean(
      (origin && destination && departureDate) ||
      (airline && flightNumber && departureDate) ||
      (pnr && (airline || origin || departureDate))
    );

    if (!hasActionableData) {
      continue;
    }

    const legDedupKey = `${airline || ''}|${flightNumber || ''}|${origin || ''}|${destination || ''}|${departureDate || ''}`;
    if (seenLegKeys.has(legDedupKey)) {
      continue;
    }
    seenLegKeys.add(legDedupKey);

    const isPrimaryLeg = events.length === 0;
    const confidence =
      origin && destination && departureDate && (airline || pnr)
        ? 'high'
        : (origin && destination) || (airline && flightNumber)
        ? 'medium'
        : 'low';

    events.push({
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
      price: isPrimaryLeg ? payment.price : null,
      currency: isPrimaryLeg ? payment.currency : null,
      isPoints: isPrimaryLeg ? payment.isPoints : 0,
      taxesAmount: isPrimaryLeg ? payment.taxesAmount : null,
      taxesCurrency: isPrimaryLeg ? payment.taxesCurrency : null,
      transactionDate: preprocessed.transactionDate,
      confidence,
      parserSource: 'heuristic',
    });
  }

  return events;
}