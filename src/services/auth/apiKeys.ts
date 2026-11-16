import crypto from 'crypto';
import { ApiKeyScope } from '@/types';

export const API_KEY_PREFIX = 'fss_live_';
export const VALID_API_KEY_SCOPES: readonly ApiKeyScope[] = ['read', 'write', 'admin'] as const;

const SCOPE_RANK: Record<ApiKeyScope, number> = {
  read: 1,
  write: 2,
  admin: 3,
};

export interface GeneratedApiKeyMaterial {
  rawKey: string;
  keyPrefix: string;
  keyHash: string;
}

export function generateApiKeyMaterial(): GeneratedApiKeyMaterial {
  const secretHex = crypto.randomBytes(32).toString('hex');
  const rawKey = `${API_KEY_PREFIX}${secretHex}`;
  const keyPrefix = rawKey.slice(0, 17); // e.g. "fss_live_a1b2c3d4"
  const keyHash = hashApiKey(rawKey);
  return { rawKey, keyPrefix, keyHash };
}

export function hashApiKey(rawKey: string): string {
  return crypto.createHash('sha256').update(rawKey, 'utf8').digest('hex');
}

export function isValidApiKeyFormat(rawKey: string | null | undefined): rawKey is string {
  if (!rawKey || typeof rawKey !== 'string') return false;
  return /^fss_live_[a-f0-9]{64}$/.test(rawKey.trim());
}

export function isApiKeyScope(value: unknown): value is ApiKeyScope {
  return typeof value === 'string' && (VALID_API_KEY_SCOPES as readonly string[]).includes(value);
}

export function normalizeApiKeyScopes(input: ApiKeyScope[] | ApiKeyScope): ApiKeyScope[] {
  const list = Array.isArray(input) ? input : [input];
  const unique = new Set<ApiKeyScope>();
  for (const item of list) {
    if (isApiKeyScope(item)) {
      unique.add(item);
    }
  }
  if (unique.size === 0) {
    unique.add('read');
  }
  return Array.from(unique);
}

export function parseApiKeyScopes(rawScopes: string | null | undefined): ApiKeyScope[] {
  if (!rawScopes) return ['read'];
  try {
    const parsed = JSON.parse(rawScopes);
    if (Array.isArray(parsed)) {
      return normalizeApiKeyScopes(parsed.filter(isApiKeyScope));
    }
  } catch {
    // Fall back to comma-separated or single scope string
    const tokens = rawScopes
      .split(',')
      .map((s) => s.trim())
      .filter(isApiKeyScope);
    if (tokens.length > 0) {
      return normalizeApiKeyScopes(tokens);
    }
  }
  return ['read'];
}

export function hasRequiredScope(
  grantedScopes: ApiKeyScope[] | undefined,
  requiredScope: ApiKeyScope
): boolean {
  if (!grantedScopes || grantedScopes.length === 0) return false;
  const requiredRank = SCOPE_RANK[requiredScope];
  return grantedScopes.some((scope) => (SCOPE_RANK[scope] ?? 0) >= requiredRank);
}