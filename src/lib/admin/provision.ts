// ============================================================
// Account provisioning for the admin API.
//
// An external platform that embeds this CRM as its WhatsApp engine
// (one CRM account per tenant of that platform) calls
// `POST /api/admin/v1/accounts` to get an account + an API key for a
// tenant, then drives everything else through the public API with
// that key. No human ever signs up.
//
// Accounts are created the same way a signup creates them: we insert
// an auth user and the `handle_new_user` trigger (migration 017)
// bootstraps the account + owner profile. The account is then tagged
// with `external_ref` (migration 040) so a second provisioning call
// for the same tenant reuses it.
// ============================================================

import { randomBytes } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';

import { generateApiKey } from '@/lib/api-keys/keys';
import type { ApiScope } from '@/lib/api-keys/scopes';

/** Scopes granted to a provisioned integration key. */
export const INTEGRATION_SCOPES: ApiScope[] = [
  'messages:send',
  'messages:read',
  'contacts:read',
  'contacts:write',
  'conversations:read',
  'webhooks:manage',
];

export const DEFAULT_INTEGRATION_KEY_NAME = 'External integration';

/** `external_ref` must be a short, URL-safe identifier. */
const EXTERNAL_REF_PATTERN = /^[A-Za-z0-9_.:-]{1,100}$/;

export function isValidExternalRef(value: unknown): value is string {
  return typeof value === 'string' && EXTERNAL_REF_PATTERN.test(value);
}

/**
 * Login email for a provisioned owner when the caller doesn't supply
 * one. Never receives mail (the user is created pre-confirmed); it
 * only has to be unique and well-formed.
 */
export function syntheticEmail(externalRef: string): string {
  const domain =
    process.env.WACRM_PROVISION_EMAIL_DOMAIN?.trim() || 'provisioned.wacrm.local';
  const local = externalRef.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  return `${local}@${domain}`;
}

export class ProvisionError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status: number
  ) {
    super(message);
    this.name = 'ProvisionError';
  }
}

export interface ProvisionInput {
  externalRef: string;
  name: string;
  email?: string | null;
  keyName?: string | null;
}

export interface ProvisionResult {
  accountId: string;
  accountName: string;
  ownerEmail: string;
  created: boolean;
  apiKey: string;
  keyPrefix: string;
  scopes: ApiScope[];
}

interface AccountRow {
  id: string;
  name: string;
  owner_user_id: string;
}

async function findAccountByExternalRef(
  db: SupabaseClient,
  externalRef: string
): Promise<AccountRow | null> {
  const { data, error } = await db
    .from('accounts')
    .select('id, name, owner_user_id')
    .eq('external_ref', externalRef)
    .maybeSingle();
  if (error) {
    throw new ProvisionError('internal', 'Failed to look up account', 500);
  }
  return (data as AccountRow | null) ?? null;
}

/** Email of an account's owner, from the auth admin API. */
export async function getOwnerEmail(
  db: SupabaseClient,
  ownerUserId: string
): Promise<string> {
  const { data, error } = await db.auth.admin.getUserById(ownerUserId);
  if (error || !data.user?.email) {
    throw new ProvisionError('internal', 'Account owner not found', 500);
  }
  return data.user.email;
}

async function createAccount(
  db: SupabaseClient,
  input: ProvisionInput
): Promise<{ account: AccountRow; email: string }> {
  const email = (input.email?.trim() || syntheticEmail(input.externalRef)).toLowerCase();

  const { data: created, error: userError } = await db.auth.admin.createUser({
    email,
    // Random password nobody knows — access is via login links only.
    password: randomBytes(32).toString('base64url'),
    email_confirm: true,
    user_metadata: { full_name: input.name },
  });
  if (userError || !created.user) {
    const taken = /already|registered|exists/i.test(userError?.message ?? '');
    throw new ProvisionError(
      taken ? 'email_taken' : 'internal',
      taken
        ? `A user with email ${email} already exists`
        : 'Failed to create the account owner',
      taken ? 409 : 500
    );
  }

  // The signup trigger created the account; tag it with the external
  // ref and the requested name.
  const { data: account, error: accountError } = await db
    .from('accounts')
    .update({ external_ref: input.externalRef, name: input.name })
    .eq('owner_user_id', created.user.id)
    .select('id, name, owner_user_id')
    .maybeSingle();
  if (accountError || !account) {
    // Don't leave an orphan auth user behind.
    await db.auth.admin.deleteUser(created.user.id);
    throw new ProvisionError('internal', 'Failed to bootstrap the account', 500);
  }

  return { account: account as AccountRow, email };
}

/**
 * Find-or-create the account for `externalRef` and mint a fresh
 * integration API key. Earlier keys with the same name are revoked,
 * so re-provisioning doubles as key rotation.
 */
export async function provisionAccount(
  db: SupabaseClient,
  input: ProvisionInput
): Promise<ProvisionResult> {
  let account = await findAccountByExternalRef(db, input.externalRef);
  let ownerEmail: string;
  let created = false;

  if (account) {
    ownerEmail = await getOwnerEmail(db, account.owner_user_id);
  } else {
    const result = await createAccount(db, input);
    account = result.account;
    ownerEmail = result.email;
    created = true;
  }

  const keyName = input.keyName?.trim() || DEFAULT_INTEGRATION_KEY_NAME;

  const { error: revokeError } = await db
    .from('api_keys')
    .update({ revoked_at: new Date().toISOString() })
    .eq('account_id', account.id)
    .eq('name', keyName)
    .is('revoked_at', null);
  if (revokeError) {
    throw new ProvisionError('internal', 'Failed to rotate API keys', 500);
  }

  const key = generateApiKey();
  const { error: keyError } = await db.from('api_keys').insert({
    account_id: account.id,
    created_by: null,
    name: keyName,
    key_prefix: key.prefix,
    key_hash: key.hash,
    scopes: INTEGRATION_SCOPES,
  });
  if (keyError) {
    throw new ProvisionError('internal', 'Failed to create the API key', 500);
  }

  return {
    accountId: account.id,
    accountName: account.name,
    ownerEmail,
    created,
    apiKey: key.plaintext,
    keyPrefix: key.prefix,
    scopes: INTEGRATION_SCOPES,
  };
}

/**
 * One-time sign-in link for an account's owner, so an operator can
 * open the dashboard (e.g. to connect the WhatsApp number) without a
 * password. The link goes through `/auth/callback`, which verifies the
 * token hash and sets the session cookie.
 */
export async function createLoginLink(
  db: SupabaseClient,
  accountId: string,
  siteUrl: string,
  next = '/settings'
): Promise<string> {
  const { data: account, error } = await db
    .from('accounts')
    .select('id, owner_user_id')
    .eq('id', accountId)
    .maybeSingle();
  if (error) {
    throw new ProvisionError('internal', 'Failed to look up account', 500);
  }
  if (!account) {
    throw new ProvisionError('not_found', 'Account not found', 404);
  }

  const email = await getOwnerEmail(db, account.owner_user_id as string);
  const { data: link, error: linkError } = await db.auth.admin.generateLink({
    type: 'magiclink',
    email,
  });
  const tokenHash = link?.properties?.hashed_token;
  if (linkError || !tokenHash) {
    throw new ProvisionError('internal', 'Failed to generate a login link', 500);
  }

  const url = new URL('/auth/callback', siteUrl);
  url.searchParams.set('token_hash', tokenHash);
  url.searchParams.set('type', 'magiclink');
  url.searchParams.set('next', next);
  return url.toString();
}
