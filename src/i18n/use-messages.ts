import { useSyncExternalStore } from 'react';

import type { Language } from './languages';
import { getLanguage, getMessages, subscribeToLanguage, type Messages } from './messages';

/**
 * The active message catalog, re-rendering the caller when the language changes.
 *
 *   const t = useMessages();
 *   <Text>{t.common.save}</Text>
 */
export function useMessages(): Messages {
  return useSyncExternalStore(subscribeToLanguage, getMessages, getMessages);
}

export function useLanguage(): Language {
  return useSyncExternalStore(subscribeToLanguage, getLanguage, getLanguage);
}
