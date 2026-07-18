import type { AppLockDelay } from './app-lock.types';

type BackgroundMoment = {
  monotonicMs: number | null;
  wallClockMs: number;
};

export class AppLockTiming {
  private backgroundMoment: BackgroundMoment | null = null;

  recordBackground(monotonicMs: number | null, wallClockMs: number): void {
    if (this.backgroundMoment) return;
    this.backgroundMoment = {
      monotonicMs: Number.isFinite(monotonicMs) ? monotonicMs : null,
      wallClockMs,
    };
  }

  clear(): void {
    this.backgroundMoment = null;
  }

  shouldLockOnActive(
    delayMs: AppLockDelay,
    monotonicMs: number | null,
    wallClockMs: number,
  ): boolean {
    const background = this.backgroundMoment;
    this.backgroundMoment = null;
    if (!background) return false;
    if (delayMs === 0) return true;

    if (
      background.monotonicMs !== null
      && Number.isFinite(monotonicMs)
      && (monotonicMs as number) >= background.monotonicMs
    ) {
      return (monotonicMs as number) - background.monotonicMs >= delayMs;
    }

    if (!Number.isFinite(wallClockMs) || wallClockMs < background.wallClockMs) return true;
    return wallClockMs - background.wallClockMs >= delayMs;
  }
}

