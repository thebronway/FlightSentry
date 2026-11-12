import packageInfo from '../../package.json';
import { settingsDb } from '../db/settings';
import { releaseSyncDb } from '../db/releaseSync';
import { AnnouncementItem, ReleaseSyncState, UpdateBannerStatus } from '../types';
import { announcementsFileSchema } from '../utils/validation';
import {
  extractLatestChangelogVersion,
  isNewerVersion,
  isVersionAtOrBelow,
} from '../utils/semver';

const GITHUB_RAW_BASE = 'https://raw.githubusercontent.com/thebronway/FlightSentry/main';
const CHANGELOG_URL = `${GITHUB_RAW_BASE}/CHANGELOG.md`;
const ANNOUNCEMENTS_URL = `${GITHUB_RAW_BASE}/.github/announcements.json`;
const SYNC_INTERVAL_MS = 24 * 60 * 60 * 1000;
const FETCH_TIMEOUT_MS = 8000;
const MAX_CHANGELOG_BYTES = 512 * 1024;

let inFlightSync: Promise<ReleaseSyncState> | null = null;

export function isSyncStale(lastCheckedAt: string | null | undefined): boolean {
  if (!lastCheckedAt) return true;
  const parsed = Date.parse(lastCheckedAt);
  if (Number.isNaN(parsed)) return true;
  return Date.now() - parsed >= SYNC_INTERVAL_MS;
}

async function fetchWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, {
      method: 'GET',
      cache: 'no-store',
      signal: controller.signal,
      headers: {
        'User-Agent': `FlightSentry/${packageInfo.version}`,
        Accept: 'text/plain, application/json',
      },
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function performGitHubSync(): Promise<ReleaseSyncState> {
  const nowIso = new Date().toISOString();

  const [changelogSettled, announcementsSettled] = await Promise.allSettled([
    fetchWithTimeout(CHANGELOG_URL),
    fetchWithTimeout(ANNOUNCEMENTS_URL),
  ]);

  let changelogOk = false;
  let parsedLatestVersion: string | undefined = undefined;

  if (changelogSettled.status === 'fulfilled' && changelogSettled.value.ok) {
    try {
      const rawMarkdown = await changelogSettled.value.text();
      const boundedMarkdown = rawMarkdown.slice(0, MAX_CHANGELOG_BYTES);
      const extracted = extractLatestChangelogVersion(boundedMarkdown);
      if (extracted) {
        parsedLatestVersion = extracted;
      }
      changelogOk = true;
    } catch {
      // Ignore malformed body; keep cached version
    }
  }

  let announcementsOk = false;
  let validatedAnnouncementsJson: string | undefined = undefined;

  if (announcementsSettled.status === 'fulfilled') {
    const res = announcementsSettled.value;
    if (res.ok) {
      try {
        const rawJson = await res.json();
        const parsed = announcementsFileSchema.safeParse(rawJson);
        if (parsed.success) {
          validatedAnnouncementsJson = JSON.stringify(parsed.data);
          announcementsOk = true;
        }
      } catch {
        // Ignore invalid JSON; preserve cached announcements
      }
    } else if (res.status === 404) {
      // Upstream announcements file not published yet; treat as empty list
      validatedAnnouncementsJson = '[]';
      announcementsOk = true;
    }
  }

  if (changelogOk || announcementsOk) {
    return releaseSyncDb.saveSyncResult({
      latestVersion: parsedLatestVersion,
      announcementsJson: validatedAnnouncementsJson,
      lastCheckedAt: nowIso,
      lastSyncStatus: 'ok',
    });
  }

  // Silent offline / air-gapped fallback: preserve cached version & announcements
  return releaseSyncDb.saveSyncResult({
    lastCheckedAt: nowIso,
    lastSyncStatus: 'offline',
  });
}

export async function syncGitHubMetadata(options?: { force?: boolean }): Promise<ReleaseSyncState> {
  const force = Boolean(options?.force);
  const settings = settingsDb.get();
  const state = releaseSyncDb.get();
  const githubSyncEnabled = (settings.githubSyncEnabled ?? 1) === 1;

  if (!force) {
    if (!githubSyncEnabled) {
      return state;
    }
    if (!isSyncStale(state.lastCheckedAt)) {
      return state;
    }
  }

  if (inFlightSync) {
    return inFlightSync;
  }

  inFlightSync = performGitHubSync().finally(() => {
    inFlightSync = null;
  });

  return inFlightSync;
}

function getActiveAnnouncements(
  announcementsJson: string,
  currentVersion: string,
  dismissedIds: string[]
): AnnouncementItem[] {
  let rawItems: unknown;
  try {
    rawItems = JSON.parse(announcementsJson);
  } catch {
    return [];
  }

  const parsed = announcementsFileSchema.safeParse(rawItems);
  if (!parsed.success) {
    return [];
  }

  const now = Date.now();
  const dismissedSet = new Set(dismissedIds);

  return parsed.data.filter((item) => {
    if (!item.active) return false;
    if (dismissedSet.has(item.id)) return false;

    if (item.expiresAt) {
      const expiresMs = Date.parse(item.expiresAt);
      if (!Number.isNaN(expiresMs) && expiresMs <= now) {
        return false;
      }
    }

    if (item.maxVersion) {
      if (!isVersionAtOrBelow(currentVersion, item.maxVersion)) {
        return false;
      }
    }

    return true;
  });
}

export async function getUpdateBannerStatus(options?: {
  triggerBackgroundRefresh?: boolean;
}): Promise<UpdateBannerStatus> {
  const settings = settingsDb.get();
  const state = releaseSyncDb.get();
  const currentVersion = packageInfo.version;
  const githubSyncEnabled = (settings.githubSyncEnabled ?? 1) === 1;

  if (
    options?.triggerBackgroundRefresh !== false &&
    githubSyncEnabled &&
    isSyncStale(state.lastCheckedAt)
  ) {
    void syncGitHubMetadata({ force: false });
  }

  const latestVersion = state.latestVersion ?? null;
  const updateAvailable = Boolean(latestVersion && isNewerVersion(latestVersion, currentVersion));

  let showUpdateBanner = updateAvailable;
  if (showUpdateBanner && latestVersion && state.dismissedUpdateVersion === latestVersion) {
    if (!state.dismissedUpdateUntil) {
      // Dismissed forever for this version
      showUpdateBanner = false;
    } else {
      const snoozeUntilMs = Date.parse(state.dismissedUpdateUntil);
      if (!Number.isNaN(snoozeUntilMs) && snoozeUntilMs > Date.now()) {
        showUpdateBanner = false;
      }
    }
  }

  const dismissedIds = releaseSyncDb.getDismissedAnnouncementIds();
  const announcements = getActiveAnnouncements(
    state.announcementsJson,
    currentVersion,
    dismissedIds
  );

  return {
    currentVersion,
    latestVersion,
    updateAvailable,
    showUpdateBanner,
    githubSyncEnabled,
    lastCheckedAt: state.lastCheckedAt ?? null,
    lastSyncStatus: state.lastSyncStatus,
    announcements,
  };
}