// ============================================================
// POST /api/admin/v1/accounts — provision an account + API key.
//
// Platform-level (not account-scoped): authenticated with the
// `WACRM_ADMIN_TOKEN` bearer token. See `src/lib/admin/provision.ts`.
//
// Body:
//   {
//     "external_ref": "business-uuid",   // required, the caller's tenant id
//     "name": "Ferretería López",         // required, account name
//     "email": "owner@example.com",       // optional, owner login email
//     "key_name": "MVenta"                // optional, API key name
//   }
//
// Response (201 when the account was created, 200 when it existed):
//   { "data": { "account_id", "account_name", "owner_email", "created",
//               "api_key", "key_prefix", "scopes" } }
//
// `api_key` is shown exactly once. Calling again for the same
// `external_ref` revokes the previous key of that name and returns a
// new one.
// ============================================================

import { requireAdminToken } from '@/lib/auth/admin-token';
import { supabaseAdmin } from '@/lib/flows/admin-client';
import { ok, fail, toApiErrorResponse } from '@/lib/api/v1/respond';
import {
  ProvisionError,
  isValidExternalRef,
  provisionAccount,
} from '@/lib/admin/provision';

export async function POST(request: Request) {
  try {
    requireAdminToken(request);

    const body = (await request.json().catch(() => null)) as Record<
      string,
      unknown
    > | null;
    if (!body || typeof body !== 'object') {
      return fail('bad_request', 'Request body must be a JSON object', 400);
    }
    if (!isValidExternalRef(body.external_ref)) {
      return fail(
        'bad_request',
        "'external_ref' is required (letters, digits, _ . : -, max 100)",
        400
      );
    }
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (!name || name.length > 200) {
      return fail('bad_request', "'name' is required (max 200 chars)", 400);
    }

    const result = await provisionAccount(supabaseAdmin(), {
      externalRef: body.external_ref,
      name,
      email: typeof body.email === 'string' ? body.email : null,
      keyName: typeof body.key_name === 'string' ? body.key_name : null,
    });

    return ok(
      {
        account_id: result.accountId,
        account_name: result.accountName,
        owner_email: result.ownerEmail,
        created: result.created,
        api_key: result.apiKey,
        key_prefix: result.keyPrefix,
        scopes: result.scopes,
      },
      result.created ? 201 : 200
    );
  } catch (err) {
    if (err instanceof ProvisionError) {
      return fail(err.code, err.message, err.status);
    }
    return toApiErrorResponse(err);
  }
}
