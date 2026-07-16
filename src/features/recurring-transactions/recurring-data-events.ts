const listeners = new Set<() => void>();

export function notifyRecurringDataChanged(): void {
  listeners.forEach((listener) => listener());
}

export function subscribeToRecurringDataChanges(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
