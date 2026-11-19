'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Settings, LayoutDashboard, Mail, LogOut } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const isLoginPage = pathname === '/login';
  const [pendingQueueCount, setPendingQueueCount] = useState(0);
  const [authEnabled, setAuthEnabled] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const fetchAuthStatus = useCallback(async () => {
    if (isLoginPage) return;
    try {
      const res = await fetch('/api/auth/session', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setAuthEnabled(Boolean(data.authEnabled && data.authenticated));
      }
    } catch {
      // Ignore transient network errors
    }
  }, [isLoginPage]);

  const fetchQueueCount = useCallback(async () => {
    if (isLoginPage) return;
    try {
      const res = await fetch('/api/email-queue', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setPendingQueueCount(typeof data.count === 'number' ? data.count : 0);
      }
    } catch {
      // Ignore transient network errors
    }
  }, [isLoginPage]);

  useEffect(() => {
    if (isLoginPage) return;
    void fetchAuthStatus();
    void fetchQueueCount();

    const handleQueueUpdated = () => {
      void fetchQueueCount();
    };
    const handleAuthChanged = () => {
      void fetchAuthStatus();
    };

    window.addEventListener('flightsentry:email-queue-updated', handleQueueUpdated);
    window.addEventListener('flightsentry:auth-changed', handleAuthChanged);
    window.addEventListener('focus', handleQueueUpdated);
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        void fetchQueueCount();
      }
    }, 45000);

    return () => {
      window.removeEventListener('flightsentry:email-queue-updated', handleQueueUpdated);
      window.removeEventListener('flightsentry:auth-changed', handleAuthChanged);
      window.removeEventListener('focus', handleQueueUpdated);
      clearInterval(interval);
    };
  }, [isLoginPage, fetchAuthStatus, fetchQueueCount]);

  const handleOpenEmailQueue = () => {
    if (pathname === '/dashboard/email-queue') {
      window.dispatchEvent(new CustomEvent('flightsentry:open-email-queue'));
    } else {
      router.push('/dashboard/email-queue');
    }
  };

  const handleSignOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // Proceed to login even on transient error
    } finally {
      window.location.assign('/login');
    }
  };

  if (isLoginPage) {
    return null;
  }

  return (
    <nav className="bg-gunmetal-nav shadow-sm border-b border-gunmetal-border transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center space-x-3 text-white">
          <Image src="/FlightSentry-icon-sm.png" alt="FlightSentry Logo" width={160} height={40} className="h-[42px] w-auto object-contain rounded" />
          <span className="font-bold text-xl tracking-tight">FlightSentry</span>
        </Link>
        <div className="flex items-center space-x-2 sm:space-x-4">
          {pendingQueueCount > 0 && (
            <button
              type="button"
              onClick={handleOpenEmailQueue}
              title={`Review ${pendingQueueCount} pending email event(s)`}
              className="min-h-[44px] sm:min-h-[38px] flex items-center space-x-1.5 px-3 py-2 rounded-md text-sm font-semibold bg-sky-950/60 hover:bg-sky-900/70 text-sky-200 border border-sky-700/70 shadow-sm transition-colors cursor-pointer"
            >
              <Mail className="w-4 h-4 text-sky-400" />
              <span className="hidden md:inline">Email Queue</span>
              <span className="px-1.5 py-0.2 rounded-full text-[11px] font-mono font-bold bg-sky-500 text-slate-950">
                {pendingQueueCount}
              </span>
            </button>
          )}
          <Link 
              href="/dashboard" 
              title="Dashboard"
              className={`min-h-[44px] min-w-[44px] sm:min-h-[38px] sm:min-w-0 flex items-center justify-center space-x-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${pathname.startsWith('/dashboard') ? 'bg-gunmetal-border border border-slate-500 text-slate-100 shadow-sm' : 'text-gunmetal-muted hover:bg-gunmetal-card'}`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span className="hidden sm:inline">Dashboard</span>
          </Link>
          <Link 
              href="/settings/general" 
              title="Settings"
              className={`min-h-[44px] min-w-[44px] sm:min-h-[38px] sm:min-w-0 flex items-center justify-center space-x-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${pathname.startsWith('/settings') ? 'bg-gunmetal-border border border-slate-500 text-slate-100 shadow-sm' : 'text-gunmetal-muted hover:bg-gunmetal-card'}`}
          >
            <Settings className="w-4 h-4" />
            <span className="hidden sm:inline">Settings</span>
          </Link>
          {authEnabled && (
            <button
              type="button"
              onClick={handleSignOut}
              disabled={signingOut}
              title="Sign Out"
              className="min-h-[44px] min-w-[44px] sm:min-h-[38px] sm:min-w-0 flex items-center justify-center space-x-1.5 px-3 py-2 rounded-md text-sm font-medium text-gunmetal-muted hover:text-rose-200 hover:bg-rose-950/40 border border-transparent hover:border-rose-800/60 transition-colors disabled:opacity-50 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">{signingOut ? 'Signing Out...' : 'Sign Out'}</span>
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}