// ============================================================
// Admin API authentication — a single platform-level bearer token.
//
// The admin API (`/api/admin/v1/*`) lets a trusted external platform
// provision accounts and API keys without a human in the dashboard.
// It is NOT account-scoped: whoever holds `WACRM_ADMIN_TOKEN` can act
// on any account, so the token lives only in the external platform's
// server-side secrets.
//
// Fails closed: with the env var unset (the default for a plain
// self-hosted install) every admin request is rejected, so the admin
// surface is off unless an operator explicitly turns it on.
// ============================================================

import { createHash, timingSafeEqual } from 'node:crypto';

import { unauthorized } from '@/lib/api/v1/respond';

/** Minimum token length — rejects weak values set by mistake. */
const MIN_TOKEN_LENGTH = 32;

/**
 * Constant-time comparison of two strings. Hashing both sides first
 * makes the buffers equal-length, so `timingSafeEqual` never throws
 * and the length of the configured token isn't leaked either.
 */
export function tokensMatch(presented: string, expected: string): boolean {
  const a = createHash('sha256').update(presented).digest();
  const b = createHash('sha256').update(expected).digest();
  return timingSafeEqual(a, b);
}

/**
 * Throw a 401 `ApiError` unless the request carries
 * `Authorization: Bearer <WACRM_ADMIN_TOKEN>`.
 */
export function requireAdminToken(request: Request): void {
  const expected = process.env.WACRM_ADMIN_TOKEN ?? '';
  if (expected.length < MIN_TOKEN_LENGTH) {
    throw unauthorized('Admin API is disabled on this instance');
  }

  const header = request.headers.get('authorization') ?? '';
  const presented = header.startsWith('Bearer ')
    ? header.slice('Bearer '.length).trim()
    : '';
  if (!presented || !tokensMatch(presented, expected)) {
    throw unauthorized('Missing or invalid admin token');
  }
}
