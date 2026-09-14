/**
 * The active interface language and its message catalog.
 *
 * Catalogs are plain objects: strings, and functions where a message takes values
 * or needs a plural. English is the source; every other catalog is typed as
 * `Messages`, so a missing or misspelled key is a type error rather than an
 * untranslated string discovered on a device.
 *
 * Components read the catalog with `useMessages()`, which re-renders on a
 * language change. Code outside React (services, validation, notification
 * content) calls `getMessages()` at the moment it builds the text — never at module
 * scope, where the value would be frozen in the language active at import time.
 *
 * This module has no native imports, so services and their Node tests can use it;
 * tests run in English. Device detection and persistence live in
 * `language-preference.ts`.
 */
import { en } from './locales/en';
import { es } from './locales/es';
import { pt } from './locales/pt';
import { fr } from './locales/fr';
import { de } from './locales/de';
import { it } from './locales/it';
import { DEFAULT_LANGUAGE, intlLocaleFor, type Language } from './languages';

export type Messages = typeof en;

const catalogs: Record<Language, Messages> = { en, es, pt, fr, de, it };

let active: Language = DEFAULT_LANGUAGE;
const listeners = new Set<() => void>();

export function getLanguage(): Language {
  return active;
}

/** The active catalog. Read it when building text, not at module scope. */
export function getMessages(): Messages {
  return catalogs[active];
}

/** A specific catalog, for work that must consider every language. */
export function getMessagesFor(language: Language): Messages {
  return catalogs[language];
}

/** The `Intl` locale matching the active language, for dates and month names. */
export function getIntlLocale(): string {
  return intlLocaleFor(active);
}

export function setActiveLanguage(language: Language): void {
  if (language === active) return;
  active = language;
  for (const listener of [...listeners]) listener();
}

export function subscribeToLanguage(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
