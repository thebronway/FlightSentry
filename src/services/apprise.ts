import { Flight, Settings } from '../types';
import { formatCurrency, formatPercent } from '../utils/format';
import nodemailer from 'nodemailer';

export type NotificationChannel = 'discord' | 'slack' | 'generic' | 'smtp';

export interface ChannelDispatchResult {
  channel: NotificationChannel;
  success: boolean;
  error?: string;
}

// 1. Discord Webhook Dispatcher
export const sendDiscordWebhook = async (
  webhookUrl: string,
  title: string,
  body: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const payload = {
      embeds: [
        {
          title,
          description: body,
          color: 3719416, // Slate / Sky accent
          footer: { text: 'FlightSentry' },
          timestamp: new Date().toISOString(),
        },
      ],
    };
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok || res.status === 204) {
      return { success: true };
    }
    const errText = await res.text();
    return { success: false, error: `Discord HTTP ${res.status}: ${errText}` };
  } catch (err: any) {
    return { success: false, error: err.message || 'Discord request failed' };
  }
};

// 2. Slack Webhook Dispatcher
export const sendSlackWebhook = async (
  webhookUrl: string,
  title: string,
  body: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const payload = {
      text: `*${title}*\n\n${body}`,
    };
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      return { success: true };
    }
    const errText = await res.text();
    return { success: false, error: `Slack HTTP ${res.status}: ${errText}` };
  } catch (err: any) {
    return { success: false, error: err.message || 'Slack request failed' };
  }
};

// 3. Generic / Apprise Webhook Dispatcher
export const sendGenericWebhook = async (
  webhookUrl: string,
  title: string,
  body: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const payload = {
      title,
      body,
      message: body,
      format: 'markdown',
      type: 'info',
      timestamp: new Date().toISOString(),
    };
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok || res.status === 204) {
      return { success: true };
    }
    const errText = await res.text();
    return { success: false, error: `Generic Webhook HTTP ${res.status}: ${errText}` };
  } catch (err: any) {
    return { success: false, error: err.message || 'Generic webhook request failed' };
  }
};

// 4. SMTP Dispatcher
export const sendSmtpEmail = async (
  settings: Partial<Settings>,
  title: string,
  body: string,
  htmlBody?: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    if (!settings.smtpHost || !settings.smtpPort || !settings.smtpTo || !settings.smtpFrom) {
      return { success: false, error: 'Incomplete SMTP configuration (Host, Port, From, and To are required)' };
    }
    const transporter = nodemailer.createTransport({
      host: settings.smtpHost,
      port: settings.smtpPort,
      secure: settings.smtpPort === 465,
      auth: (settings.smtpUser && settings.smtpPass)
        ? { user: settings.smtpUser, pass: settings.smtpPass }
        : undefined,
    });
    await transporter.sendMail({
      from: settings.smtpFrom,
      to: settings.smtpTo,
      subject: title,
      text: body,
      html: htmlBody || body.replace(/\n/g, '<br>'),
    });
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'SMTP send failed' };
  }
};

// Multi-Channel Dispatcher
export const sendNotification = async (
  settings: Settings,
  title: string,
  body: string,
  htmlBody?: string
): Promise<boolean> => {
  if (settings.notificationsEnabled === 0) return false;

  const dispatchPromises: Promise<ChannelDispatchResult>[] = [];

  // Discord
  if (settings.discordEnabled === 1 && settings.discordWebhookUrl) {
    dispatchPromises.push(
      sendDiscordWebhook(settings.discordWebhookUrl, title, body).then(res => ({
        channel: 'discord' as const,
        ...res,
      }))
    );
  }

  // Slack
  if (settings.slackEnabled === 1 && settings.slackWebhookUrl) {
    dispatchPromises.push(
      sendSlackWebhook(settings.slackWebhookUrl, title, body).then(res => ({
        channel: 'slack' as const,
        ...res,
      }))
    );
  }

  // Generic Webhook
  const genericUrl = settings.genericWebhookUrl || settings.appriseUrl;
  if (settings.genericWebhookEnabled === 1 && genericUrl) {
    dispatchPromises.push(
      sendGenericWebhook(genericUrl, title, body).then(res => ({
        channel: 'generic' as const,
        ...res,
      }))
    );
  }

  // SMTP Email
  if (settings.smtpEnabled === 1 && settings.smtpHost) {
    dispatchPromises.push(
      sendSmtpEmail(settings, title, body, htmlBody).then(res => ({
        channel: 'smtp' as const,
        ...res,
      }))
    );
  }

  if (dispatchPromises.length === 0) {
    console.warn('[NotificationDispatcher] No active notification channels configured.');
    return false;
  }

  const results = await Promise.all(dispatchPromises);
  let anySuccess = false;

  for (const r of results) {
    if (r.success) {
      anySuccess = true;
      console.log(`[NotificationDispatcher] Successfully dispatched via ${r.channel}`);
    } else {
      console.error(`[NotificationDispatcher] Channel ${r.channel} failed:`, r.error);
    }
  }

  return anySuccess;
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