import type { AppLockState } from './app-lock.types';

export function canRenderProtectedContent(status: AppLockState['status']): boolean {
  return status === 'disabled' || status === 'unlocked';
}
