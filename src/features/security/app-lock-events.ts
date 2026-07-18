const listeners = new Set<() => void>();

export function notifyAppLockSettingsChanged(): void {
  for (const listener of listeners) listener();
}

export function subscribeToAppLockSettingsChanges(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

