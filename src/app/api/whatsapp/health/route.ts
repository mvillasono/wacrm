import { timingSafeEqual } from 'node:crypto'
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/whatsapp/admin-client'
import { decrypt } from '@/lib/whatsapp/encryption'
import { getSubscribedApps, verifyPhoneNumber } from '@/lib/whatsapp/meta-api'

/**
 * GET /api/whatsapp/health
 *
 * Machine-to-machine health check, meant to be polled on a schedule by an
 * external monitor (ytupacuando's own cron) — NOT by this app's own UI,
 * which already has /api/whatsapp/config/verify-registration for that
 * (session-authenticated, one account at a time).
 *
 * A poller outside this deployment has no user session to authenticate
 * with, so this uses the same shared-secret pattern as
 * /api/automations/cron: `x-cron-secret` must match AUTOMATION_CRON_SECRET.
 *
 * Exists because "credentials look fine" and "Meta is actually delivering
 * events" are different questions — a missing META_APP_SECRET fails the
 * second silently while the first still looks healthy (see
 * verify-registration's webhook_secret_configured check). Without an
 * external poller, nobody finds out until a client reports "no messages
 * arrived," possibly days later.
 */
export async function GET(request: Request) {
  const expected = process.env.AUTOMATION_CRON_SECRET
  if (!expected) {
    return NextResponse.json({ error: 'cron not configured' }, { status: 503 })
  }
  const supplied = request.headers.get('x-cron-secret') ?? ''
  const suppliedBuf = Buffer.from(supplied)
  const expectedBuf = Buffer.from(expected)
  if (
    suppliedBuf.length !== expectedBuf.length ||
    !timingSafeEqual(suppliedBuf, expectedBuf)
  ) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = supabaseAdmin()
  const { data: configs, error } = await admin.from('whatsapp_config').select('*')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const webhookSecretConfigured = Boolean(process.env.META_APP_SECRET)

  const accounts = await Promise.all(
    (configs ?? []).map(async (config) => {
      const errors: string[] = []
      if (!webhookSecretConfigured) {
        errors.push('META_APP_SECRET is not set on this server.')
      }

      let accessToken: string | null = null
      try {
        accessToken = decrypt(config.access_token)
      } catch {
        errors.push('Stored access token cannot be decrypted.')
      }

      let phoneMetadataOk = false
      let wabaSubscribed: boolean | null = null

      if (accessToken) {
        try {
          await verifyPhoneNumber({ phoneNumberId: config.phone_number_id, accessToken })
          phoneMetadataOk = true
        } catch (err) {
          errors.push(`Phone metadata check failed: ${err instanceof Error ? err.message : String(err)}`)
        }

        if (config.waba_id) {
          try {
            const subs = await getSubscribedApps({ wabaId: config.waba_id, accessToken })
            wabaSubscribed = subs.length > 0
            if (!wabaSubscribed) errors.push('WABA has no subscribed apps.')
          } catch (err) {
            errors.push(`WABA subscription check failed: ${err instanceof Error ? err.message : String(err)}`)
          }
        }
      }

      const registered = config.registered_at != null
      const healthy =
        webhookSecretConfigured && phoneMetadataOk && (wabaSubscribed ?? false) && registered

      return {
        account_id: config.account_id as string,
        healthy,
        checks: {
          webhook_secret_configured: webhookSecretConfigured,
          token_decryptable: accessToken !== null,
          phone_metadata_ok: phoneMetadataOk,
          waba_subscribed_to_app: wabaSubscribed,
          registered,
        },
        errors,
      }
    }),
  )

  const healthy = accounts.length === 0 || accounts.every((a) => a.healthy)

  return NextResponse.json({ healthy, accounts })
}
