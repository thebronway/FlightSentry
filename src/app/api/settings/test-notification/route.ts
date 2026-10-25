import { NextRequest, NextResponse } from 'next/server';
import { sendNotification } from '@/services/apprise';
import { settingsDb } from '@/db/settings';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // We test with the provided settings from the frontend before they are saved
    const testSettings = { ...settingsDb.get(), ...body, notificationsEnabled: 1 };

    if (!testSettings.appriseUrl && !testSettings.smtpHost) {
      return NextResponse.json({ error: 'A Webhook URL or SMTP Host is required to test.' }, { status: 400 });
    }

    const title = "FlightSentry Test Notification";
    const message = "Your notification settings are configured correctly! FlightSentry will now send price drops here.";
    const htmlMessage = `<p><strong>Success!</strong> Your notification settings are configured correctly! FlightSentry will now send price drops here.</p>`;
    
    const success = await sendNotification(testSettings, title, message, htmlMessage);
    
    if (success) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ error: 'Notification dispatched but failed. Check console logs.' }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json({ error: 'Failed to send test notification' }, { status: 500 });
  }
}