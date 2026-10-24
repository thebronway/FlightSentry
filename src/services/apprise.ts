import { Flight } from '../types';
import { formatCurrency, formatPercent } from '../utils/format';

export const sendNotification = async (
  appriseUrl: string | null | undefined, 
  title: string, 
  body: string
): Promise<boolean> => {
  if (!appriseUrl) return false;

  try {
    const response = await fetch(appriseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title,
        body,
        format: 'markdown',
        type: 'info'
      }),
    });

    return response.ok;
  } catch (error) {
    console.error('Apprise notification failed:', error);
    return false;
  }
};

export const sendPriceDropAlert = async (
  appriseUrl: string | null | undefined,
  flight: Flight,
  newPrice: number
): Promise<void> => {
  if (!appriseUrl) return;

  const savingsAmount = flight.baselinePrice - newPrice;
  const savingsPercent = (savingsAmount / flight.baselinePrice) * 100;
  
  const googleFlightsUrl = `https://www.google.com/travel/flights?q=Flights%20to%20${flight.destination}%20from%20${flight.origin}%20on%20${flight.departureDate}%20oneway`;

  const title = `📉 Flight Drop: ${flight.origin} ✈️ ${flight.destination} (${formatCurrency(newPrice)})`;
  
  let body = `**Price Drop Alert!**\n\n`;
  body += `**Route:** ${flight.origin} to ${flight.destination}\n`;
  body += `**Flight:** ${flight.airline} ${flight.flightNumber} | **Tier:** ${flight.fareTier}\n`;
  body += `**Date:** ${flight.departureDate}\n`;
  if (flight.pnr) body += `**PNR:** ${flight.pnr}\n`;
  body += `\n`;
  body += `**Baseline:** ${formatCurrency(flight.baselinePrice)}\n`;
  body += `**New Price:** ${formatCurrency(newPrice)}\n`;
  body += `**Savings:** ${formatCurrency(savingsAmount)} (${formatPercent(savingsPercent)})\n\n`;
  body += `[Verify on Google Flights](${googleFlightsUrl})`;

  await sendNotification(appriseUrl, title, body);
};