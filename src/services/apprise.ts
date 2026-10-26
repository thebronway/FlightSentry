import { Flight, Settings } from '../types';
import { formatCurrency, formatPercent } from '../utils/format';
import nodemailer from 'nodemailer';

export const sendNotification = async (
  settings: Settings,
  title: string,
  body: string,
  htmlBody?: string
): Promise<boolean> => {
  if (settings.notificationsEnabled === 0) return false;

  let success = false;

  // 1. Webhook / Apprise Dispatch
  if (settings.appriseUrl) {
    try {
      const response = await fetch(settings.appriseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, body, format: 'markdown', type: 'info' }),
      });
      if (response.ok) success = true;
      else console.error(`Webhook failed with status: ${response.status}`);
    } catch (error) {
      console.error('Webhook notification failed:', error);
    }
  }

  // 2. SMTP Dispatch
  if (settings.smtpHost && settings.smtpPort && settings.smtpTo && settings.smtpFrom) {
    try {
      const transporter = nodemailer.createTransport({
        host: settings.smtpHost,
        port: settings.smtpPort,
        secure: settings.smtpPort === 465,
        auth: (settings.smtpUser && settings.smtpPass) ? {
          user: settings.smtpUser,
          pass: settings.smtpPass,
        } : undefined,
      });

      await transporter.sendMail({
        from: settings.smtpFrom,
        to: settings.smtpTo,
        subject: title,
        text: body,
        html: htmlBody || body.replace(/\n/g, '<br>'),
      });
      success = true;
    } catch (error) {
      console.error('SMTP notification failed:', error);
    }
  }

  return success;
};

export const sendPriceDropAlert = async (
  settings: Settings,
  flight: Flight,
  newPrice: number
): Promise<void> => {
  if (settings.notificationsEnabled === 0 || flight.disableNotifications === 1) return;

  const isPurchased = flight.purchasePrice !== null && flight.purchasePrice !== undefined && flight.purchasePrice > 0;
  const benchmarkPrice = isPurchased ? flight.purchasePrice! : flight.baselinePrice;
  const benchmarkLabel = isPurchased ? 'Purchase Price' : 'Initial Baseline';
  const alertType = isPurchased ? 'Rebooking Credit Drop Alert' : 'Price Drop Alert';

  const savingsAmount = benchmarkPrice - newPrice;
  const savingsPercent = benchmarkPrice > 0 ? (savingsAmount / benchmarkPrice) * 100 : 0;
  const googleFlightsUrl = `https://www.google.com/travel/flights?q=Flights%20to%20${flight.destination}%20from%20${flight.origin}%20on%20${flight.departureDate}%20oneway`;

  const title = `${alertType}: ${flight.origin} to ${flight.destination} (${formatCurrency(newPrice)})`;
  
  let body = `**${alertType}!**\n\n`;
  body += `**Route:** ${flight.origin} to ${flight.destination}\n`;
  body += `**Flight:** ${flight.airline} ${flight.flightNumber || ''} | **Tier:** ${flight.fareTier}\n`;
  body += `**Date:** ${flight.departureDate}\n`;
  if (flight.pnr) body += `**PNR:** ${flight.pnr}\n`;
  body += `\n`;
  body += `**${benchmarkLabel}:** ${formatCurrency(benchmarkPrice)}\n`;
  body += `**New Price:** ${formatCurrency(newPrice)}\n`;
  body += `**Savings:** ${formatCurrency(savingsAmount)} (${formatPercent(savingsPercent)})\n\n`;
  body += `Verify on Google Flights: ${googleFlightsUrl}`;

  let htmlBody = `<h2>${alertType}!</h2>`;
  htmlBody += `<p><strong>Route:</strong> ${flight.origin} to ${flight.destination}<br>`;
  htmlBody += `<strong>Flight:</strong> ${flight.airline} ${flight.flightNumber || ''} | <strong>Tier:</strong> ${flight.fareTier}<br>`;
  htmlBody += `<strong>Date:</strong> ${flight.departureDate}<br>`;
  if (flight.pnr) htmlBody += `<strong>PNR:</strong> ${flight.pnr}</p>`;
  htmlBody += `<p><strong>${benchmarkLabel}:</strong> ${formatCurrency(benchmarkPrice)}<br>`;
  htmlBody += `<strong>New Price:</strong> ${formatCurrency(newPrice)}<br>`;
  htmlBody += `<strong>Savings:</strong> ${formatCurrency(savingsAmount)} (${formatPercent(savingsPercent)})</p>`;
  htmlBody += `<p><a href="${googleFlightsUrl}">Verify on Google Flights</a></p>`;

  await sendNotification(settings, title, body, htmlBody);
};