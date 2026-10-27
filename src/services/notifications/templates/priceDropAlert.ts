import { Flight, RouteItinerary } from '@/types';
import { formatCurrency, formatPercent } from '@/utils/format';
import { getAirlineName, cleanDisplayTime } from '@/utils/airline';

export interface PriceDropAlertPayload {
  title: string;
  body: string;
  htmlBody: string;
}

export function formatPriceDropAlert(
  flight: Flight,
  newPrice: number,
  details?: {
    airline?: string | null;
    flightNumber?: string | null;
    metadata?: string | null;
    sourceUsed?: string | null;
    itineraries?: RouteItinerary[];
  }
): PriceDropAlertPayload {
  const isPurchased = flight.purchasePrice !== null && flight.purchasePrice !== undefined && flight.purchasePrice > 0;
  const benchmarkPrice = isPurchased ? flight.purchasePrice! : flight.baselinePrice;
  const benchmarkLabel = isPurchased ? 'Purchase Price' : 'Initial Baseline';
  const alertType = isPurchased ? 'Rebooking Credit Drop Alert' : 'Price Drop Alert';
  const savingsAmount = benchmarkPrice - newPrice;
  const savingsPercent = benchmarkPrice > 0 ? (savingsAmount / benchmarkPrice) * 100 : 0;

  // Resolve leading carrier and flight identification
  const leadingAirlineCode = (details?.airline || flight.airline || '').toUpperCase();
  const leadingAirlineName = getAirlineName(leadingAirlineCode);
  const leadingFlightNum = details?.flightNumber || flight.flightNumber || '';
  const flightIdentifier = leadingFlightNum
    ? `${leadingAirlineCode} ${leadingFlightNum}`
    : leadingAirlineName || leadingAirlineCode || 'Route Flight';

  // Construct cabin class query parameter for Google Flights deep-link
  const cabinClassQuery = flight.cabinClass === 'premium_economy'
    ? '%20premium%20economy'
    : flight.cabinClass === 'business'
    ? '%20business'
    : flight.cabinClass === 'first'
    ? '%20first%20class'
    : '';

  const googleFlightsUrl = `https://www.google.com/travel/flights?q=Flights%20to%20${flight.destination}%20from%20${flight.origin}%20on%20${flight.departureDate}${cabinClassQuery}%20oneway`;

  const title = `${alertType}: ${flight.origin} → ${flight.destination} via ${leadingAirlineCode}${leadingFlightNum ? ` #${leadingFlightNum}` : ''} (${formatCurrency(newPrice)})`;

  // Extract competitor itineraries captured in this query
  let itineraries: RouteItinerary[] = details?.itineraries || [];
  if (itineraries.length === 0 && details?.metadata) {
    try {
      const parsed = JSON.parse(details.metadata);
      if (Array.isArray(parsed)) itineraries = parsed;
    } catch {
      // Ignored
    }
  }

  // Aggregate competing airlines to lowest price per airline
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
  let body = `**${alertType}!**\n\n`;
  body += `**Route:** ${flight.origin} → ${flight.destination}\n`;
  body += `**Leading Flight:** ${flightIdentifier} (${leadingAirlineName})\n`;
  body += `**Departure Date:** ${flight.departureDate}\n`;
  body += `**Cabin / Fare Tier:** ${flight.cabinClass.replace('_', ' ')} (${flight.fareTier})\n`;
  if (flight.pnr) body += `**Booking Confirmation (PNR):** ${flight.pnr}\n`;
  if (details?.sourceUsed) body += `**Data Provider:** ${details.sourceUsed}\n`;
  body += `\n`;
  body += `**${benchmarkLabel}:** ${formatCurrency(benchmarkPrice)}\n`;
  body += `**New Lowest Fare:** ${formatCurrency(newPrice)}\n`;
  body += `**Total Savings:** ${formatCurrency(savingsAmount)} (${formatPercent(savingsPercent)})\n\n`;

  if (sortedCompetitors.length > 1) {
    body += `**Competing Airline Fares (Same Query):**\n`;
    sortedCompetitors.forEach(comp => {
      const isWinner = comp.code === leadingAirlineCode && comp.price === newPrice;
      const formattedTime = cleanDisplayTime(comp.departureTime);
      const parts: string[] = [];
      if (comp.flightNumber) parts.push(`#${comp.flightNumber}`);
      if (comp.isNonstop !== undefined) parts.push(comp.isNonstop ? 'Nonstop' : `${comp.stops || 1} Stop`);
      if (formattedTime) parts.push(formattedTime);
      const detailStr = parts.length > 0 ? ` (${parts.join(' · ')})` : '';
      body += `• ${isWinner ? '🏆 ' : ''}**${comp.name} (${comp.code})**: ${formatCurrency(comp.price)}${detailStr}\n`;
    });
    body += `\n`;
  }

  body += `🔗 [Verify & Book on Google Flights](${googleFlightsUrl})`;

  // HTML Body (SMTP Email)
  let htmlBody = `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b;">`;
  htmlBody += `<h2 style="color: #0f172a; margin-bottom: 4px;">${alertType}!</h2>`;
  htmlBody += `<p style="font-size: 16px; margin-top: 0; color: #475569;"><strong>${flight.origin} &rarr; ${flight.destination}</strong> &middot; ${flight.departureDate}</p>`;
  htmlBody += `<div style="background-color: #f1f5f9; padding: 14px 18px; border-radius: 8px; margin-bottom: 20px;">`;
  htmlBody += `<p style="margin: 4px 0;"><strong>Winning Flight:</strong> ${flightIdentifier} (${leadingAirlineName})</p>`;
  htmlBody += `<p style="margin: 4px 0;"><strong>Cabin Class:</strong> ${flight.cabinClass.replace('_', ' ')} &middot; <strong>Tier:</strong> ${flight.fareTier}</p>`;
  if (flight.pnr) htmlBody += `<p style="margin: 4px 0;"><strong>PNR:</strong> ${flight.pnr}</p>`;
  if (details?.sourceUsed) htmlBody += `<p style="margin: 4px 0; font-size: 12px; color: #64748b;">Verified via ${details.sourceUsed}</p>`;
  htmlBody += `</div>`;
  htmlBody += `<div style="border-top: 2px solid #e2e8f0; border-bottom: 2px solid #e2e8f0; padding: 14px 0; margin-bottom: 20px;">`;
  htmlBody += `<table style="width: 100%; border-collapse: collapse;">`;
  htmlBody += `<tr><td style="color: #64748b; padding: 4px 0;">${benchmarkLabel}:</td><td style="text-align: right; font-weight: 600;">${formatCurrency(benchmarkPrice)}</td></tr>`;
  htmlBody += `<tr><td style="color: #0f172a; font-size: 18px; font-weight: bold; padding: 4px 0;">New Lowest Price:</td><td style="text-align: right; font-size: 20px; font-weight: 800; color: #16a34a;">${formatCurrency(newPrice)}</td></tr>`;
  htmlBody += `<tr><td style="color: #16a34a; font-weight: 600; padding: 4px 0;">Total Savings:</td><td style="text-align: right; font-weight: 700; color: #16a34a;">${formatCurrency(savingsAmount)} (${formatPercent(savingsPercent)})</td></tr>`;
  htmlBody += `</table>`;
  htmlBody += `</div>`;

  if (sortedCompetitors.length > 1) {
    htmlBody += `<h3 style="font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em; color: #475569; margin-bottom: 8px;">Competing Airline Fares (Same Query)</h3>`;
    htmlBody += `<table style="width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 20px;">`;
    htmlBody += `<tr style="background-color: #f8fafc; border-bottom: 1px solid #e2e8f0; text-align: left; font-size: 11px; text-transform: uppercase; color: #64748b;"><th style="padding: 8px;">Airline</th><th style="padding: 8px;">Flight</th><th style="padding: 8px; text-align: right;">Price</th></tr>`;
    sortedCompetitors.forEach(comp => {
      const isWinner = comp.code === leadingAirlineCode && comp.price === newPrice;
      const formattedTime = cleanDisplayTime(comp.departureTime);
      htmlBody += `<tr style="border-bottom: 1px solid #f1f5f9; ${isWinner ? 'background-color: #f0fdf4; font-weight: bold;' : ''}">`;
      htmlBody += `<td style="padding: 8px;">${comp.name} (${comp.code})</td>`;
      htmlBody += `<td style="padding: 8px; color: #64748b;">${comp.flightNumber ? `#${comp.flightNumber}` : ''} ${formattedTime || ''}</td>`;
      htmlBody += `<td style="padding: 8px; text-align: right; ${isWinner ? 'color: #16a34a;' : ''}">${formatCurrency(comp.price)}</td>`;
      htmlBody += `</tr>`;
    });
    htmlBody += `</table>`;
  }

  htmlBody += `<p style="margin-top: 24px;"><a href="${googleFlightsUrl}" style="background-color: #0f172a; color: #ffffff; padding: 10px 18px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px; display: inline-block;">Verify & Book on Google Flights</a></p>`;
  htmlBody += `</div>`;

  return { title, body, htmlBody };
}