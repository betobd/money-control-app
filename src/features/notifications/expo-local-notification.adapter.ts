import * as Notifications from 'expo-notifications';
import { Linking, Platform } from 'react-native';

import {
  type LocalNotificationAdapter,
  type RawNotificationPermission,
} from './local-notification.adapter';
import type {
  LocalNotificationContent,
  LocalNotificationResponse,
  LocalNotificationTrigger,
} from './notification.types';
import { ANDROID_NOTIFICATION_CHANNELS } from './android-notification-channels';

function permission(value: Notifications.NotificationPermissionsStatus): RawNotificationPermission {
  const status = value.status === 'granted' || value.status === 'denied'
    ? value.status
    : 'undetermined';
  return { status, granted: value.granted, canAskAgain: value.canAskAgain };
}

function response(value: Notifications.NotificationResponse): LocalNotificationResponse {
  return {
    responseId: `${value.notification.request.identifier}:${value.actionIdentifier}`,
    data: value.notification.request.content.data ?? {},
  };
}

function priority(value: LocalNotificationContent['priority']): Notifications.AndroidNotificationPriority {
  if (value === 'high') return Notifications.AndroidNotificationPriority.HIGH;
  if (value === 'low') return Notifications.AndroidNotificationPriority.LOW;
  return Notifications.AndroidNotificationPriority.DEFAULT;
}

export class ExpoLocalNotificationAdapter implements LocalNotificationAdapter {
  isSupported(): boolean {
    return Platform.OS === 'android';
  }

  configureForegroundPresentation(): void {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        priority: Notifications.AndroidNotificationPriority.DEFAULT,
      }),
      handleError: () => {
        console.error('[notifications] foreground presentation failed');
      },
    });
  }

  async ensureAndroidChannels(): Promise<void> {
    if (!this.isSupported()) return;
    for (const channel of ANDROID_NOTIFICATION_CHANNELS) {
      await Notifications.setNotificationChannelAsync(channel.id, {
        name: channel.name,
        description: channel.description,
        importance: channel.importance === 'low'
          ? Notifications.AndroidImportance.LOW
          : Notifications.AndroidImportance.DEFAULT,
        ...('sound' in channel ? { sound: channel.sound } : {}),
        enableVibrate: channel.enableVibrate,
        vibrationPattern: channel.vibrationPattern ? [...channel.vibrationPattern] : undefined,
        showBadge: false,
      });
    }
  }

  async getPermission(): Promise<RawNotificationPermission> {
    return permission(await Notifications.getPermissionsAsync());
  }

  async requestPermission(): Promise<RawNotificationPermission> {
    return permission(await Notifications.requestPermissionsAsync());
  }

  openSystemSettings(): Promise<void> {
    return Linking.openSettings();
  }

  async schedule(content: LocalNotificationContent, trigger: LocalNotificationTrigger): Promise<string> {
    const notificationContent: Notifications.NotificationContentInput = {
      title: content.title,
      body: content.body,
      data: content.data,
      priority: priority(content.priority),
    };
    if (trigger.type === 'immediate') {
      return Notifications.scheduleNotificationAsync({
        content: notificationContent,
        trigger: { channelId: trigger.channelId },
      });
    }
    if (trigger.type === 'daily') {
      return Notifications.scheduleNotificationAsync({
        content: notificationContent,
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: trigger.hour,
          minute: trigger.minute,
          channelId: trigger.channelId,
        },
      });
    }
    return Notifications.scheduleNotificationAsync({
      content: notificationContent,
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: trigger.date,
        channelId: trigger.channelId,
      },
    });
  }

  cancel(scheduledNotificationId: string): Promise<void> {
    return Notifications.cancelScheduledNotificationAsync(scheduledNotificationId);
  }

  cancelAll(): Promise<void> {
    return Notifications.cancelAllScheduledNotificationsAsync();
  }

  getLastResponse(): LocalNotificationResponse | null {
    const value = Notifications.getLastNotificationResponse();
    return value ? response(value) : null;
  }

  clearLastResponse(): void {
    Notifications.clearLastNotificationResponse();
  }

  addResponseListener(listener: (value: LocalNotificationResponse) => void): () => void {
    const subscription = Notifications.addNotificationResponseReceivedListener((value) => listener(response(value)));
    return () => subscription.remove();
  }
}
