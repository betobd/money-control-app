/** The languages the interface is translated into. English is the source. */
export const supportedLanguages = ['en', 'es', 'pt', 'fr', 'de', 'it'] as const;

export type Language = (typeof supportedLanguages)[number];

/** Used when the device prefers no supported language. */
export const DEFAULT_LANGUAGE: Language = 'en';

/**
 * Each language named in itself, so a user who cannot read the current language
 * can still find their own in the list.
 */
export const languageNativeNames: Record<Language, string> = {
  en: 'English',
  es: 'Español',
  pt: 'Português',
  fr: 'Français',
  de: 'Deutsch',
  it: 'Italiano',
};

/**
 * The `Intl` locale for dates and month names. Portuguese is Brazilian because
 * that is the translation's variant; the others use the language's main region.
 * Money grouping does not come from here — it follows the currency registry.
 */
const intlLocales: Record<Language, string> = {
  en: 'en-US',
  es: 'es-ES',
  pt: 'pt-BR',
  fr: 'fr-FR',
  de: 'de-DE',
  it: 'it-IT',
};

export function intlLocaleFor(language: Language): string {
  return intlLocales[language];
}

export function isSupportedLanguage(value: string): value is Language {
  return (supportedLanguages as readonly string[]).includes(value);
}

/** The part of an `expo-localization` locale this module reads. */
export type DeviceLanguageTag = { languageCode: string | null };

/** The first device language that is supported, in the user's order of preference. */
export function resolveDeviceLanguage(locales: readonly DeviceLanguageTag[]): Language {
  for (const locale of locales) {
    const code = locale.languageCode?.toLowerCase();
    if (code && isSupportedLanguage(code)) return code;
  }
  return DEFAULT_LANGUAGE;
}
