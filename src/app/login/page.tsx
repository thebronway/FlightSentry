import { Suspense } from 'react';
import LoginForm from '@/components/auth/LoginForm';

export const dynamic = 'force-dynamic';

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[70vh] flex items-center justify-center text-sm text-gunmetal-muted">
          Loading sign-in...
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}