# Money Control — Local Notifications and Reminders

## Scope

Notifications is an Android-first, entirely device-local vertical slice available under **More → Notifications** at `/notifications-settings`. It adds no bottom-navigation item and does not use the Expo Push Service, FCM credentials, a backend, user accounts, cloud synchronization, email, SMS, marketing notifications, bank alerts, or analytics.

The installed SDK-compatible dependency is `expo-notifications@57.0.6` with Expo SDK 57. It schedules local Android notifications and receives tap responses. The app never obtains a device or Expo push token and never sends financial information over a network.

## Permission behavior

The app reads Android notification permission only after App Lock is resolved and SQLite initialization succeeds. It never requests permission on first launch. A request is made only after an explicit **Enable notifications** action or an explicit attempt to enable a reminder category. Before that request, the UI explains the local-only purpose.

Normalized states are not determined, granted, denied but requestable, permanently denied, and unavailable. Dismissal is neutral and leaves the permission requestable. Denial never blocks financial functionality. When Android reports that the permission cannot be requested again, the screen offers a direct link to the app's Android settings. Money Control does not automatically repeat a denied request.

The saved master preference, Android permission, and at least one enabled category are all required before reminders become active. Restore never requests permission and never enables notifications.

## Android channels and foreground behavior

Runtime channel IDs are stable:

| ID | Purpose | Importance | Sound and vibration |
|---|---|---|---|
| `recurring-reminders` | Due, overdue, and upcoming recurring items | Default | System default sound, light vibration |
| `budget-alerts` | 80% and 100% monthly threshold crossings | Default | System default sound and vibration |
| `daily-reminders` | Daily review prompt | Low | Silent, no vibration |

IDs never contain financial record identifiers. Repeated creation is safe; Android owns later user changes to channel behavior. No channel uses maximum importance.
The audible channel definitions omit the `sound` field so Android selects its normal system sound; the daily channel explicitly uses `sound: null`. No custom notification sound is bundled or configured. During development, an install that already created these stable channel IDs must have its app data cleared or be reinstalled once for corrected channel defaults to be created. Repeated channel creation cannot replace an existing Android channel's sound behavior.

Expo's foreground handler deliberately allows the normal system banner/list presentation. There is no second custom alert or modal, so an event is not double-presented. Android channel settings remain authoritative for sound and vibration.

## Exact alarms and delivery timing

Money Control declares neither `SCHEDULE_EXACT_ALARM` nor `USE_EXACT_ALARM`. Expo Notifications 57.0.6 uses an exact-and-idle alarm only when Android reports that exact scheduling is already available; otherwise it falls back to an inexact allow-while-idle alarm. Finance reminders do not justify special exact-alarm access or its Play policy burden.

Android may delay reminders under Doze, battery optimization, OEM power management, or other system policy. Small delays are accepted for this feature.

## Settings and device-local metadata

Migration `0006_local_notifications` adds three SQLite tables outside the financial backup model:

- `notification_settings`: one version-1 device row containing the master preference, category toggles, recurring time/advance days, daily time, content mode, permission-request history, and a safe last-error code/timestamp.
- `scheduled_notifications`: Expo scheduled identifier plus a unique domain key, trigger descriptor, opaque revision, and audit timestamps.
- `budget_notification_state`: per-budget/month 80% and 100% delivery state.

Defaults are all categories disabled, recurring at `09:00`, same-day notice, daily review at `19:00`, and Private content. These values are ordinary non-secret preferences and are intentionally not stored with SecureStore App Lock records.

## Recurring reminders

The coordinator schedules pending occurrences plus active rule dates in a bounded 60-day window. It creates no financial transactions and does not pre-materialize an unbounded occurrence backlog. A stable rule/date/offset domain key remains the same when a future rule date later becomes a persisted occurrence, preventing duplicate reminders.

The supported single advance selection is same day, one day, two days, or three days before. Pending overdue items that have not already been represented in scheduling metadata receive one next-available reminder. Posted and skipped occurrences produce no future reminder. Paused and ended rules cancel their desired work.

Reconciliation is serialized and repeat-safe. It runs after unlocked startup, unlocked foreground return, recurring-screen generation/refresh, rule changes, occurrence changes, notification-setting changes, and restore. Changes to the schedule, amount, account, category, note, active/end state, privacy mode, time, advance days, or device timezone change the opaque revision and replace relevant pending work without storing notification bodies.

A tap routes to a still-pending occurrence when it and its rule remain valid. A stale ID, posted/skipped occurrence, paused/ended rule, or future reminder without a materialized occurrence opens the recurring list safely.

## Budget threshold alerts

Budget alert calculations consume `BudgetService.listAll()`, which uses the existing budget repository's posted-expense aggregation. The notification feature does not reimplement budget attribution. Income, transfers, voided expenses, other categories/months, and search/filter activity do not enter the calculation.

Typed post-persistence events evaluate expense create/edit/void/category/date changes and budget create/update/remove. The coordinator sends one alert when crossing 80% and one when reaching or crossing 100%. A direct jump from below 80% to 100% or more sends only the 100% alert and marks both thresholds handled. Dropping below a threshold resets it for a later genuine crossing.

Creating a budget or changing its limit establishes a baseline from current spending without announcing historical activity. Removing a budget clears its state. Restore also baselines restored budgets without historical spam. Notification failure never rolls back a transaction, budget, or restore.

## Daily review reminder

The optional daily reminder uses one repeating Android daily trigger and contains no financial amount in either privacy mode. Changing its time replaces the saved schedule; disabling it cancels the schedule. The test action replaces any earlier pending test rather than accumulating notifications and also provides a cancel action.

Daily reminders follow the device's local clock. A timezone change is reconciled when the unlocked app next becomes active.

## Privacy and App Lock

Private mode hides amounts, account names, category names, balances, notes, and internal identifiers. Detailed recurring content may contain a category and amount but never the recurring note or full account details. Detailed budget content may contain category, month, and rounded percentage but not a note or precise remaining balance. Daily and test content contain no financial data.

Payloads contain only version 1 and a safe target (`home`, `budgets`, or `recurring`), plus an occurrence ID only when direct validated routing is useful. PINs, verifier data, salts, SecureStore records, backup filenames, notes, balances, and financial records never enter payloads. Notification bodies are not logged.

App Lock and notification content are independent preferences. Private is the default for everyone. When App Lock is enabled and Detailed is selected, the UI recommends Private but does not silently overwrite the choice.

`NotificationRuntime` is inside both `AppLockBoundary` and `DatabaseGate`. While locked, the protected router, SQLite notification coordinators, and financial resolver are unmounted. Android may still show previously scheduled content according to the saved privacy mode, but a tap exposes only the lock gate. After successful unlock, the one retained response is validated, consumed, deduplicated, and routed. Android Back cannot reveal a protected target before unlock.

## Backup and restore

Notification preferences are device-specific and excluded from logical backup version 1. Scheduled IDs and threshold state are also excluded. A restore preserves the current device's preferences, cancels known app schedules, clears scheduling/threshold metadata, rebuilds the recurring/daily schedules permitted by current settings and OS permission, and baselines restored budgets. It does not restore IDs from another device or request permission.

Notification cleanup runs after the exclusive financial replacement commits. A notification failure is recorded for retry/settings display and does not undo restored financial data.

## Known MVP limitations

- Android is the supported notification platform for this slice.
- Reminder delivery is inexact and subject to OS/OEM delay.
- Recurring reminders use one global time and one selected advance offset, not per-rule times or multiple simultaneous offsets.
- Future rule reminders without a materialized occurrence open the recurring list rather than a nonexistent detail record.
- The recurring model has no separate public rule-name field, so Detailed content uses category/type and amount and never substitutes the private note as a title.
- There are no notification actions, snooze, weekday selection for daily review, credit-card statement/due-date alerts, analytics, remote push, or background financial transaction generation.
- Permission denial variants, OEM battery behavior, timezone changes, locked cold-start tap routing, and physical delivery timing require representative physical Android verification.

## Development build

Adding `expo-notifications` changes the native Android dependency graph, so the development client must be rebuilt once. Expo Go can exercise some local-notification APIs but is not the validation runtime for this app because App Lock already requires native QuickCrypto and a development build. No subsequent rebuild is needed for JavaScript-only changes.
