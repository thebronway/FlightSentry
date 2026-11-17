'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Clock, SlidersHorizontal, ExternalLink, Plane } from 'lucide-react';
import { AuthStatusResponse, Settings } from '@/types';
import { evaluateOnboardingSummary } from '../types';

interface Props {
  settings: Settings;
  onFinish: () => Promise<void> | void;
}

export default function CompletionStep({ settings, onFinish }: Props) {
  const [authStatus, setAuthStatus] = useState<AuthStatusResponse | null>(null);
  const [imapCount, setImapCount] = useState(0);

  useEffect(() => {
    let active = true;
    Promise.all([
      fetch('/api/auth/session', { cache: 'no-store' })
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
      fetch('/api/email-scanner/accounts', { cache: 'no-store' })
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
    ]).then(([authData, accountsData]) => {
      if (!active) return;
      if (authData) setAuthStatus(authData);
      if (accountsData && Array.isArray(accountsData.accounts)) {
        setImapCount(accountsData.accounts.length);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const summaryItems = evaluateOnboardingSummary(settings, authStatus, imapCount);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {summaryItems.map((item) => (
          <div
            key={item.id}
            className="p-3.5 rounded-xl bg-gunmetal-canvas/70 border border-gunmetal-border flex items-start justify-between gap-3"
          >
            <div className="flex items-start gap-2.5 min-w-0">
              {item.configured ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              ) : (
                <Clock className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
              )}
              <div className="min-w-0">
                <span className="text-xs font-bold text-slate-100 block">{item.label}</span>
                <span className="text-[11px] text-gunmetal-muted block mt-0.5 leading-relaxed">
                  {item.statusText}
                </span>
              </div>
            </div>

            <Link
              href={`/settings/${item.settingsTab}`}
              onClick={() => void onFinish()}
              className="flex-shrink-0 px-2.5 py-1 rounded-md bg-gunmetal-card hover:bg-gunmetal-border border border-gunmetal-border text-[11px] font-semibold text-slate-300 hover:text-white inline-flex items-center gap-1 transition-colors"
            >
              <SlidersHorizontal className="w-3 h-3 text-sky-400" />
              <span>Edit</span>
              <ExternalLink className="w-2.5 h-2.5 opacity-75" />
            </Link>
          </div>
        ))}
      </div>

      <div className="p-4 rounded-xl bg-emerald-950/25 border border-emerald-800/50 space-y-1">
        <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-emerald-200">
          <Plane className="w-4 h-4 text-emerald-400" />
          <span>You&apos;re Ready to Track Flights</span>
        </div>
        <p className="text-xs text-emerald-200/80 leading-relaxed">
          Click <strong>Finish &amp; Open Dashboard</strong> below to start adding flights with <strong>+ Add Flight</strong>. Any settings you skipped can be adjusted anytime from the top navigation bar under <strong>Settings</strong>.
        </p>
      </div>
    </div>
  );
}