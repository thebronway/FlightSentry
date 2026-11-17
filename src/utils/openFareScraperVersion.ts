import { compareSemver, normalizeSemver } from './semver';

/**
 * OpenFareScraper Version Compatibility Policy
 *
 * Update these two constants whenever OpenFareScraper ships breaking API changes,
 * security fixes, or new recommended features, then rebuild the Docker image.
 *
 * - version >= OPENFARESCRAPER_RECOMMENDED_VERSION  -> 'supported' (green)
 * - OPENFARESCRAPER_MIN_VERSION <= version < RECOMMENDED -> 'outdated' (yellow warning; scrapes still run)
 * - version < OPENFARESCRAPER_MIN_VERSION           -> 'unsupported' (red error; scrapes blocked & fail over)
 */
export const OPENFARESCRAPER_MIN_VERSION = '0.4.0';
export const OPENFARESCRAPER_RECOMMENDED_VERSION = '0.4.0';

export type OpenFareScraperVersionStatus = 'supported' | 'outdated' | 'unsupported';

export interface OpenFareScraperVersionEvaluation {
  status: OpenFareScraperVersionStatus;
  reportedVersion: string;
  normalizedVersion: string | null;
  minVersion: string;
  recommendedVersion: string;
  isBlocked: boolean;
  message: string | null;
}

function stripPrereleaseSuffix(rawVersion: string): string {
  return rawVersion.trim().replace(/^v/i, '').split(/[-+]/)[0].trim();
}

export function evaluateOpenFareScraperVersion(
  reportedVersion: string | null | undefined
): OpenFareScraperVersionEvaluation {
  const minVersion = normalizeSemver(OPENFARESCRAPER_MIN_VERSION) || OPENFARESCRAPER_MIN_VERSION;
  const recommendedVersion =
    normalizeSemver(OPENFARESCRAPER_RECOMMENDED_VERSION) || OPENFARESCRAPER_RECOMMENDED_VERSION;

  const raw = (reportedVersion || '').trim();
  const baseVersion = stripPrereleaseSuffix(raw);
  const normalized = normalizeSemver(baseVersion);

  if (!normalized) {
    return {
      status: 'unsupported',
      reportedVersion: raw || 'unknown',
      normalizedVersion: null,
      minVersion,
      recommendedVersion,
      isBlocked: true,
      message: `OpenFareScraper reported an unrecognized version ("${raw || 'unknown'}"). Minimum required version is v${minVersion}. Please update OpenFareScraper.`,
    };
  }

  const cmpMin = compareSemver(normalized, minVersion);
  if (cmpMin !== null && cmpMin < 0) {
    return {
      status: 'unsupported',
      reportedVersion: raw,
      normalizedVersion: normalized,
      minVersion,
      recommendedVersion,
      isBlocked: true,
      message: `OpenFareScraper v${normalized} is below minimum required version v${minVersion} and has been blocked. Please update OpenFareScraper.`,
    };
  }

  const cmpRecommended = compareSemver(normalized, recommendedVersion);
  if (cmpRecommended !== null && cmpRecommended < 0) {
    return {
      status: 'outdated',
      reportedVersion: raw,
      normalizedVersion: normalized,
      minVersion,
      recommendedVersion,
      isBlocked: false,
      message: `OpenFareScraper v${normalized} is outdated (recommended: v${recommendedVersion}+). Please update OpenFareScraper.`,
    };
  }

  return {
    status: 'supported',
    reportedVersion: raw,
    normalizedVersion: normalized,
    minVersion,
    recommendedVersion,
    isBlocked: false,
    message: null,
  };
}