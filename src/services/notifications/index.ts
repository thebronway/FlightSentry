import { Flight, Settings, RouteItinerary } from '@/types';
import { NotificationChannel, ChannelDispatchResult } from './types';
import { sendDiscordWebhook } from './channels/discord';
import { sendSlackWebhook } from './channels/slack';
import { sendGenericWebhook } from './channels/generic';
import { sendSmtpEmail } from './channels/smtp';
import { formatPriceDropAlert } from './templates/priceDropAlert';

export * from './types';
export * from './channels/discord';
export * from './channels/slack';
export * from './channels/generic';
export * from './channels/smtp';
export * from './templates/priceDropAlert';

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
  newPrice: number,
  details?: {
    airline?: string | null;
    flightNumber?: string | null;
    metadata?: string | null;
    sourceUsed?: string | null;
    itineraries?: RouteItinerary[];
  }
): Promise<void> => {
  if (settings.notificationsEnabled === 0 || flight.disableNotifications === 1) return;

  const { title, body, htmlBody } = formatPriceDropAlert(flight, newPrice, details);
  await sendNotification(settings, title, body, htmlBody);
};