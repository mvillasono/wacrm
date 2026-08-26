// Locales the UI ships translations for. Extending this list means
// adding a `messages/<code>.json` dictionary (see messages/en.json for
// the full key set) and a row here — nothing else needs to change.
export const SUPPORTED_LOCALES = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
] as const;

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number]['code'];

export const DEFAULT_LOCALE: SupportedLocale = 'en';

export function isSupportedLocale(value: string | undefined | null): value is SupportedLocale {
  return !!value && SUPPORTED_LOCALES.some((l) => l.code === value);
}

// Cookie the client writes to persist the per-device language choice;
// read back in src/i18n/request.ts on every request. A free function
// (not inlined at the call site) so the `document.cookie` mutation
// sits outside any component/hook body — the React Compiler lint rule
// flags direct DOM mutation inside components even from event handlers.
export const LOCALE_COOKIE = 'NEXT_LOCALE';

export function setLocaleCookie(code: SupportedLocale): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${LOCALE_COOKIE}=${code}; path=/; max-age=31536000; SameSite=Lax`;
}
