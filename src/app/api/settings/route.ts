import { NextRequest, NextResponse } from 'next/server';
import { settingsDb } from '@/db/settings';
import { settingsSchema } from '@/utils/validation';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const settings = settingsDb.get();
    return NextResponse.json(settings);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = settingsSchema.parse(body);
    
    settingsDb.update(parsed);
    const updatedSettings = settingsDb.get();
    
    return NextResponse.json(updatedSettings);
  } catch (error: any) {
    console.error("Settings API Error:", error);
    return NextResponse.json({ error: error.errors || error.message || 'Invalid input' }, { status: 400 });
  }
}