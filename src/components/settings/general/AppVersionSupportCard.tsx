'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Globe,
  Github,
  Coffee,
  BookOpen,
  ExternalLink,
  RefreshCw,
  ArrowUpCircle,
  Container,
} from 'lucide-react';
import packageInfo from '../../../../package.json';
import { UpdateBannerStatus } from '@/types';
import { UPDATES_CHANGED_EVENT } from '@/components/SystemBanners';
import SettingsCard from '../shared/SettingsCard';

interface Props {
  githubSyncEnabled: boolean;
  onToggleGithubSync: (enabled: boolean) => void;
}

export default function AppVersionSupportCard({
  githubSyncEnabled,
  onToggleGithubSync,
}: Props) {
  const [updateStatus, setUpdateStatus] = useState<UpdateBannerStatus | null>(null);
  const [checking, setChecking] = useState(false);

  const loadUpdateStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/updates', { cache: 'no-store' });
      if (res.ok) {
        const data: UpdateBannerStatus = await res.json();
        setUpdateStatus(data);
      }
    } catch {
      // Silent offline fallback
    }
  }, []);

  useEffect(() => {
    void loadUpdateStatus();
    const onUpdatesChanged = () => {
      void loadUpdateStatus();
    };
    window.addEventListener(UPDATES_CHANGED_EVENT, onUpdatesChanged);
    return () => {
      window.removeEventListener(UPDATES_CHANGED_EVENT, onUpdatesChanged);
    };
  }, [loadUpdateStatus]);

  const handleCheckNow = async () => {
    if (checking) return;
    setChecking(true);
    try {
      const res = await fetch('/api/updates', { method: 'POST' });
      if (res.ok) {
        const data: UpdateBannerStatus = await res.json();
        setUpdateStatus(data);
        window.dispatchEvent(new Event(UPDATES_CHANGED_EVENT));
      }
    } finally {
      setChecking(false);
    }
  };

  const formattedLastChecked = updateStatus?.lastCheckedAt
    ? new Date(updateStatus.lastCheckedAt).toLocaleString()
    : 'Never';

  return (
    <SettingsCard className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-gunmetal-border/70">
        <div className="space-y-1">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
            Application Version
          </h4>
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="text-base font-bold text-slate-100 font-mono">
              FlightSentry v{packageInfo.version}
            </span>
            {updateStatus?.updateAvailable && updateStatus.latestVersion && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-950/70 text-emerald-300 border border-emerald-700/70">
                <ArrowUpCircle className="w-3.5 h-3.5 text-emerald-400" />
                <span>Update available (v{updateStatus.latestVersion})</span>
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <a
            href="https://github.com/thebronway/FlightSentry/blob/main/CHANGELOG.md"
            target="_blank"
            rel="noopener noreferrer"
            className="min-h-[44px] sm:min-h-[36px] px-3 py-2 rounded-md bg-gunmetal-canvas border border-gunmetal-border hover:border-slate-500 hover:bg-gunmetal-border/40 text-slate-200 hover:text-white text-xs font-semibold inline-flex items-center gap-1.5 shadow-sm transition-colors"
          >
            <BookOpen className="w-3.5 h-3.5 text-sky-400" />
            <span>Release Notes</span>
            <ExternalLink className="w-3 h-3 text-gunmetal-muted" />
          </a>
          <a
            href="https://hub.docker.com/r/thebronway/flightsentry"
            target="_blank"
            rel="noopener noreferrer"
            className="min-h-[44px] sm:min-h-[36px] px-3 py-2 rounded-md bg-gunmetal-canvas border border-gunmetal-border hover:border-slate-500 hover:bg-gunmetal-border/40 text-slate-200 hover:text-white text-xs font-semibold inline-flex items-center gap-1.5 shadow-sm transition-colors"
          >
            <Container className="w-3.5 h-3.5 text-sky-400" />
            <span>Docker Hub</span>
            <ExternalLink className="w-3 h-3 text-gunmetal-muted" />
          </a>
        </div>
      </div>

      {/* Automatic 24-Hour GitHub Update & Announcement Checks */}
      <div className="pb-3 border-b border-gunmetal-border/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <label className="min-h-[44px] sm:min-h-0 flex items-center gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={githubSyncEnabled}
              onChange={(e) => onToggleGithubSync(e.target.checked)}
              className="w-4 h-4 accent-slate-500 rounded cursor-pointer"
            />
            <span className="text-xs font-semibold text-slate-200">
              Automatic GitHub Update &amp; Announcement Checks (Every 24 Hours)
            </span>
          </label>
          <p className="text-[11px] text-gunmetal-muted pl-6">
            Checks GitHub for new releases and important notices with silent offline fallback.
            Last checked: <span className="font-mono text-slate-300">{formattedLastChecked}</span>
            {updateStatus?.lastSyncStatus === 'offline' && (
              <span className="ml-1.5 text-amber-400">(Offline / Cached)</span>
            )}
          </p>
        </div>

        <button
          type="button"
          disabled={checking}
          onClick={handleCheckNow}
          className="self-start sm:self-center min-h-[44px] sm:min-h-[36px] px-3.5 py-2 rounded-md bg-gunmetal-border hover:bg-slate-700 border border-slate-500 text-slate-100 text-xs font-semibold inline-flex items-center gap-1.5 shadow-sm transition-colors disabled:opacity-50 cursor-pointer flex-shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-sky-400 ${checking ? 'animate-spin' : ''}`} />
          <span>{checking ? 'Checking...' : 'Check Now'}</span>
        </button>
      </div>

      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2.5">
          Support & Project Links
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <a
            href="https://brian.conway.im/"
            target="_blank"
            rel="noopener noreferrer"
            className="min-h-[44px] p-3 rounded-md bg-gunmetal-canvas border border-gunmetal-border hover:border-slate-500 hover:bg-gunmetal-border/40 transition-colors flex items-center gap-2.5 text-xs font-semibold text-slate-200 group"
          >
            <Globe className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
            <span>Developer&apos;s Website</span>
            <ExternalLink className="w-3 h-3 text-gunmetal-muted ml-auto" />
          </a>

          <a
            href="https://github.com/thebronway/FlightSentry/issues"
            target="_blank"
            rel="noopener noreferrer"
            className="min-h-[44px] p-3 rounded-md bg-gunmetal-canvas border border-gunmetal-border hover:border-slate-500 hover:bg-gunmetal-border/40 transition-colors flex items-center gap-2.5 text-xs font-semibold text-slate-200 group"
          >
            <Github className="w-4 h-4 text-purple-400 group-hover:scale-110 transition-transform" />
            <span>Report An Issue</span>
            <ExternalLink className="w-3 h-3 text-gunmetal-muted ml-auto" />
          </a>

          <a
            href="https://buymeacoffee.com/brianconway"
            target="_blank"
            rel="noopener noreferrer"
            className="min-h-[44px] p-3 rounded-md bg-gunmetal-canvas border border-gunmetal-border hover:border-slate-500 hover:bg-gunmetal-border/40 transition-colors flex items-center gap-2.5 text-xs font-semibold text-slate-200 group"
          >
            <Coffee className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
            <span>Support FlightSentry</span>
            <ExternalLink className="w-3 h-3 text-gunmetal-muted ml-auto" />
          </a>
        </div>
      </div>
    </SettingsCard>
  );
}