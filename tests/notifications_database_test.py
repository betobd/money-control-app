import sqlite3
from pathlib import Path


ROOT = Path(__file__).parents[1]
MIGRATIONS = ROOT / 'src' / 'database' / 'migrations'
DATABASE_PATH = ROOT / 'tests' / 'notifications_database_test.sqlite'
NOW = '2026-07-18T13:00:00.000Z'


if DATABASE_PATH.exists():
    DATABASE_PATH.unlink()

connection = sqlite3.connect(DATABASE_PATH)
connection.execute('PRAGMA foreign_keys = ON')
for migration in sorted(MIGRATIONS.glob('000*.sql')):
    connection.executescript(migration.read_text(encoding='utf-8').replace('--> statement-breakpoint', ''))

tables = {row[0] for row in connection.execute("SELECT name FROM sqlite_master WHERE type = 'table'")}
assert {'notification_settings', 'scheduled_notifications', 'budget_notification_state'} <= tables

connection.execute(
    '''INSERT INTO notification_settings (
      id, updated_at
    ) VALUES ('device', ?)''',
    (NOW,),
)
settings = connection.execute(
    '''SELECT notifications_enabled, recurring_reminders_enabled, recurring_reminder_time,
              recurring_advance_days, budget_alerts_enabled, daily_reminder_enabled,
              daily_reminder_time, notification_content_mode
       FROM notification_settings WHERE id = 'device' '''
).fetchone()
assert settings == (0, 0, '09:00', 0, 0, 0, '19:00', 'private')

try:
    connection.execute("UPDATE notification_settings SET daily_reminder_time = '25:99' WHERE id = 'device'")
    raise AssertionError('invalid notification time accepted')
except sqlite3.IntegrityError:
    pass

connection.execute(
    '''INSERT INTO scheduled_notifications VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)''',
    ('schedule-1', 'recurring-occurrence', 'rule:2026-07-20', 'advance-0', 'native-1', NOW, NOW, 'r1', NOW, NOW),
)
try:
    connection.execute(
        '''INSERT INTO scheduled_notifications VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)''',
        ('schedule-2', 'recurring-occurrence', 'rule:2026-07-20', 'advance-0', 'native-2', NOW, NOW, 'r2', NOW, NOW),
    )
    raise AssertionError('duplicate domain schedule accepted')
except sqlite3.IntegrityError:
    pass

connection.execute(
    '''INSERT INTO budget_notification_state VALUES (?, ?, ?, ?, ?)''',
    ('budget-1', '2026-07', 1, 0, NOW),
)
connection.execute(
    '''INSERT INTO budget_notification_state VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(budget_id, month) DO UPDATE SET threshold_100_notified = excluded.threshold_100_notified''',
    ('budget-1', '2026-07', 1, 1, NOW),
)
assert connection.execute(
    "SELECT threshold_80_notified, threshold_100_notified FROM budget_notification_state"
).fetchone() == (1, 1)

# Device preferences survive a logical financial restore; scheduling metadata is then cleared and rebuilt locally.
connection.execute('DELETE FROM recurring_occurrences')
connection.execute('DELETE FROM budgets')
connection.execute('DELETE FROM recurring_transactions')
connection.execute('DELETE FROM transactions')
connection.execute('DELETE FROM categories')
connection.execute('DELETE FROM accounts')
assert connection.execute("SELECT notification_content_mode FROM notification_settings").fetchone() == ('private',)
assert connection.execute('SELECT count(*) FROM scheduled_notifications').fetchone()[0] == 1
connection.execute('DELETE FROM scheduled_notifications')
connection.execute('DELETE FROM budget_notification_state')
assert connection.execute('SELECT count(*) FROM scheduled_notifications').fetchone()[0] == 0
assert connection.execute('SELECT count(*) FROM budget_notification_state').fetchone()[0] == 0
assert connection.execute('PRAGMA integrity_check').fetchone()[0] == 'ok'

connection.close()
DATABASE_PATH.unlink()
print('notifications database integration: PASS')
