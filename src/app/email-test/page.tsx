import { notFound } from 'next/navigation';
import { isApiTesterEnabled } from '@/utils/devGate';
import EmailTestWorkspace from '@/components/emailTest/EmailTestWorkspace';

export const dynamic = 'force-dynamic';

export default function EmailTestPage() {
  if (!isApiTesterEnabled()) {
    notFound();
  }

  return <EmailTestWorkspace />;
}