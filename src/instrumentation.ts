export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { initDb } = await import('./db/init');
    const { bootstrapAuthFromEnv } = await import('./services/auth/bootstrap');
    const { ensureAuthRuntimeEnv } = await import('./services/auth/session');
    initDb();
    await bootstrapAuthFromEnv();
    ensureAuthRuntimeEnv();
  }
}