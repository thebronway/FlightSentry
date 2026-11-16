import { Suspense } from 'react';
import DashboardClient from '@/components/dashboard/DashboardClient';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={null}>
      <DashboardClient>{children}</DashboardClient>
    </Suspense>
  );
}