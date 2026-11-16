import { z } from 'zod';

export const AUTH_USERNAME_REGEX = /^[a-zA-Z0-9._-]{3,32}$/;

export const authUsernameSchema = z
  .string()
  .trim()
  .regex(
    AUTH_USERNAME_REGEX,
    'Username must be 3–32 characters using letters, numbers, dots, underscores, or hyphens'
  );

export const strongPasswordSchema = z
  .string()
  .min(10, 'Password must be at least 10 characters')
  .max(128, 'Password must be 128 characters or fewer')
  .refine((val) => /[a-z]/.test(val), 'Password must include at least one lowercase letter')
  .refine((val) => /[A-Z]/.test(val), 'Password must include at least one uppercase letter')
  .refine(
    (val) => /[0-9!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(val),
    'Password must include at least one number or symbol'
  );

export const loginSchema = z.object({
  username: z.string().trim().min(1, 'Username is required').max(64),
  password: z.string().min(1, 'Password is required').max(128),
});

export const authSetupSchema = z.object({
  username: authUsernameSchema,
  newPassword: strongPasswordSchema,
  currentPassword: z.string().max(128).optional().nullable().or(z.literal('')),
});

export const authDisableSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required').max(128),
});

export const passkeyRegisterVerifySchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Passkey name is required')
    .max(64, 'Passkey name must be 64 characters or fewer'),
  response: z.record(z.unknown()),
});

export const passkeyRenameSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Passkey name is required')
    .max(64, 'Passkey name must be 64 characters or fewer'),
});

export const sessionRevokeBulkSchema = z.object({
  scope: z.literal('others'),
});

export const SESSION_DURATION_OPTIONS: { days: number; label: string }[] = [
  { days: 1, label: '24 Hours' },
  { days: 7, label: '7 Days' },
  { days: 14, label: '14 Days' },
  { days: 30, label: '30 Days (Default)' },
  { days: 90, label: '90 Days' },
];

export const ALLOWED_SESSION_DURATION_DAYS = [1, 7, 14, 30, 90] as const;

export const sessionDurationSchema = z.object({
  sessionDurationDays: z
    .number()
    .int()
    .refine(
      (val) => (ALLOWED_SESSION_DURATION_DAYS as readonly number[]).includes(val),
      'Session duration must be 1, 7, 14, 30, or 90 days'
    ),
});

/**
 * Validates a post-login redirect target so only safe, single-slash relative
 * application paths are allowed (preventing open-redirect attacks).
 */
export function sanitizeRedirectPath(rawNext?: string | null): string {
  if (!rawNext || typeof rawNext !== 'string') return '/dashboard';
  const trimmed = rawNext.trim();
  if (!trimmed.startsWith('/')) return '/dashboard';
  if (trimmed.startsWith('//') || trimmed.startsWith('/\\')) return '/dashboard';
  if (/[\x00-\x1f\x7f]/.test(trimmed)) return '/dashboard';
  if (trimmed === '/' || trimmed === '/login' || trimmed.startsWith('/login?')) return '/dashboard';
  return trimmed;
}