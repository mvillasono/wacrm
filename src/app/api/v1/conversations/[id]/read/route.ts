// ============================================================
// POST /api/v1/conversations/{id}/read — mark a conversation as read
// (resets `unread_count` to 0), the API twin of opening the thread in
// the dashboard inbox.
//
// Scope: `messages:send`. An integration that shows the inbox already
// holds that scope to reply, so marking read doesn't force existing
// keys to be re-issued with a new scope. Account-scoped: a foreign or
// unknown id → 404.
// ============================================================

import { requireApiKey } from '@/lib/auth/api-context';
import { ok, fail, toApiErrorResponse } from '@/lib/api/v1/respond';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireApiKey(request, 'messages:send');
    const { id } = await params;

    const { data, error } = await ctx.supabase
      .from('conversations')
      .update({ unread_count: 0 })
      .eq('id', id)
      .eq('account_id', ctx.accountId)
      .select('id')
      .maybeSingle();

    if (error) {
      console.error('[api/v1/conversations] mark read error:', error);
      return fail('internal', 'Failed to mark conversation as read', 500);
    }
    if (!data) return fail('not_found', 'Conversation not found', 404);

    return ok({ id: data.id, unread_count: 0 });
  } catch (err) {
    return toApiErrorResponse(err);
  }
}
