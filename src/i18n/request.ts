import { getRequestConfig } from 'next-intl/server';
import { cookies } from 'next/headers';
import { isSupportedLocale, DEFAULT_LOCALE } from './locales';

export default getRequestConfig(async () => {
  // Per-device choice (Settings → Appearance → Language) wins; falls
  // back to the deployment-wide default set at build time, then 'en'.
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get('NEXT_LOCALE')?.value;
  const locale = isSupportedLocale(cookieLocale)
    ? cookieLocale
    : process.env.NEXT_PUBLIC_APP_LOCALE || DEFAULT_LOCALE;

  let messages;
  try {
    messages = (await import(`../../messages/${locale}.json`)).default;
  } catch (error) {
    // Fallback to English if the dictionary for the requested locale doesn't exist yet
    messages = (await import(`../../messages/en.json`)).default;
  }

  return {
    locale,
    messages
  };
});
