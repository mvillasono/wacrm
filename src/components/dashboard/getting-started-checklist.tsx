"use client"

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { CheckCircle2, Circle, X } from 'lucide-react'

const DISMISS_KEY = 'wacrm.gettingStarted.dismissed'

type Status = 'loading' | 'pending' | 'done'

// Safe to read directly in useState's lazy initializer (no effect+setState
// needed): the component always renders null on the very first render
// anyway, since whatsapp/ai start at 'loading' — so there's nothing for
// this value to mismatch against between server and client.
function readInitialDismissed(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return localStorage.getItem(DISMISS_KEY) === '1'
  } catch {
    return false
  }
}

// Lightweight onboarding nudge — not the deep health check that lives in
// Settings > WhatsApp (verify-registration pings Meta's Graph API twice;
// too heavy to run on every dashboard visit). This only reads the cheap
// `connected`/`configured` flags, and disappears once both are done or the
// user dismisses it.
export function GettingStartedChecklist() {
  const t = useTranslations('Dashboard.gettingStarted')
  const [dismissed, setDismissed] = useState(readInitialDismissed)
  const [whatsapp, setWhatsapp] = useState<Status>('loading')
  const [ai, setAi] = useState<Status>('loading')

  useEffect(() => {
    fetch('/api/whatsapp/config')
      .then((r) => r.json())
      .then((d) => setWhatsapp(d.connected ? 'done' : 'pending'))
      .catch(() => setWhatsapp('pending'))

    fetch('/api/ai/config')
      .then((r) => r.json())
      .then((d) => setAi(d.configured ? 'done' : 'pending'))
      .catch(() => setAi('pending'))
  }, [])

  function dismiss() {
    try {
      localStorage.setItem(DISMISS_KEY, '1')
    } catch {
      // Private browsing / storage blocked — just hide for this session.
    }
    setDismissed(true)
  }

  const loading = whatsapp === 'loading' || ai === 'loading'
  if (dismissed || loading || (whatsapp === 'done' && ai === 'done')) return null

  return (
    <div className="relative rounded-xl border border-border bg-card p-4">
      <button
        type="button"
        onClick={dismiss}
        aria-label={t('dismiss')}
        className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
      >
        <X className="h-4 w-4" />
      </button>
      <h2 className="text-sm font-semibold text-foreground">{t('title')}</h2>
      <ul className="mt-3 space-y-2">
        <ChecklistItem
          done={whatsapp === 'done'}
          title={t('whatsappTitle')}
          statusLabel={whatsapp === 'done' ? t('whatsappDone') : t('whatsappPending')}
          cta={t('whatsappCta')}
          href="/settings?tab=whatsapp"
        />
        <ChecklistItem
          done={ai === 'done'}
          title={t('aiTitle')}
          optionalLabel={t('aiOptional')}
          statusLabel={ai === 'done' ? t('aiDone') : t('aiPending')}
          cta={t('aiCta')}
          href="/agents"
        />
      </ul>
    </div>
  )
}

function ChecklistItem({
  done,
  title,
  statusLabel,
  cta,
  href,
  optionalLabel,
}: {
  done: boolean
  title: string
  statusLabel: string
  cta: string
  href: string
  optionalLabel?: string
}) {
  return (
    <li className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 px-3 py-2">
      <div className="flex min-w-0 items-center gap-2.5">
        {done ? (
          <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
        ) : (
          <Circle className="h-4 w-4 shrink-0 text-muted-foreground" />
        )}
        <div className="min-w-0">
          <p className="truncate text-sm text-foreground">
            {title}
            {optionalLabel && (
              <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                {optionalLabel}
              </span>
            )}
          </p>
          <p className="text-xs text-muted-foreground">{statusLabel}</p>
        </div>
      </div>
      {!done && (
        <Link
          href={href}
          className="shrink-0 rounded-full border border-border px-3 py-1 text-xs font-medium text-foreground hover:bg-muted"
        >
          {cta}
        </Link>
      )}
    </li>
  )
}
