import { EmailQueueItem } from '@/types';
import { formatCurrency } from '@/utils/format';
import { getAirlineName } from '@/utils/airline';

export interface EmailQueueAlertPayload {
  title: string;
  body: string;
  htmlBody: string;
}

const EVENT_TYPE_LABELS: Record<EmailQueueItem['eventType'], string> = {
  new_booking: 'New Flight Booking',
  schedule_change: 'Flight Schedule Change',
  cancellation: 'Flight Cancellation Notice',
};

function resolveBaseUrl(appBaseUrl?: string | null): string {
  const cleaned = (appBaseUrl || '').trim().replace(/\/+$/, '');
  return cleaned || 'http://localhost:4000';
}

function escapeHtml(raw: string): string {
  return raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function formatEmailQueueAlert(
  items: EmailQueueItem[],
  appBaseUrl?: string | null,
  defaultCurrency: string = 'USD'
): EmailQueueAlertPayload {
  const baseUrl = resolveBaseUrl(appBaseUrl);
  const queueReviewUrl = `${baseUrl}/?emailQueue=1`;

  const isSingle = items.length === 1;
  const first = items[0];

  const title = isSingle
    ? `FlightSentry Email Detected: ${EVENT_TYPE_LABELS[first.eventType]} (${first.origin || '?'} → ${first.destination || '?'})`
    : `FlightSentry Email Scanner: ${items.length} New Flight Events Queued`;

  // Markdown Body (Discord, Slack, Generic Webhook)
  let body = isSingle
    ? `**${EVENT_TYPE_LABELS[first.eventType]} Detected**\n\n`
    : `**${items.length} New Airline Email Events Ready for Review**\n\n`;

  items.forEach((item, index) => {
    const carrierCode = (item.airline || '').toUpperCase();
    const carrierName = carrierCode ? getAirlineName(carrierCode) : 'Unknown Carrier';
    const flightIdent = carrierCode
      ? `${carrierCode}${item.flightNumber ? ` ${item.flightNumber}` : ''} (${carrierName})`
      : 'Flight Details Pending';
    const routeStr = `${item.origin || '???'} → ${item.destination || '???'}`;
    const itemUrl = `${baseUrl}/?emailQueue=1&queueItemId=${item.id}`;

    if (!isSingle) {
      body += `**${index + 1}. ${EVENT_TYPE_LABELS[item.eventType]}** — Inbox: \`${item.accountLabel}\`\n`;
    } else {
      body += `**Source Inbox:** \`${item.accountLabel}\`\n`;
    }

    body += `• **Route:** ${routeStr} · **Date:** ${item.departureDate || 'TBD'}\n`;
    body += `• **Flight:** ${flightIdent}\n`;
    if (item.pnr) body += `• **PNR:** ${item.pnr}\n`;
    if (item.price && item.price > 0) {
      body += `• **Paid Fare:** ${formatCurrency(item.price, item.currency || defaultCurrency)}\n`;
    }
    if (item.emailSubject) {
      body += `• **Subject:** ${item.emailSubject}\n`;
    }
    body += `• 👉 [Review, Edit, or Deny Item](${itemUrl})\n\n`;
  });

  body += `📥 [Open Full Email Review Queue](${queueReviewUrl})`;

  // HTML Body (SMTP Email)
  let htmlBody = `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b;">`;
  htmlBody += `<h2 style="color: #0f172a; margin-bottom: 6px;">${
    isSingle
      ? `${escapeHtml(EVENT_TYPE_LABELS[first.eventType])} Detected`
      : `${items.length} New Airline Email Events Queued`
  }</h2>`;
  htmlBody += `<p style="font-size: 14px; color: #475569; margin-top: 0;">FlightSentry staged incoming airline email events for your review before modifying tracked flights.</p>`;

  items.forEach((item) => {
    const carrierCode = (item.airline || '').toUpperCase();
    const carrierName = carrierCode ? getAirlineName(carrierCode) : 'Unknown Carrier';
    const itemUrl = `${baseUrl}/?emailQueue=1&queueItemId=${item.id}`;

    htmlBody += `<div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 16px; margin-bottom: 14px;">`;
    htmlBody += `<p style="margin: 0 0 6px 0; font-size: 13px; color: #0284c7; font-weight: 700;">${escapeHtml(
      EVENT_TYPE_LABELS[item.eventType]
    )} &middot; Inbox: ${escapeHtml(item.accountLabel)}</p>`;
    htmlBody += `<p style="margin: 4px 0; font-size: 15px;"><strong>${escapeHtml(
      item.origin || '???'
    )} &rarr; ${escapeHtml(item.destination || '???')}</strong> &middot; ${escapeHtml(
      item.departureDate || 'Date TBD'
    )}</p>`;
    htmlBody += `<p style="margin: 4px 0; font-size: 13px;"><strong>Flight:</strong> ${escapeHtml(
      carrierCode ? `${carrierCode} ${item.flightNumber || ''} (${carrierName})` : 'Pending'
    )}</p>`;
    if (item.pnr) {
      htmlBody += `<p style="margin: 4px 0; font-size: 13px;"><strong>PNR:</strong> ${escapeHtml(item.pnr)}</p>`;
    }
    if (item.price && item.price > 0) {
      htmlBody += `<p style="margin: 4px 0; font-size: 13px;"><strong>Paid Fare:</strong> ${escapeHtml(
        formatCurrency(item.price, item.currency || defaultCurrency)
      )}</p>`;
    }
    if (item.emailSubject) {
      htmlBody += `<p style="margin: 4px 0; font-size: 12px; color: #64748b;">Subject: ${escapeHtml(
        item.emailSubject
      )}</p>`;
    }
    htmlBody += `<p style="margin: 10px 0 0 0;"><a href="${escapeHtml(
      itemUrl
    )}" style="color: #0284c7; font-weight: 600; font-size: 13px; text-decoration: none;">Review, Edit, or Deny Item &rarr;</a></p>`;
    htmlBody += `</div>`;
  });

  htmlBody += `<p style="margin-top: 20px;"><a href="${escapeHtml(
    queueReviewUrl
  )}" style="background-color: #0f172a; color: #ffffff; padding: 10px 18px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px; display: inline-block;">Open Email Review Queue</a></p>`;
  htmlBody += `</div>`;

  return { title, body, htmlBody };
}