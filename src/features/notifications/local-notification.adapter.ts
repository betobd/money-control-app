import type {
  LocalNotificationContent,
  LocalNotificationResponse,
  LocalNotificationTrigger,
} from './notification.types';

export const NOTIFICATION_CHANNELS = {
  recurring: 'recurring-reminders',
  budgets: 'budget-alerts',
  daily: 'daily-reminders',
} as const;

export type RawNotificationPermission = {
  status: 'granted' | 'denied' | 'undetermined';
  granted: boolean;
  canAskAgain: boolean;
};

export interface LocalNotificationAdapter {
  isSupported(): boolean;
  configureForegroundPresentation(): void;
  ensureAndroidChannels(): Promise<void>;
  getPermission(): Promise<RawNotificationPermission>;
  requestPermission(): Promise<RawNotificationPermission>;
  openSystemSettings(): Promise<void>;
  schedule(content: LocalNotificationContent, trigger: LocalNotificationTrigger): Promise<string>;
  cancel(scheduledNotificationId: string): Promise<void>;
  cancelAll(): Promise<void>;
  getLastResponse(): LocalNotificationResponse | null;
  clearLastResponse(): void;
  addResponseListener(listener: (response: LocalNotificationResponse) => void): () => void;
}
