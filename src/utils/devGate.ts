export function isApiTesterEnabled(): boolean {
  const raw = process.env['ENABLE_API_TESTER'];
  return typeof raw === 'string' && raw.trim().toLowerCase() === 'true';
}