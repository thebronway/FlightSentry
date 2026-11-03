import { Flight, RouteItinerary } from '@/types';
import { formatCurrency, formatPercent } from '@/utils/format';
import { getAirlineName, cleanDisplayTime } from '@/utils/airline';

export interface PriceIncreaseAlertPayload {
  title: string;
  body: string;
  htmlBody: string;
}

export function formatPriceIncreaseAlert(
  flight: Flight,
  newPrice: number,
  details?: {
    airline?: string | null;
    flightNumber?: string | null;
    metadata?: string | null;
    sourceUsed?: string | null;
    itineraries?: RouteItinerary[];
  }
): PriceIncreaseAlertPayload {
  const benchmarkPrice = flight.baselinePrice;
  const surgeAmount = newPrice - benchmarkPrice;
  const surgePercent = benchmarkPrice > 0 ? (surgeAmount / benchmarkPrice) * 100 : 0;

  const leadingAirlineCode = (details?.airline || flight.airline || '').toUpperCase();
  const leadingAirlineName = getAirlineName(leadingAirlineCode);
  const leadingFlightNum = details?.flightNumber || flight.flightNumber || '';
  const flightIdentifier = leadingFlightNum
    ? `${leadingAirlineCode} ${leadingFlightNum}`
    : leadingAirlineName || leadingAirlineCode || 'Route Flight';

  const cabinClassQuery = flight.cabinClass === 'premium_economy'
    ? '%20premium%20economy'
    : flight.cabinClass === 'business'
    ? '%20business'
    : flight.cabinClass === 'first'
    ? '%20first%20class'
    : '';

  const googleFlightsUrl = `https://www.google.com/travel/flights?q=Flights%20to%20${flight.destination}%20from%20${flight.origin}%20on%20${flight.departureDate}${cabinClassQuery}%20oneway`;

  const title = `Price Surge Alert: ${flight.origin} → ${flight.destination} via ${leadingAirlineCode}${leadingFlightNum ? ` #${leadingFlightNum}` : ''} (${formatCurrency(newPrice)})`;

  let itineraries: RouteItinerary[] = details?.itineraries || [];
  if (itineraries.length === 0 && details?.metadata) {
    try {
      const parsed = JSON.parse(details.metadata);
      if (Array.isArray(parsed)) itineraries = parsed;
    } catch {
      // Ignored
    }
  }

  interface CompetitorSummary {
    code: string;
    name: string;
    price: number;
    flightNumber?: string;
    departureTime?: string;
    isNonstop?: boolean;
    stops?: number;
  }

  const competitorMap: Record<string, CompetitorSummary> = {};
  itineraries.forEach(it => {
    const code = (it.airline || '').toUpperCase();
    if (!code || typeof it.price !== 'number' || it.price <= 0) return;
    if (!competitorMap[code] || it.price < competitorMap[code].price) {
      competitorMap[code] = {
        code,
        name: getAirlineName(code),
        price: it.price,
        flightNumber: it.flightNumber,
        departureTime: it.departureTime,
        isNonstop: it.isNonstop,
        stops: it.stops,
      };
    }
  });

  const sortedCompetitors = Object.values(competitorMap).sort((a, b) => a.price - b.price);

  // Markdown Body (Discord, Slack, Generic Webhook)
  let body = `⚠️ **Price Surge Alert!**\n\n`;
  body += `Fares on your watched route are climbing. Consider booking soon before prices increase further.\n\n`;
  body += `**Route:** ${flight.origin} → ${flight.destination}\n`;
  body += `**Current Lowest:** ${flightIdentifier} (${leadingAirlineName})\n`;
  body += `**Departure Date:** ${flight.departureDate}\n`;
  body += `**Cabin / Fare Tier:** ${flight.cabinClass.replace('_', ' ')} (${flight.fareTier})\n`;
  if (details?.sourceUsed) body += `**Data Provider:** ${details.sourceUsed}\n`;
  body += `\n`;
  body += `**Initial Baseline:** ${formatCurrency(benchmarkPrice)}\n`;
  body += `**New Current Price:** ${formatCurrency(newPrice)}\n`;
  body += `**Price Increase:** +${formatCurrency(surgeAmount)} (+${formatPercent(surgePercent)})\n\n`;

  if (sortedCompetitors.length > 1) {
    body += `**All Competing Fares (Same Query):**\n`;
    sortedCompetitors.forEach(comp => {
      const formattedTime = cleanDisplayTime(comp.departureTime);
      const parts: string[] = [];
      if (comp.flightNumber) parts.push(`#${comp.flightNumber}`);
      if (comp.isNonstop !== undefined) parts.push(comp.isNonstop ? 'Nonstop' : `${comp.stops || 1} Stop`);
      if (formattedTime) parts.push(formattedTime);
      const detailStr = parts.length > 0 ? ` (${parts.join(' · ')})` : '';
      body += `• **${comp.name} (${comp.code})**: ${formatCurrency(comp.price)}${detailStr}\n`;
    });
    body += `\n`;
  }

  body += `🔗 [Review on Google Flights](${googleFlightsUrl})`;

  // HTML Body (SMTP Email)
  let htmlBody = `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b;">`;
  htmlBody += `<h2 style="color: #b91c1c; margin-bottom: 4px;">⚠️ Price Surge Alert!</h2>`;
  htmlBody += `<p style="font-size: 16px; margin-top: 0; color: #475569;">Fares for <strong>${flight.origin} &rarr; ${flight.destination}</strong> on ${flight.departureDate} are rising.</p>`;
  htmlBody += `<div style="background-color: #fef2f2; border: 1px solid #fecaca; padding: 14px 18px; border-radius: 8px; margin-bottom: 20px;">`;
  htmlBody += `<p style="margin: 4px 0;"><strong>Lowest Available Flight:</strong> ${flightIdentifier} (${leadingAirlineName})</p>`;
  htmlBody += `<p style="margin: 4px 0;"><strong>Cabin Class:</strong> ${flight.cabinClass.replace('_', ' ')} &middot; <strong>Tier:</strong> ${flight.fareTier}</p>`;
  if (details?.sourceUsed) htmlBody += `<p style="margin: 4px 0; font-size: 12px; color: #64748b;">Verified via ${details.sourceUsed}</p>`;
  htmlBody += `</div>`;
  htmlBody += `<div style="border-top: 2px solid #e2e8f0; border-bottom: 2px solid #e2e8f0; padding: 14px 0; margin-bottom: 20px;">`;
  htmlBody += `<table style="width: 100%; border-collapse: collapse;">`;
  htmlBody += `<tr><td style="color: #64748b; padding: 4px 0;">Initial Baseline:</td><td style="text-align: right; font-weight: 600;">${formatCurrency(benchmarkPrice)}</td></tr>`;
  htmlBody += `<tr><td style="color: #0f172a; font-size: 18px; font-weight: bold; padding: 4px 0;">New Current Fare:</td><td style="text-align: right; font-size: 20px; font-weight: 800; color: #dc2626;">${formatCurrency(newPrice)}</td></tr>`;
  htmlBody += `<tr><td style="color: #dc2626; font-weight: 600; padding: 4px 0;">Total Surge:</td><td style="text-align: right; font-weight: 700; color: #dc2626;">+${formatCurrency(surgeAmount)} (+${formatPercent(surgePercent)})</td></tr>`;
  htmlBody += `</table>`;
  htmlBody += `</div>`;

  if (sortedCompetitors.length > 1) {
    htmlBody += `<h3 style="font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em; color: #475569; margin-bottom: 8px;">All Competing Airline Fares</h3>`;
    htmlBody += `<table style="width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 20px;">`;
    htmlBody += `<tr style="background-color: #f8fafc; border-bottom: 1px solid #e2e8f0; text-align: left; font-size: 11px; text-transform: uppercase; color: #64748b;"><th style="padding: 8px;">Airline</th><th style="padding: 8px;">Flight</th><th style="padding: 8px; text-align: right;">Price</th></tr>`;
    sortedCompetitors.forEach(comp => {
      const formattedTime = cleanDisplayTime(comp.departureTime);
      htmlBody += `<tr style="border-bottom: 1px solid #f1f5f9;">`;
      htmlBody += `<td style="padding: 8px;">${comp.name} (${comp.code})</td>`;
      htmlBody += `<td style="padding: 8px; color: #64748b;">${comp.flightNumber ? `#${comp.flightNumber}` : ''} ${formattedTime || ''}</td>`;
      htmlBody += `<td style="padding: 8px; text-align: right;">${formatCurrency(comp.price)}</td>`;
      htmlBody += `</tr>`;
    });
    htmlBody += `</table>`;
  }

  htmlBody += `<p style="margin-top: 24px;"><a href="${googleFlightsUrl}" style="background-color: #dc2626; color: #ffffff; padding: 10px 18px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px; display: inline-block;">Lock In Fare on Google Flights</a></p>`;
  htmlBody += `</div>`;

  return { title, body, htmlBody };
}