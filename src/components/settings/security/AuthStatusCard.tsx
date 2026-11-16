'use client';

import { ShieldCheck, ShieldOff, Terminal, KeyRound } from 'lucide-react';
import { AuthStatusResponse } from '@/types';
import SettingsCard from '../shared/SettingsCard';

interface Props {
  status: AuthStatusResponse;
  onRequestDisable: () => void;
}

export default function AuthStatusCard({ status, onRequestDisable }: Props) {
  return (
    <SettingsCard>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div
            className={`p-2.5 rounded-lg border flex-shrink-0 ${
              status.authEnabled
                ? 'bg-emerald-950/50 border-emerald-700/60 text-emerald-400'
                : 'bg-gunmetal-card border-gunmetal-border text-gunmetal-muted'
            }`}
          >
            {status.authEnabled ? (
              <ShieldCheck className="w-5 h-5" />
            ) : (
              <ShieldOff className="w-5 h-5" />
            )}
          </div>

          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-bold text-slate-100">Instance Access Protection</h3>
              <span
                className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                  status.authEnabled
                    ? 'bg-emerald-950/70 border-emerald-700/70 text-emerald-300'
                    : 'bg-zinc-900 border-gunmetal-border text-gunmetal-muted'
                }`}
              >
                {status.authEnabled ? 'Enabled (Locked)' : 'Disabled (Unlocked)'}
              </span>
              {status.envManaged && (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-sky-950/70 border border-sky-700/70 text-sky-300 inline-flex items-center gap-1">
                  <Terminal className="w-3 h-3" />
                  <span>Env Managed</span>
                </span>
              )}
            </div>

            <p className="text-xs text-gunmetal-muted leading-relaxed">
              {status.authEnabled
                ? `Sign-in is required for dashboard pages and API routes as "${status.username}"${
                    status.passkeyCount > 0
                      ? ` (${status.passkeyCount} passkey${status.passkeyCount === 1 ? '' : 's'} enrolled)`
                      : ''
                  }.`
                : 'Authentication is disabled by default for trusted local/homelab networks. Set a username and password below to require sign-in.'}
            </p>
          </div>
        </div>

        {status.authEnabled && !status.envManaged && (
          <button
            type="button"
            onClick={onRequestDisable}
            className="self-start sm:self-center flex-shrink-0 min-h-[44px] sm:min-h-[38px] px-3.5 py-2 rounded-md bg-rose-950/45 hover:bg-rose-900/65 border border-rose-800/70 text-rose-200 text-xs font-semibold transition-colors cursor-pointer"
          >
            Disable Authentication
          </button>
        )}
      </div>

      {status.envManaged && (
        <div className="mt-4 p-3 rounded-lg bg-sky-950/30 border border-sky-800/50 text-xs text-sky-200/90 flex items-start gap-2.5">
          <KeyRound className="w-4 h-4 text-sky-400 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-sky-100">
              Controlled by Container Environment Variables
            </p>
            <p className="leading-relaxed text-sky-200/80">
              <code className="text-sky-100">AUTH_USERNAME</code> and{' '}
              <code className="text-sky-100">AUTH_PASSWORD</code> are set in your container environment. Update or remove those environment variables and restart the container to change credentials or unlock the instance.
            </p>
          </div>
        </div>
      )}
    </SettingsCard>
  );
}