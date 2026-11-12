'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  ArrowUpCircle,
  BookOpen,
  Container,
  ExternalLink,
  Info,
  AlertTriangle,
  X,
  Clock,
} from 'lucide-react';
import { UpdateBannerStatus } from '@/types';
import SafeRichText from './common/SafeRichText';

export const UPDATES_CHANGED_EVENT = 'flightsentry:updates-changed';

const CHANGELOG_URL = 'https://github.com/thebronway/FlightSentry/blob/main/CHANGELOG.md';
const DOCKER_HUB_URL = 'https://hub.docker.com/r/thebronway/flightsentry';

function isSafeHttpUrl(rawUrl?: string | null): rawUrl is string {
  if (!rawUrl) return false;
  try {
    const parsed = new URL(rawUrl);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export default function SystemBanners() {
  const [status, setStatus] = useState<UpdateBannerStatus | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);

  const loadStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/updates', { cache: 'no-store' });
      if (res.ok) {
        const data: UpdateBannerStatus = await res.json();
        setStatus(data);
      }
    } catch {
      // Silent fallback when offline or restarting
    }
  }, []);

  useEffect(() => {
    void loadStatus();

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        void loadStatus();
      }
    };

    const handleExternalUpdate = () => {
      void loadStatus();
    };

    window.addEventListener('focus', handleExternalUpdate);
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener(UPDATES_CHANGED_EVENT, handleExternalUpdate);

    // Visibility-aware background poll (every 5 minutes) so open tabs surface new banners automatically
    const pollInterval = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        void loadStatus();
      }
    }, 5 * 60 * 1000);

    return () => {
      window.removeEventListener('focus', handleExternalUpdate);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener(UPDATES_CHANGED_EVENT, handleExternalUpdate);
      clearInterval(pollInterval);
    };
  }, [loadStatus]);

  const handleDismissUpdate = async (mode: '24h' | 'forever') => {
    if (!status?.latestVersion || busyAction) return;
    setBusyAction(`update-${mode}`);
    try {
      const res = await fetch('/api/updates/dismiss', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'update',
          version: status.latestVersion,
          mode,
        }),
      });
      if (res.ok) {
        const updated: UpdateBannerStatus = await res.json();
        setStatus(updated);
        window.dispatchEvent(new Event(UPDATES_CHANGED_EVENT));
      }
    } finally {
      setBusyAction(null);
    }
  };

  const handleDismissAnnouncement = async (id: string) => {
    if (busyAction) return;
    setBusyAction(`announcement-${id}`);
    try {
      const res = await fetch('/api/updates/dismiss', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'announcement',
          id,
        }),
      });
      if (res.ok) {
        const updated: UpdateBannerStatus = await res.json();
        setStatus(updated);
        window.dispatchEvent(new Event(UPDATES_CHANGED_EVENT));
      }
    } finally {
      setBusyAction(null);
    }
  };

  if (!status) return null;

  const hasUpdateBanner = Boolean(status.showUpdateBanner && status.latestVersion);
  const hasAnnouncements = status.announcements.length > 0;

  if (!hasUpdateBanner && !hasAnnouncements) return null;

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 space-y-3">
      {/* Update Available Banner */}
      {hasUpdateBanner && status.latestVersion && (
        <div
          role="region"
          aria-label="Application update available"
          className="rounded-lg bg-emerald-950/45 border border-emerald-700/65 px-4 py-3 text-emerald-100 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-3"
        >
          <div className="flex items-start sm:items-center gap-3 min-w-0">
            <ArrowUpCircle className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5 sm:mt-0" />
            <div className="text-xs sm:text-sm min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold text-emerald-50">
                  Update Available: FlightSentry v{status.latestVersion}
                </span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-900/60 border border-emerald-700/60 text-emerald-200">
                  Current: v{status.currentVersion}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs">
                <a
                  href={CHANGELOG_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-semibold text-emerald-300 hover:text-white underline transition-colors"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>GitHub Release Notes</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
                <a
                  href={DOCKER_HUB_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-semibold text-emerald-300 hover:text-white underline transition-colors"
                >
                  <Container className="w-3.5 h-3.5" />
                  <span>Docker Hub</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-end lg:self-center flex-shrink-0">
            <button
              type="button"
              disabled={busyAction !== null}
              onClick={() => handleDismissUpdate('24h')}
              className="min-h-[44px] sm:min-h-[32px] px-3 py-1.5 rounded-md bg-emerald-900/50 hover:bg-emerald-800/70 border border-emerald-700/70 text-emerald-100 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
            >
              <Clock className="w-3.5 h-3.5 text-emerald-300" />
              <span>Dismiss for 24 hrs</span>
            </button>
            <button
              type="button"
              disabled={busyAction !== null}
              onClick={() => handleDismissUpdate('forever')}
              className="min-h-[44px] sm:min-h-[32px] px-3 py-1.5 rounded-md bg-gunmetal-card/80 hover:bg-gunmetal-border border border-emerald-800/70 text-emerald-200 hover:text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>Dismiss forever</span>
            </button>
          </div>
        </div>
      )}

      {/* Active Announcement Banners */}
      {status.announcements.map((item) => {
        const isWarning = item.severity === 'warning';
        const validLink = isSafeHttpUrl(item.linkUrl) ? item.linkUrl : null;

        return (
          <div
            key={item.id}
            role="region"
            aria-label={item.title}
            className={`rounded-lg px-4 py-3 border shadow-sm flex items-start justify-between gap-3 ${
              isWarning
                ? 'bg-amber-950/45 border-amber-700/70 text-amber-100'
                : 'bg-sky-950/45 border-sky-800/65 text-slate-100'
            }`}
          >
            <div className="flex items-start gap-3 min-w-0">
              {isWarning ? (
                <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
              ) : (
                <Info className="w-5 h-5 text-sky-400 flex-shrink-0 mt-0.5" />
              )}
              <div className="text-xs sm:text-sm min-w-0 space-y-1">
                <div className="font-bold text-white">{item.title}</div>
                <p className="text-xs leading-relaxed opacity-95">
                  <SafeRichText text={item.message} />
                </p>
                {validLink && (
                  <div className="pt-0.5">
                    <a
                      href={validLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`inline-flex items-center gap-1 text-xs font-semibold underline transition-colors ${
                        isWarning
                          ? 'text-amber-300 hover:text-white'
                          : 'text-sky-300 hover:text-white'
                      }`}
                    >
                      <span>{item.linkText?.trim() || 'Learn more'}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </div>
            </div>

            <button
              type="button"
              disabled={busyAction !== null}
              onClick={() => handleDismissAnnouncement(item.id)}
              title="Dismiss announcement"
              aria-label={`Dismiss announcement: ${item.title}`}
              className={`min-h-[44px] min-w-[44px] sm:min-h-[32px] sm:min-w-[32px] rounded-md border flex items-center justify-center flex-shrink-0 transition-colors disabled:opacity-50 cursor-pointer ${
                isWarning
                  ? 'bg-amber-900/40 hover:bg-amber-800/60 border-amber-700/60 text-amber-200 hover:text-white'
                  : 'bg-sky-900/40 hover:bg-sky-800/60 border-sky-700/60 text-sky-200 hover:text-white'
              }`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}