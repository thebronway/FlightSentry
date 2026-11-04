import { NextRequest, NextResponse } from 'next/server';
import { settingsDb } from '@/db/settings';
import {
  sendDiscordWebhook,
  sendSlackWebhook,
  sendGenericWebhook,
  sendSmtpEmail,
  NotificationChannel,
} from '@/services/apprise';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const channel: NotificationChannel = body.channel;
    const stored = settingsDb.get();
    const config = { ...stored, ...body };

    const title = 'FlightSentry Test Notification';
    const message = 'Success! Your notification channel is configured properly. FlightSentry will dispatch price drop alerts here.';
    const htmlMessage = '<p><strong>Success!</strong> Your notification channel is configured properly. FlightSentry will dispatch price drop alerts here.</p>';

    if (channel === 'discord') {
      if (!config.discordWebhookUrl) {
        return NextResponse.json({ error: 'Discord Webhook URL is required.' }, { status: 400 });
      }
      const res = await sendDiscordWebhook(config.discordWebhookUrl, title, message);
      if (!res.success) return NextResponse.json({ error: res.error }, { status: 400 });
      return NextResponse.json({ success: true });
    }

    if (channel === 'slack') {
      if (!config.slackWebhookUrl) {
        return NextResponse.json({ error: 'Slack Webhook URL is required.' }, { status: 400 });
      }
      const res = await sendSlackWebhook(config.slackWebhookUrl, title, message);
      if (!res.success) return NextResponse.json({ error: res.error }, { status: 400 });
      return NextResponse.json({ success: true });
    }

    if (channel === 'generic') {
      const url = config.genericWebhookUrl || config.appriseUrl;
      if (!url) {
        return NextResponse.json({ error: 'Generic Webhook URL is required.' }, { status: 400 });
      }
      const res = await sendGenericWebhook(url, title, message);
      if (!res.success) return NextResponse.json({ error: res.error }, { status: 400 });
      return NextResponse.json({ success: true });
    }

    if (channel === 'smtp') {
      const res = await sendSmtpEmail(config, title, message, htmlMessage);
      if (!res.success) return NextResponse.json({ error: res.error }, { status: 400 });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: `Unknown channel "${channel}"` }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to dispatch test notification' }, { status: 500 });
  }
}