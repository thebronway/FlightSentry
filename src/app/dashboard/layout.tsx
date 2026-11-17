import { Suspense } from 'react';
import DashboardClient from '@/components/dashboard/DashboardClient';
import { initDb } from '@/db/init';
import { settingsDb } from '@/db/settings';
import { flightDb } from '@/db/flights';
import { expireOldFlights } from '@/services/scheduler';
import { Flight, Settings } from '@/types';

export const dynamic = 'force-dynamic';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let initialSettings: Settings | null = null;
  let initialFlights: Flight[] = [];

  try {
    initDb();
    initialSettings = settingsDb.get();
    expireOldFlights(initialSettings.timezone);
    initialFlights = flightDb.getAll();
  } catch (err) {
    console.error('[DashboardLayout] Failed to preload initial dashboard state:', err);
  }

  return (
    <Suspense fallback={null}>
      <DashboardClient
        initialSettings={initialSettings}
        initialFlights={initialFlights}
      >
        {children}
      </DashboardClient>
    </Suspense>
  );
}