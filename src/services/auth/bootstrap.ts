import { authDb } from '@/db/auth';
import { AUTH_USERNAME_REGEX } from '@/utils/authValidation';
import { hashPassword, verifyPassword } from './password';
import { ensureAuthRuntimeEnv } from './session';

let bootstrapped = false;

export function isEnvAuthManaged(): boolean {
  const envUser = (process.env.AUTH_USERNAME || '').trim();
  const envPass = process.env.AUTH_PASSWORD || '';
  return envUser.length > 0 && envPass.length > 0;
}

export async function bootstrapAuthFromEnv(): Promise<void> {
  if (bootstrapped) return;
  bootstrapped = true;

  try {
    ensureAuthRuntimeEnv();

    const rawUsername = (process.env.AUTH_USERNAME || '').trim();
    const envPassword = process.env.AUTH_PASSWORD || '';

    if (!rawUsername || !envPassword) {
      return;
    }

    const username = AUTH_USERNAME_REGEX.test(rawUsername) ? rawUsername : 'admin';
    if (username !== rawUsername) {
      console.warn(
        `[Auth] AUTH_USERNAME "${rawUsername}" did not match allowed format (3-32 alphanumeric/._-); falling back to "admin".`
      );
    }

    const current = authDb.getConfig();
    const passwordUnchanged =
      current.enabled === 1 &&
      current.username === username &&
      (await verifyPassword(envPassword, current.passwordHash, current.passwordSalt));

    if (passwordUnchanged) {
      return;
    }

    const { hash, salt } = await hashPassword(envPassword);
    authDb.enableOrUpdateCredentials({
      username,
      passwordHash: hash,
      passwordSalt: salt,
    });
    authDb.revokeAllSessions();

    console.log(`[Auth] Bootstrapped authentication from environment variables for user "${username}".`);
  } catch (error) {
    console.error('[Auth] Failed to bootstrap authentication from environment:', error);
  }
}