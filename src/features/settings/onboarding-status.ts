/**
 * Whether the first-run welcome flow has been completed, cached for synchronous
 * reads.
 *
 * The route guard decides between the welcome flow and the app while rendering,
 * so like the base currency it is loaded once during database initialization and
 * read synchronously afterwards. Reading before that load throws for the same
 * reason: guessing "completed" would skip the one screen that lets a new user
 * choose their base currency before their first transaction locks it.
 */
let cached: boolean | undefined;
const listeners = new Set<() => void>();

export function isOnboardingCompleted(): boolean {
  if (cached === undefined) {
    throw new Error('The onboarding status was read before the database finished initializing.');
  }
  return cached;
}

/** Seed or update the cache and wake every subscriber. */
export function primeOnboardingStatus(completed: boolean): void {
  if (cached === completed) return;
  cached = completed;
  for (const listener of [...listeners]) listener();
}

/** Reset to the unloaded state. Tests only. */
export function resetOnboardingStatusCache(): void {
  cached = undefined;
}

export function subscribeToOnboardingStatus(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
