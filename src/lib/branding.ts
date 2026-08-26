// Single source of truth for product/brand strings that appear in
// the UI, page metadata, and system-generated text (invite links,
// error messages). Forking this template for a new client means
// changing the env vars below — not grepping the repo for "wacrm".
//
// Values are read from NEXT_PUBLIC_* env vars (inlined at build
// time) with defaults that keep the template itself working out of
// the box. Server-only strings that must never change per-fork
// (webhook header names, the public API key prefix, the MCP server
// name) intentionally do NOT live here — those are technical
// contracts, not cosmetic branding.

export interface BrandingConfig {
  /** Short product name. Used in <title>, i18n interpolation, UI copy. */
  name: string;
  /** One-line description. Used as <meta name="description">. */
  description: string;
  /** Canonical public URL of this deployment (no trailing slash), if set. */
  siteUrl: string | undefined;
}

function stripTrailingSlash(url: string): string {
  return url.replace(/\/+$/, "");
}

export const branding: BrandingConfig = {
  name: process.env.NEXT_PUBLIC_APP_NAME?.trim() || "wacrm",
  description:
    process.env.NEXT_PUBLIC_APP_DESCRIPTION?.trim() ||
    "Self-hostable CRM template for WhatsApp.",
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL?.trim()
    ? stripTrailingSlash(process.env.NEXT_PUBLIC_SITE_URL.trim())
    : undefined,
};

/** `"{pageTitle} — {brandName}"`, mirrors metadata.title.template shape. */
export function withBrandSuffix(pageTitle: string): string {
  return `${pageTitle} — ${branding.name}`;
}
