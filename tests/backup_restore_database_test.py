import sqlite3
from pathlib import Path


root = Path(__file__).parents[1]
db_file = root / 'tests' / 'backup_restore_test.sqlite'
migrations = root / 'src' / 'database' / 'migrations'

tables = (
    'accounts',
    'categories',
    'transactions',
    'transaction_splits',
    'budgets',
    'recurring_transactions',
    'recurring_occurrences',
)
delete_order = (
    'recurring_occurrences',
    'transaction_splits',
    'budgets',
    'recurring_transactions',
    'transactions',
    'categories',
    'accounts',
)


def open_database():
    database = sqlite3.connect(db_file)
    database.execute('PRAGMA foreign_keys = ON')
    return database


def apply_migrations(database):
    for migration in sorted(migrations.glob('*.sql')):
        database.executescript(
            migration.read_text(encoding='utf-8').replace('--> statement-breakpoint', '')
        )


def snapshot(database):
    return {
        table: database.execute(f'SELECT * FROM {table} ORDER BY id').fetchall()
        for table in tables
    }


def derived_values(database):
    balances = dict(database.execute('''
        SELECT a.id, a.opening_balance + COALESCE(SUM(
          CASE
            WHEN t.status <> 'posted' THEN 0
            WHEN t.type = 'income' AND t.account_id = a.id THEN t.amount
            WHEN t.type = 'expense' AND t.account_id = a.id THEN -t.amount
            WHEN t.type = 'transfer' AND t.account_id = a.id THEN -t.amount
            WHEN t.type = 'transfer' AND t.destination_account_id = a.id THEN t.amount
            ELSE 0
          END
        ), 0)
        FROM accounts a
        LEFT JOIN transactions t
          ON t.account_id = a.id OR t.destination_account_id = a.id
        GROUP BY a.id
    '''))
    income, expense = database.execute('''
        SELECT
          COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0),
          COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0)
        FROM transactions
        WHERE status = 'posted'
          AND transaction_date >= '2026-07-01'
          AND transaction_date < '2026-08-01'
    ''').fetchone()
    budget_spend = database.execute('''
        SELECT COALESCE(SUM(t.amount), 0)
        FROM transactions t
        WHERE t.status = 'posted'
          AND t.type = 'expense'
          AND t.category_id = 'food'
          AND t.transaction_date >= '2026-07-01'
          AND t.transaction_date < '2026-08-01'
    ''').fetchone()[0]
    return {
        'balances': balances,
        'income': income,
        'expense': expense,
        'net': income - expense,
        'food_budget_spend': budget_spend,
    }


def restore_atomically(database, backup, fail_after=None):
    database.execute('BEGIN IMMEDIATE')
    try:
        for table in delete_order:
            database.execute(f'DELETE FROM {table}')

        for table in tables:
            columns = database.execute(f'PRAGMA table_info({table})').fetchall()
            placeholders = ','.join('?' for _ in columns)
            database.executemany(
                f'INSERT INTO {table} VALUES ({placeholders})',
                backup[table],
            )
            if fail_after == table:
                raise RuntimeError(f'simulated failure after {table}')

        for table in tables:
            actual = database.execute(f'SELECT COUNT(*) FROM {table}').fetchone()[0]
            assert actual == len(backup[table]), (table, actual, len(backup[table]))

        assert database.execute('PRAGMA foreign_key_check').fetchall() == []
        if fail_after == 'integrity':
            raise RuntimeError('simulated post-restore integrity failure')
        assert database.execute('PRAGMA integrity_check').fetchone()[0] == 'ok'
        database.commit()
    except Exception:
        database.rollback()
        raise


if db_file.exists():
    db_file.unlink()

connection = open_database()
apply_migrations(connection)

utc = '2026-07-16T15:00:00.000Z'
connection.executemany(
    'INSERT INTO accounts VALUES (?,?,?,?,?,?,?,?,?,?)',
    [
        ('checking', 'Checking', 'checking', 'COP', 2_000_000, None, 0, None, utc, utc),
        ('savings', 'Savings', 'savings', 'COP', 500_000, None, 0, None, utc, utc),
        ('card', 'Credit card', 'credit_card', 'COP', -300_000, 2_000_000, 0, None, utc, utc),
        ('archived-account', 'Old cash', 'cash', 'COP', 100_000, None, 1, utc, utc, utc),
    ],
)
connection.executemany(
    'INSERT INTO categories VALUES (?,?,?,?,?,?,?,?)',
    [
        ('salary', 'Salary', 'income', 'salary', 0, None, utc, utc),
        ('food', 'Food', 'expense', 'food', 0, None, utc, utc),
        ('archived-category', 'Old bills', 'expense', 'bills', 1, utc, utc, utc),
    ],
)
connection.executemany(
    'INSERT INTO transactions VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
    [
        ('income', 'income', 'posted', 500_000, 'COP', 'checking', None, 'salary', 'Salary note', '2026-07-01', utc, utc),
        ('expense', 'expense', 'posted', 120_000, 'COP', 'checking', None, 'food', 'Groceries', '2026-07-02', utc, utc),
        ('transfer', 'transfer', 'posted', 200_000, 'COP', 'checking', 'savings', None, 'Savings transfer', '2026-07-03', utc, utc),
        ('card-expense', 'expense', 'posted', 80_000, 'COP', 'card', None, 'archived-category', None, '2026-07-04', utc, utc),
        ('voided', 'expense', 'voided', 999_000, 'COP', 'checking', None, 'food', 'Voided', '2026-07-05', utc, utc),
        ('recurring-posted', 'expense', 'posted', 50_000, 'COP', 'checking', None, 'food', 'Internet', '2026-07-16', utc, utc),
    ],
)
connection.execute(
    'INSERT INTO transaction_splits VALUES (?,?,?,?,?)',
    ('split-expense', 'expense', 'checking', -120_000, 0),
)
connection.execute(
    'INSERT INTO budgets VALUES (?,?,?,?,?,?)',
    ('budget-food', 'food', '2026-07', 400_000, utc, utc),
)
connection.execute(
    'INSERT INTO recurring_transactions VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
    (
        'rule-internet', 'expense', 50_000, 'COP', 'checking', None, 'food',
        'Internet', 'monthly', 1, '2026-07-16', '2026-09-16', None, 1, None,
        utc, utc,
    ),
)
connection.executemany(
    'INSERT INTO recurring_occurrences VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
    [
        ('occurrence-posted', 'rule-internet', '2026-07-16', 'posted', 'expense', 50_000, 'COP', 'checking', None, 'food', 'Internet', 'recurring-posted', utc, utc),
        ('occurrence-pending', 'rule-internet', '2026-08-16', 'pending', 'expense', 50_000, 'COP', 'checking', None, 'food', 'Internet', None, utc, utc),
    ],
)
connection.commit()

backup = snapshot(connection)
baseline_derived = derived_values(connection)
assert baseline_derived == {
    'balances': {
        'archived-account': 100_000,
        'card': -380_000,
        'checking': 2_130_000,
        'savings': 700_000,
    },
    'income': 500_000,
    'expense': 250_000,
    'net': 250_000,
    'food_budget_spend': 170_000,
}

# Later local changes make the current database observably different from the backup.
connection.execute("UPDATE accounts SET name = 'Renamed checking' WHERE id = 'checking'")
connection.execute("UPDATE transactions SET status = 'voided' WHERE id = 'expense'")
connection.execute(
    'INSERT INTO transactions VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
    ('later-income', 'income', 'posted', 1, 'COP', 'savings', None, 'salary', None, '2026-07-20', utc, utc),
)
connection.commit()
changed = snapshot(connection)
assert changed != backup

# Every simulated failure must roll the entire destructive replacement back.
for failure in ('accounts', 'categories', 'transactions', 'recurring_occurrences', 'integrity'):
    try:
        restore_atomically(connection, backup, failure)
        raise AssertionError(f'{failure} restore failure unexpectedly committed')
    except RuntimeError:
        pass
    assert snapshot(connection) == changed, failure
    assert connection.execute('PRAGMA foreign_key_check').fetchall() == []

# A valid empty logical backup clears every application-owned table atomically.
empty_backup = {table: [] for table in tables}
restore_atomically(connection, empty_backup)
assert snapshot(connection) == empty_backup
assert derived_values(connection) == {
    'balances': {}, 'income': 0, 'expense': 0, 'net': 0, 'food_budget_spend': 0,
}

restore_atomically(connection, backup)
assert snapshot(connection) == backup
assert derived_values(connection) == baseline_derived
assert connection.execute("SELECT note FROM transactions WHERE id = 'expense'").fetchone()[0] == 'Groceries'
assert connection.execute("SELECT COUNT(*) FROM transactions WHERE id = 'later-income'").fetchone()[0] == 0
assert connection.execute("SELECT is_archived FROM accounts WHERE id = 'archived-account'").fetchone()[0] == 1
assert connection.execute("SELECT is_archived FROM categories WHERE id = 'archived-category'").fetchone()[0] == 1
assert connection.execute("SELECT destination_account_id FROM transactions WHERE id = 'transfer'").fetchone()[0] == 'savings'
assert connection.execute("SELECT transaction_id FROM recurring_occurrences WHERE id = 'occurrence-posted'").fetchone()[0] == 'recurring-posted'
connection.close()

# The restored database remains complete after an app-style close/reopen.
connection = open_database()
assert snapshot(connection) == backup
assert derived_values(connection) == baseline_derived
assert connection.execute('PRAGMA foreign_key_check').fetchall() == []
assert connection.execute('PRAGMA integrity_check').fetchone()[0] == 'ok'
connection.close()

db_file.unlink()
print('backup restore database integration: PASS')
