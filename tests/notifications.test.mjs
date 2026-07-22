import assert from 'node:assert/strict';
import test from 'node:test';

import { ANDROID_NOTIFICATION_CHANNELS } from '../src/features/notifications/android-notification-channels.ts';
import { BudgetAlertCoordinator } from '../src/features/notifications/budget-alert.coordinator.ts';
import { DailyReminderCoordinator } from '../src/features/notifications/daily-reminder.coordinator.ts';
import { NOTIFICATION_CHANNELS } from '../src/features/notifications/local-notification.adapter.ts';
import {
  budgetAlertContent,
  dailyReminderContent,
  recurringReminderContent,
} from '../src/features/notifications/notification-content.ts';
import { NotificationNavigationService, parseTarget } from '../src/features/notifications/notification-navigation.service.ts';
import { NotificationPermissionService } from '../src/features/notifications/notification-permission.service.ts';
import { NotificationScheduler } from '../src/features/notifications/notification-scheduler.ts';
import { RecurringReminderCoordinator, RECURRING_REMINDER_HORIZON_DAYS } from '../src/features/notifications/recurring-reminder.coordinator.ts';

const NOW = '2026-07-18T13:00:00.000Z';

class Adapter {
  supported = true;
  raw = { status: 'undetermined', granted: false, canAskAgain: true };
  requests = 0;
  scheduled = [];
  canceled = [];
  settingsOpened = 0;
  nextId = 0;
  isSupported() { return this.supported; }
  configureForegroundPresentation() {}
  async ensureAndroidChannels() {}
  async getPermission() { return this.raw; }
  async requestPermission() { this.requests += 1; return this.raw; }
  async openSystemSettings() { this.settingsOpened += 1; }
  async schedule(content, trigger) { const id = `native-${++this.nextId}`; this.scheduled.push({ id, content, trigger }); return id; }
  async cancel(id) { this.canceled.push(id); }
  async cancelAll() {}
  getLastResponse() { return null; }
  clearLastResponse() {}
  addResponseListener() { return () => {}; }
}

class SchedulingRepository {
  records = [];
  async list() { return this.records.map((value) => ({ ...value })); }
  async find(key) { return this.records.find((value) => value.domainType === key.domainType && value.domainId === key.domainId && value.notificationKind === key.notificationKind) ?? null; }
  async save(record) { this.records = this.records.filter((value) => !(value.domainType === record.domainType && value.domainId === record.domainId && value.notificationKind === record.notificationKind)); this.records.push({ ...record }); }
  async remove(key) { this.records = this.records.filter((value) => !(value.domainType === key.domainType && value.domainId === key.domainId && value.notificationKind === key.notificationKind)); }
  async clear() { this.records = []; }
}

class SettingsRepository {
  value = {
    id: 'device', settingsVersion: 1, notificationsEnabled: true,
    recurringRemindersEnabled: true, recurringReminderTime: '09:00', recurringAdvanceDays: 0,
    budgetAlertsEnabled: true, dailyReminderEnabled: true, dailyReminderTime: '19:00',
    notificationContentMode: 'private', permissionPrompted: true,
    lastErrorCode: null, lastErrorAt: null, updatedAt: NOW,
  };
  async get() { return { ...this.value }; }
  async update(update, updatedAt) { Object.assign(this.value, update, { updatedAt }); return this.get(); }
  async recordError(code, lastErrorAt) { Object.assign(this.value, { lastErrorCode: code, lastErrorAt }); }
  async clearError(updatedAt) { Object.assign(this.value, { lastErrorCode: null, lastErrorAt: null, updatedAt }); }
}

class Permission {
  value = 'granted';
  async getStatus() { return this.value; }
}

test('normalizes notification permission states without prompting on status reads', async () => {
  const adapter = new Adapter();
  const service = new NotificationPermissionService(adapter);
  assert.equal(await service.getStatus(), 'not-determined');
  assert.equal(adapter.requests, 0);
  adapter.raw = { status: 'granted', granted: true, canAskAgain: true };
  assert.equal(await service.getStatus(), 'granted');
  adapter.raw = { status: 'denied', granted: false, canAskAgain: true };
  assert.equal(await service.getStatus(), 'denied-requestable');
  adapter.raw = { status: 'denied', granted: false, canAskAgain: false };
  assert.equal(await service.getStatus(), 'denied-permanent');
  assert.equal(await service.request(), 'denied-permanent');
  assert.equal(adapter.requests, 0);
  await service.openSystemSettings();
  assert.equal(adapter.settingsOpened, 1);
  adapter.supported = false;
  assert.equal(await service.getStatus(), 'unavailable');
});

test('permission dismissal stays requestable and does not become an application error', async () => {
  const adapter = new Adapter();
  const service = new NotificationPermissionService(adapter);
  assert.equal(await service.request(), 'not-determined');
  assert.equal(adapter.requests, 1);
});

test('uses three stable, non-dynamic Android channel IDs with restrained importance', () => {
  assert.deepEqual(ANDROID_NOTIFICATION_CHANNELS.map((channel) => channel.id), [
    NOTIFICATION_CHANNELS.recurring,
    NOTIFICATION_CHANNELS.budgets,
    NOTIFICATION_CHANNELS.daily,
  ]);
  assert.equal(new Set(ANDROID_NOTIFICATION_CHANNELS.map((channel) => channel.id)).size, 3);
  assert.ok(ANDROID_NOTIFICATION_CHANNELS.every((channel) => channel.importance !== 'max'));
  const recurring = ANDROID_NOTIFICATION_CHANNELS.find((channel) => channel.id === NOTIFICATION_CHANNELS.recurring);
  const budgets = ANDROID_NOTIFICATION_CHANNELS.find((channel) => channel.id === NOTIFICATION_CHANNELS.budgets);
  const daily = ANDROID_NOTIFICATION_CHANNELS.find((channel) => channel.id === NOTIFICATION_CHANNELS.daily);
  assert.equal(Object.hasOwn(recurring, 'sound'), false);
  assert.equal(Object.hasOwn(budgets, 'sound'), false);
  assert.equal(daily.sound, null);
  assert.ok(ANDROID_NOTIFICATION_CHANNELS.every((channel) => channel.sound !== 'default'));
});

function desired(triggerAt = '2026-07-20T14:00:00.000Z', revision = 'r1') {
  return {
    domainType: 'recurring-occurrence', domainId: 'rule:2026-07-20', notificationKind: 'advance-0',
    triggerAt, revision, content: dailyReminderContent(),
    trigger: { type: 'date', date: new Date(triggerAt), channelId: NOTIFICATION_CHANNELS.recurring },
  };
}

test('scheduler is idempotent, replaces changed work, and cancels stale work', async () => {
  const adapter = new Adapter();
  const repository = new SchedulingRepository();
  const scheduler = new NotificationScheduler(repository, adapter, () => 'metadata-1', () => NOW);
  await scheduler.reconcile([desired()], ['recurring-occurrence']);
  await scheduler.reconcile([desired()], ['recurring-occurrence']);
  assert.equal(adapter.scheduled.length, 1);
  await scheduler.reconcile([desired('2026-07-21T14:00:00.000Z', 'r2')], ['recurring-occurrence']);
  assert.equal(adapter.scheduled.length, 2);
  assert.deepEqual(adapter.canceled, ['native-1']);
  await scheduler.reconcile([], ['recurring-occurrence']);
  assert.deepEqual(adapter.canceled, ['native-1', 'native-2']);
  assert.equal(repository.records.length, 0);
});

test('scheduler cancels a newly-created native notification if metadata persistence fails', async () => {
  const adapter = new Adapter();
  const repository = new SchedulingRepository();
  repository.save = async () => { throw new Error('db'); };
  const scheduler = new NotificationScheduler(repository, adapter, () => 'metadata-1', () => NOW);
  await assert.rejects(() => scheduler.scheduleOrReplace(desired()));
  assert.deepEqual(adapter.canceled, ['native-1']);
});

const rule = {
  id: 'rule', type: 'expense', amount: 100000, currency: 'COP', accountId: 'checking', destinationAccountId: null,
  categoryId: 'food', note: 'secret note', frequency: 'daily', interval: 1, startDate: '2026-07-18',
  nextOccurrenceDate: '2026-07-18', endDate: null, isActive: true, endedAt: null,
  createdAt: NOW, updatedAt: NOW, accountName: 'Checking', destinationAccountName: null, categoryName: 'Food & Dining',
};

class CapturingScheduler {
  desired = [];
  domains = [];
  async reconcile(desiredItems, domains) { this.desired = desiredItems; this.domains = domains; }
}

test('recurring reconciliation schedules due today and respects a 60-day horizon without duplicates', async () => {
  const scheduler = new CapturingScheduler();
  const recurring = { async listRules() { return [rule]; }, async listPendingThrough() { return []; } };
  const coordinator = new RecurringReminderCoordinator(recurring, new SettingsRepository(), new Permission(), scheduler, () => new Date(2026, 6, 18, 8), () => '2026-07-18');
  await coordinator.reconcile();
  assert.equal(scheduler.desired.length, RECURRING_REMINDER_HORIZON_DAYS + 1);
  assert.equal(new Set(scheduler.desired.map((item) => item.domainId)).size, scheduler.desired.length);
  assert.equal(scheduler.desired[0].domainId, 'rule:2026-07-18');
});

test('recurring advance selection schedules the configured day and materialized occurrence does not duplicate its rule date', async () => {
  const scheduler = new CapturingScheduler();
  const settings = new SettingsRepository(); settings.value.recurringAdvanceDays = 1;
  const pending = [{ ...rule, id: 'occurrence', recurringTransactionId: 'rule', scheduledDate: '2026-07-20', status: 'pending', transactionId: null }];
  const recurring = { async listRules() { return [{ ...rule, nextOccurrenceDate: '2026-07-20' }]; }, async listPendingThrough() { return pending; } };
  const coordinator = new RecurringReminderCoordinator(recurring, settings, new Permission(), scheduler, () => new Date(2026, 6, 18, 8), () => '2026-07-18');
  await coordinator.reconcile();
  assert.equal(scheduler.desired.filter((item) => item.domainId === 'rule:2026-07-20').length, 1);
  const trigger = scheduler.desired.find((item) => item.domainId === 'rule:2026-07-20').trigger.date;
  assert.equal(trigger.getDate(), 19);
});

test('posted/skipped occurrences and paused or ended rules reconcile to cancellation', async () => {
  for (const changedRule of [{ ...rule, isActive: false }, { ...rule, endedAt: NOW, isActive: false }]) {
    const scheduler = new CapturingScheduler();
    const recurring = { async listRules() { return [changedRule]; }, async listPendingThrough() { return [{ ...rule, id: 'occ', recurringTransactionId: 'rule', scheduledDate: '2026-07-18', status: 'pending' }]; } };
    await new RecurringReminderCoordinator(recurring, new SettingsRepository(), new Permission(), scheduler, () => new Date(2026, 6, 18, 8), () => '2026-07-18').reconcile();
    assert.equal(scheduler.desired.length, 0);
  }
});

test('daily reminder enables, disables, and follows device-local time metadata', async () => {
  const scheduler = new CapturingScheduler();
  const settings = new SettingsRepository();
  const coordinator = new DailyReminderCoordinator(settings, new Permission(), scheduler);
  await coordinator.reconcile();
  assert.equal(scheduler.desired[0].trigger.type, 'daily');
  assert.deepEqual({ hour: scheduler.desired[0].trigger.hour, minute: scheduler.desired[0].trigger.minute }, { hour: 19, minute: 0 });
  settings.value.dailyReminderEnabled = false;
  await coordinator.reconcile();
  assert.equal(scheduler.desired.length, 0);
});

class StateRepository {
  values = [];
  async list() { return this.values.map((value) => ({ ...value })); }
  async find(budgetId, month) { return this.values.find((value) => value.budgetId === budgetId && value.month === month) ?? null; }
  async save(state) { this.values = this.values.filter((value) => value.budgetId !== state.budgetId || value.month !== state.month); this.values.push({ ...state }); }
  async remove(budgetId, month) { this.values = this.values.filter((value) => value.budgetId !== budgetId || (month && value.month !== month)); }
  async clear() { this.values = []; }
}

function budget(spent) {
  return { id: 'food-budget', categoryId: 'food', categoryName: 'Food & Dining', categoryIcon: 'food', categoryIsArchived: false, month: '2026-07', limitAmount: 1000, spent, remaining: 1000 - spent, percentageUsed: spent / 10, progressWidth: '80%', status: spent >= 1000 ? 'fully-used' : spent >= 800 ? 'near-limit' : 'on-track', createdAt: NOW, updatedAt: NOW };
}

test('budget alerts fire once at 80 and 100, reset after spending drops, and ignore income/transfers', async () => {
  const adapter = new Adapter(); const states = new StateRepository(); const settings = new SettingsRepository();
  let current = budget(799);
  const coordinator = new BudgetAlertCoordinator({ async listAll() { return [current]; } }, states, settings, new Permission(), adapter, () => NOW);
  const expense = { kind: 'transaction', operation: 'create', after: { type: 'expense' } };
  await coordinator.evaluate(expense); assert.equal(adapter.scheduled.length, 0);
  current = budget(800); await coordinator.evaluate(expense); await coordinator.evaluate(expense); assert.equal(adapter.scheduled.length, 1);
  current = budget(1000); await coordinator.evaluate(expense); await coordinator.evaluate(expense); assert.equal(adapter.scheduled.length, 2);
  current = budget(700); await coordinator.evaluate(expense); assert.equal(states.values[0].threshold80Notified, false);
  current = budget(850); await coordinator.evaluate(expense); assert.equal(adapter.scheduled.length, 3);
  assert.equal(coordinator.shouldEvaluate({ kind: 'transaction', operation: 'create', after: { type: 'income' } }), false);
  assert.equal(coordinator.shouldEvaluate({ kind: 'transaction', operation: 'create', after: { type: 'transfer' } }), false);
});

test('budget creation/limit edits and restore baseline current spending without historical alerts', async () => {
  const adapter = new Adapter(); const states = new StateRepository(); const settings = new SettingsRepository();
  const coordinator = new BudgetAlertCoordinator({ async listAll() { return [budget(900)]; } }, states, settings, new Permission(), adapter, () => NOW);
  await coordinator.evaluate({ kind: 'budget', operation: 'create', budgetId: 'food-budget' });
  await coordinator.evaluate({ kind: 'budget', operation: 'update', budgetId: 'food-budget' });
  assert.equal(adapter.scheduled.length, 0);
  assert.equal(states.values[0].threshold80Notified, true);
  await coordinator.evaluate({ kind: 'budget', operation: 'remove', budgetId: 'food-budget' });
  assert.equal(states.values.length, 0);
  await coordinator.baseline();
  assert.equal(adapter.scheduled.length, 0);
});

test('private and detailed content respect financial privacy boundaries', () => {
  const privateRecurring = recurringReminderContent(rule, 'private', 'due');
  assert.doesNotMatch(privateRecurring.body, /100|Food|Checking|secret/i);
  const detailedRecurring = recurringReminderContent(rule, 'detailed', 'due');
  assert.match(detailedRecurring.body, /Food/);
  assert.match(detailedRecurring.body, /100/);
  assert.doesNotMatch(detailedRecurring.body, /secret|Checking/i);
  const privateBudget = budgetAlertContent(budget(820), 80, 'private');
  assert.doesNotMatch(privateBudget.body, /Food|82|1000/i);
  const detailedBudget = budgetAlertContent(budget(820), 80, 'detailed');
  assert.match(detailedBudget.body, /Food/);
  assert.doesNotMatch(detailedBudget.body, /secret|Checking/i);
  assert.doesNotMatch(dailyReminderContent().body, /\d/);
});

test('notification navigation validates payloads, routes pending active occurrences, and safely falls back', async () => {
  const occurrence = { id: 'occ', recurringTransactionId: 'rule', status: 'pending' };
  let currentRule = { id: 'rule', isActive: true, endedAt: null };
  const service = new NotificationNavigationService({ async getOccurrence(id) { return id === 'occ' ? occurrence : null; }, async getRule() { return currentRule; } });
  assert.deepEqual(parseTarget({ version: 1, target: 'recurring', occurrenceId: 'occ' }), { version: 1, target: 'recurring', occurrenceId: 'occ' });
  assert.equal(parseTarget({ version: 1, target: 'recurring', occurrenceId: 42 }), null);
  assert.deepEqual(await service.resolve({ responseId: 'one', data: { version: 1, target: 'recurring', occurrenceId: 'occ' } }), { pathname: '/recurring-occurrence', params: { id: 'occ' } });
  assert.equal(await service.resolve({ responseId: 'one', data: { version: 1, target: 'home' } }), null);
  currentRule = { ...currentRule, isActive: false };
  assert.equal(await service.resolve({ responseId: 'two', data: { version: 1, target: 'recurring', occurrenceId: 'occ' } }), '/recurring');
  assert.equal(await service.resolve({ responseId: 'three', data: { version: 1, target: 'recurring', occurrenceId: 'missing' } }), '/recurring');
  assert.equal(await service.resolve({ responseId: 'four', data: { version: 2, target: 'home' } }), null);
});
