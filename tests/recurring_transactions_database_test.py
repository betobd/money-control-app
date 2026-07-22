import sqlite3
from pathlib import Path

root = Path(__file__).parents[1]
migrations = root / 'src' / 'database' / 'migrations'
db_file = root / 'tests' / 'recurring_transactions_test.sqlite'
if db_file.exists():
    db_file.unlink()


def apply(database, migration):
    database.executescript(
        migration.read_text(encoding='utf-8').replace('--> statement-breakpoint', '')
    )


connection = sqlite3.connect(db_file)
connection.execute('PRAGMA foreign_keys = ON')
for migration in sorted(migrations.glob('*.sql')):
    apply(connection, migration)

columns = {
    row[1] for row in connection.execute("PRAGMA table_info('recurring_transactions')")
}
assert {'start_date', 'next_occurrence_date', 'end_date', 'ended_at'} <= columns
occurrence_columns = {
    row[1] for row in connection.execute("PRAGMA table_info('recurring_occurrences')")
}
assert {
    'recurring_transaction_id', 'scheduled_date', 'status', 'transaction_id'
} <= occurrence_columns

utc = '2026-07-16T15:00:00.000Z'
connection.execute(
    'INSERT INTO accounts (id,name,type,currency,opening_balance,credit_limit,is_archived,archived_at,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)',
    ('checking', 'Checking', 'checking', 'COP', 1_000_000, None, 0, None, utc, utc),
)
connection.execute(
    'INSERT INTO categories VALUES (?,?,?,?,?,?,?,?)',
    ('food', 'Food', 'expense', 'food', 0, None, utc, utc),
)
connection.execute(
    '''INSERT INTO recurring_transactions VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)''',
    (
        'rule', 'expense', 50_000, 'COP', 'checking', None, 'food', 'Internet',
        'monthly', 1, '2026-01-31', '2026-02-28', None, 1, None, utc, utc,
    ),
)
connection.execute(
    '''INSERT INTO recurring_occurrences VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)''',
    (
        'occurrence', 'rule', '2026-01-31', 'pending', 'expense', 50_000, 'COP',
        'checking', None, 'food', 'Internet', None, utc, utc,
    ),
)

try:
    connection.execute(
        '''INSERT INTO recurring_occurrences VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)''',
        (
            'duplicate', 'rule', '2026-01-31', 'pending', 'expense', 50_000, 'COP',
            'checking', None, 'food', None, None, utc, utc,
        ),
    )
    raise AssertionError('duplicate rule/date occurrence was accepted')
except sqlite3.IntegrityError:
    pass

try:
    connection.execute(
        "UPDATE recurring_occurrences SET status = 'posted' WHERE id = 'occurrence'"
    )
    raise AssertionError('posted occurrence without a transaction was accepted')
except sqlite3.IntegrityError:
    pass

connection.execute(
    'INSERT INTO transactions VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
    (
        'transaction', 'expense', 'posted', 50_000, 'COP', 'checking', None,
        'food', 'Internet', '2026-01-31', utc, utc,
    ),
)
connection.execute(
    """UPDATE recurring_occurrences
       SET status = 'posted', transaction_id = 'transaction', updated_at = ?
       WHERE id = 'occurrence' AND status = 'pending'""",
    (utc,),
)
assert connection.execute(
    "SELECT status, transaction_id FROM recurring_occurrences WHERE id = 'occurrence'"
).fetchone() == ('posted', 'transaction')

try:
    connection.execute("DELETE FROM accounts WHERE id = 'checking'")
    raise AssertionError('referenced account deletion was accepted')
except sqlite3.IntegrityError:
    pass

connection.commit()
connection.close()

connection = sqlite3.connect(db_file)
connection.execute('PRAGMA foreign_keys = ON')
assert connection.execute(
    "SELECT status, transaction_id FROM recurring_occurrences WHERE id = 'occurrence'"
).fetchone() == ('posted', 'transaction')
assert connection.execute('PRAGMA integrity_check').fetchone()[0] == 'ok'
connection.close()

# Upgrade fixture: an existing foundation rule is preserved by migration 0005.
upgrade = sqlite3.connect(':memory:')
upgrade.execute('PRAGMA foreign_keys = ON')
for migration in sorted(migrations.glob('*.sql'))[:5]:
    apply(upgrade, migration)
upgrade.execute(
    'INSERT INTO accounts (id,name,type,currency,opening_balance,credit_limit,is_archived,archived_at,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)',
    ('legacy-account', 'Legacy', 'checking', 'COP', 0, None, 0, None, utc, utc),
)
upgrade.execute(
    'INSERT INTO categories VALUES (?,?,?,?,?,?,?,?)',
    ('legacy-category', 'Legacy', 'expense', 'other', 0, None, utc, utc),
)
upgrade.execute(
    'INSERT INTO recurring_transactions VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
    (
        'legacy-rule', 'expense', 1_000, 'COP', 'legacy-account', None,
        'legacy-category', None, 'monthly', 1, '2026-08-31', 1, utc, utc,
    ),
)
apply(upgrade, migrations / '0005_recurring_occurrences.sql')
assert upgrade.execute(
    """SELECT start_date, next_occurrence_date, end_date, ended_at
       FROM recurring_transactions WHERE id = 'legacy-rule'"""
).fetchone() == ('2026-08-31', '2026-08-31', None, None)
assert upgrade.execute('PRAGMA integrity_check').fetchone()[0] == 'ok'
upgrade.close()

db_file.unlink()
print('recurring transactions database integration: PASS')
