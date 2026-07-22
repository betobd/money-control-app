import { randomUUID } from 'expo-crypto';

import { budgetService } from '@/features/budgets/budgets';
import { recurringTransactionService } from '@/features/recurring-transactions/recurring-transactions';
import { BudgetAlertCoordinator } from './budget-alert.coordinator';
import { DailyReminderCoordinator } from './daily-reminder.coordinator';
import { ExpoLocalNotificationAdapter } from './expo-local-notification.adapter';
import { NotificationCoordinator } from './notification.coordinator';
import { NotificationNavigationService } from './notification-navigation.service';
import { NotificationPermissionService } from './notification-permission.service';
import { NotificationScheduler } from './notification-scheduler';
import { NotificationSettingsService } from './notification-settings.service';
import { NotificationTestService } from './notification-test.service';
import { RecurringReminderCoordinator } from './recurring-reminder.coordinator';
import {
  SQLiteBudgetNotificationStateRepository,
  SQLiteNotificationRepository,
  SQLiteNotificationSchedulingRepository,
} from './sqlite-notification.repository';

export const localNotificationAdapter = new ExpoLocalNotificationAdapter();
export const notificationPermissionService = new NotificationPermissionService(localNotificationAdapter);
export const notificationRepository = new SQLiteNotificationRepository();
const schedulingRepository = new SQLiteNotificationSchedulingRepository(notificationRepository);
const budgetStateRepository = new SQLiteBudgetNotificationStateRepository(notificationRepository);
export const notificationScheduler = new NotificationScheduler(
  schedulingRepository,
  localNotificationAdapter,
  randomUUID,
);
export const notificationSettingsService = new NotificationSettingsService(
  notificationRepository,
  notificationPermissionService,
);
const recurringReminderCoordinator = new RecurringReminderCoordinator(
  recurringTransactionService,
  notificationRepository,
  notificationPermissionService,
  notificationScheduler,
);
const dailyReminderCoordinator = new DailyReminderCoordinator(
  notificationRepository,
  notificationPermissionService,
  notificationScheduler,
);
const budgetAlertCoordinator = new BudgetAlertCoordinator(
  budgetService,
  budgetStateRepository,
  notificationRepository,
  notificationPermissionService,
  localNotificationAdapter,
);
export const notificationCoordinator = new NotificationCoordinator(
  localNotificationAdapter,
  notificationRepository,
  notificationScheduler,
  budgetStateRepository,
  recurringReminderCoordinator,
  dailyReminderCoordinator,
  budgetAlertCoordinator,
);
export const notificationNavigationService = new NotificationNavigationService(recurringTransactionService);
export const notificationTestService = new NotificationTestService(
  notificationPermissionService,
  notificationScheduler,
);
