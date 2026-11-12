export interface ParsedSemver {
  major: number;
  minor: number;
  patch: number;
}

const SEMVER_REGEX = /^v?(\d+)\.(\d+)\.(\d+)$/i;

export function parseSemver(version: string | null | undefined): ParsedSemver | null {
  if (!version || typeof version !== 'string') return null;
  const match = version.trim().match(SEMVER_REGEX);
  if (!match) return null;

  const major = Number(match[1]);
  const minor = Number(match[2]);
  const patch = Number(match[3]);

  if (!Number.isSafeInteger(major) || !Number.isSafeInteger(minor) || !Number.isSafeInteger(patch)) {
    return null;
  }

  return { major, minor, patch };
}

export function normalizeSemver(version: string | null | undefined): string | null {
  const parsed = parseSemver(version);
  if (!parsed) return null;
  return `${parsed.major}.${parsed.minor}.${parsed.patch}`;
}

export function compareSemver(a: string, b: string): number | null {
  const parsedA = parseSemver(a);
  const parsedB = parseSemver(b);
  if (!parsedA || !parsedB) return null;

  if (parsedA.major !== parsedB.major) {
    return parsedA.major > parsedB.major ? 1 : -1;
  }
  if (parsedA.minor !== parsedB.minor) {
    return parsedA.minor > parsedB.minor ? 1 : -1;
  }
  if (parsedA.patch !== parsedB.patch) {
    return parsedA.patch > parsedB.patch ? 1 : -1;
  }
  return 0;
}

export function isNewerVersion(candidate: string | null | undefined, current: string | null | undefined): boolean {
  if (!candidate || !current) return false;
  return compareSemver(candidate, current) === 1;
}

export function isVersionAtOrBelow(current: string | null | undefined, maxVersion: string | null | undefined): boolean {
  if (!current || !maxVersion) return false;
  const cmp = compareSemver(current, maxVersion);
  return cmp !== null && cmp <= 0;
}

export function extractLatestChangelogVersion(markdown: string): string | null {
  if (!markdown || typeof markdown !== 'string') return null;
  const headingRegex = /^###\s+Release\s+v(\d+\.\d+\.\d+)\b/gm;
  let highest: string | null = null;
  let match: RegExpExecArray | null;

  while ((match = headingRegex.exec(markdown)) !== null) {
    const candidate = normalizeSemver(match[1]);
    if (!candidate) continue;
    if (!highest || compareSemver(candidate, highest) === 1) {
      highest = candidate;
    }
  }

  return highest;
}