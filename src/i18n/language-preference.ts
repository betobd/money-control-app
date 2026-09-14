/**
 * The user's language preference: follow the device, or a chosen language.
 *
 * Stored in `expo-sqlite/kv-store` rather than the financial database because the
 * language is needed before that database opens — the App Lock screen and the
 * database loading and error states render first — and because it is a device
 * preference, not financial data, so it stays out of backups.
 */
import { getLocales } from 'expo-localization';
import Storage from 'expo-sqlite/kv-store';

import { isSupportedLanguage, resolveDeviceLanguage, type Language } from './languages';
import { setActiveLanguage } from './messages';

export type LanguagePreference = Language | 'system';

const STORAGE_KEY = 'preferences.language';

export function deviceLanguage(): Language {
  return resolveDeviceLanguage(getLocales());
}

export function readLanguagePreference(): LanguagePreference {
  try {
    const stored = Storage.getItemSync(STORAGE_KEY);
    return stored !== null && isSupportedLanguage(stored) ? stored : 'system';
  } catch {
    return 'system';
  }
}

function resolve(preference: LanguagePreference): Language {
  return preference === 'system' ? deviceLanguage() : preference;
}

/** Activate the saved preference. Called once, before the first render. */
export function initializeLanguage(): void {
  setActiveLanguage(resolve(readLanguagePreference()));
}

/** Persist and activate a preference; returns the language now active. */
export function saveLanguagePreference(preference: LanguagePreference): Language {
  if (preference === 'system') Storage.removeItemSync(STORAGE_KEY);
  else Storage.setItemSync(STORAGE_KEY, preference);
  const language = resolve(preference);
  setActiveLanguage(language);
  return language;
}
