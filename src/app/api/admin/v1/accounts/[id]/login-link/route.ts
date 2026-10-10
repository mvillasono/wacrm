// ============================================================
// POST /api/admin/v1/accounts/{id}/login-link — one-time sign-in URL
// for the account owner (admin token required).
//
// Body (optional): { "next": "/settings" } — dashboard path to land on.
// Response: { "data": { "url": "https://crm…/auth/callback?token_hash=…" } }
// ============================================================

import { requireAdminToken } from '@/lib/auth/admin-token';
import { supabaseAdmin } from '@/lib/flows/admin-client';
import { ok, fail, toApiErrorResponse } from '@/lib/api/v1/respond';
import { ProvisionError, createLoginLink } from '@/lib/admin/provision';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    requireAdminToken(request);
    const { id } = await params;

    const body = (await request.json().catch(() => null)) as Record<
      string,
      unknown
    > | null;
    // Only same-site relative paths, so the link can't redirect off-site.
    const next =
      typeof body?.next === 'string' && /^\/(?!\/)/.test(body.next)
        ? body.next
        : '/settings';

    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;
    const url = await createLoginLink(supabaseAdmin(), id, siteUrl, next);
    return ok({ url });
  } catch (err) {
    if (err instanceof ProvisionError) {
      return fail(err.code, err.message, err.status);
    }
    return toApiErrorResponse(err);
  }
}
