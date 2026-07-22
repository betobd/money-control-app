import { NOTIFICATION_CHANNELS } from './local-notification.adapter';

export const ANDROID_NOTIFICATION_CHANNELS = [
  {
    id: NOTIFICATION_CHANNELS.recurring,
    name: 'Recurring reminders',
    description: 'Due and upcoming recurring transaction reminders',
    importance: 'default' as const,
    enableVibrate: true,
    vibrationPattern: [0, 180],
  },
  {
    id: NOTIFICATION_CHANNELS.budgets,
    name: 'Budget alerts',
    description: 'Alerts when monthly budgets approach or reach their limits',
    importance: 'default' as const,
    enableVibrate: true,
    vibrationPattern: [0, 250, 120, 250],
  },
  {
    id: NOTIFICATION_CHANNELS.daily,
    name: 'Daily reminders',
    description: 'Quiet reminders to review your finances',
    importance: 'low' as const,
    sound: null,
    enableVibrate: false,
    vibrationPattern: null,
  },
] as const;
