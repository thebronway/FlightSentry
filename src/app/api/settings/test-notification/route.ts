import { NextRequest, NextResponse } from 'next/server';
import { sendNotification } from '@/services/apprise';

export async function POST(req: NextRequest) {
  try {
    const { appriseUrl } = await req.json();
    
    if (!appriseUrl) {
      return NextResponse.json({ error: 'Apprise URL is required' }, { status: 400 });
    }

    const title = "✈️ FlightDocket Test Notification";
    const body = "Your Apprise webhook is configured correctly! FlightDocket will now send price drops here.";
    
    const success = await sendNotification(appriseUrl, title, body);
    
    if (success) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ error: 'Notification dispatched but may have failed. Check Apprise logs.' }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json({ error: 'Failed to send test notification' }, { status: 500 });
  }
}