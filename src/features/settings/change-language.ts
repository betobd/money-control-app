import { categoryService } from '@/features/categories/categories';
import { notificationCoordinator } from '@/features/notifications/notifications';
import { deviceLanguage, saveLanguagePreference, type LanguagePreference } from '@/i18n/language-preference';

/**
 * Switch the interface language and bring the user's data along with it.
 *
 * Default categories are renamed before the language is activated: activating
 * remounts every screen, and screens that load categories on mount must read the
 * new names rather than race the rename. Scheduled notifications are rebuilt
 * after, because their text is built from the active catalog.
 */
export async function changeLanguage(preference: LanguagePreference): Promise<void> {
  const language = preference === 'system' ? deviceLanguage() : preference;
  await categoryService.localizeDefaultNames(language);
  saveLanguagePreference(preference);
  await notificationCoordinator.languageChanged();
}
