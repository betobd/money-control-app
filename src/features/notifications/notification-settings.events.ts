import type { NotificationSettings } from './notification.types';

type Listener = (settings: NotificationSettings) => void;
const listeners = new Set<Listener>();

export function notifyNotificationSettingsChanged(settings: NotificationSettings): void {
  for (const listener of listeners) listener(settings);
}

export function subscribeToNotificationSettingsChanges(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
