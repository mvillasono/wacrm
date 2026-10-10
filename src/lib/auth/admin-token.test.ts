import { afterEach, describe, expect, it } from 'vitest';

import { ApiError } from '@/lib/api/v1/respond';
import { requireAdminToken, tokensMatch } from './admin-token';

const TOKEN = 'a'.repeat(40);

function req(auth?: string): Request {
  return new Request('https://crm.test/api/admin/v1/accounts', {
    headers: auth ? { authorization: auth } : {},
  });
}

describe('tokensMatch', () => {
  it('is true for identical tokens and false otherwise', () => {
    expect(tokensMatch(TOKEN, TOKEN)).toBe(true);
    expect(tokensMatch(TOKEN, 'b'.repeat(40))).toBe(false);
    expect(tokensMatch('short', TOKEN)).toBe(false);
  });
});

describe('requireAdminToken', () => {
  const original = process.env.WACRM_ADMIN_TOKEN;
  afterEach(() => {
    process.env.WACRM_ADMIN_TOKEN = original;
  });

  it('rejects everything when the token is not configured', () => {
    delete process.env.WACRM_ADMIN_TOKEN;
    expect(() => requireAdminToken(req(`Bearer ${TOKEN}`))).toThrow(ApiError);
  });

  it('rejects a configured token that is too short', () => {
    process.env.WACRM_ADMIN_TOKEN = 'short';
    expect(() => requireAdminToken(req('Bearer short'))).toThrow(ApiError);
  });

  it('rejects a missing or wrong bearer token', () => {
    process.env.WACRM_ADMIN_TOKEN = TOKEN;
    expect(() => requireAdminToken(req())).toThrow(ApiError);
    expect(() => requireAdminToken(req(TOKEN))).toThrow(ApiError);
    expect(() => requireAdminToken(req('Bearer nope'))).toThrow(ApiError);
  });

  it('accepts the configured token', () => {
    process.env.WACRM_ADMIN_TOKEN = TOKEN;
    expect(() => requireAdminToken(req(`Bearer ${TOKEN}`))).not.toThrow();
  });
});
