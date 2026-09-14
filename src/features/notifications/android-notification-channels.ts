import { getMessages } from '@/i18n/messages';

import { NOTIFICATION_CHANNELS } from './local-notification.adapter';

// Names and descriptions are getters so they are read in the active language
// each time the channels are created (Android updates them in place).
export const ANDROID_NOTIFICATION_CHANNELS = [
  {
    id: NOTIFICATION_CHANNELS.recurring,
    get name() { return getMessages().notifications.channels.recurringName; },
    get description() { return getMessages().notifications.channels.recurringDescription; },
    importance: 'default' as const,
    enableVibrate: true,
    vibrationPattern: [0, 180],
  },
  {
    id: NOTIFICATION_CHANNELS.budgets,
    get name() { return getMessages().notifications.channels.budgetsName; },
    get description() { return getMessages().notifications.channels.budgetsDescription; },
    importance: 'default' as const,
    enableVibrate: true,
    vibrationPattern: [0, 250, 120, 250],
  },
  {
    id: NOTIFICATION_CHANNELS.creditCards,
    get name() { return getMessages().notifications.channels.creditCardsName; },
    get description() { return getMessages().notifications.channels.creditCardsDescription; },
    importance: 'default' as const,
    enableVibrate: true,
    vibrationPattern: [0, 180],
  },
  {
    id: NOTIFICATION_CHANNELS.daily,
    get name() { return getMessages().notifications.channels.dailyName; },
    get description() { return getMessages().notifications.channels.dailyDescription; },
    importance: 'low' as const,
    sound: null,
    enableVibrate: false,
    vibrationPattern: null,
  },
] as const;
