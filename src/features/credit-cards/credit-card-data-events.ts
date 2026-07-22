type Listener = () => void;
const listeners = new Set<Listener>();

export function notifyCreditCardDataChanged(): void {
  for (const listener of listeners) listener();
}

export function subscribeToCreditCardDataChanges(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
