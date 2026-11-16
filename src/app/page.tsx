import { redirect } from 'next/navigation';

interface HomePageProps {
  searchParams?: Record<string, string | string[] | undefined>;
}

export default function HomePage({ searchParams }: HomePageProps) {
  const params = new URLSearchParams();
  if (searchParams) {
    for (const [key, value] of Object.entries(searchParams)) {
      if (typeof value === 'string') {
        params.append(key, value);
      } else if (Array.isArray(value)) {
        for (const item of value) {
          params.append(key, item);
        }
      }
    }
  }
  if (params.get('emailQueue') === '1') {
    const queueItemId = params.get('queueItemId') || params.get('itemId');
    const cleanItemId = queueItemId && /^\d+$/.test(queueItemId) ? queueItemId : null;
    redirect(
      cleanItemId
        ? `/dashboard/email-queue?itemId=${cleanItemId}`
        : '/dashboard/email-queue'
    );
  }
  const queryString = params.toString();
  redirect(queryString ? `/dashboard?${queryString}` : '/dashboard');
}