import sqlite3
from pathlib import Path


ROOT = Path(__file__).parents[1]
MIGRATIONS = ROOT / 'src' / 'database' / 'migrations'
DATABASE_PATH = ROOT / 'tests' / 'budgets_schema_test.sqlite'
UTC = '2026-07-13T12:00:00.000Z'


def migration_sql(name: str) -> str:
    return (MIGRATIONS / name).read_text(encoding='utf-8').replace('--> statement-breakpoint', '')


def open_database() -> sqlite3.Connection:
    connection = sqlite3.connect(DATABASE_PATH)
    connection.execute('PRAGMA foreign_keys = ON')
    return connection


def apply_before_budget_migration(connection: sqlite3.Connection) -> None:
    for migration in sorted(MIGRATIONS.glob('000[0-3]_*.sql')):
        connection.executescript(migration_sql(migration.name))


if DATABASE_PATH.exists():
    DATABASE_PATH.unlink()

connection = open_database()
apply_before_budget_migration(connection)
connection.executemany(
    'INSERT INTO categories VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [
        ('food', 'Food & Dining', 'expense', 'food', 0, None, UTC, UTC),
        ('travel', 'Travel', 'expense', 'travel', 0, None, UTC, UTC),
        ('archived', 'Old household', 'expense', 'home', 1, UTC, UTC, UTC),
    ],
)
connection.executemany(
    'INSERT INTO budgets VALUES (?, ?, ?, ?, ?, ?, ?)',
    [
        ('food-july', 'food', '2026-07', 600_000, 'COP', UTC, UTC),
        ('archived-june', 'archived', '2026-06', 100_000, 'COP', UTC, UTC),
    ],
)
connection.executescript(migration_sql('0004_one_category_monthly_budgets.sql'))

budget_columns = [row[1] for row in connection.execute('PRAGMA table_info(budgets)')]
assert budget_columns == ['id', 'category_id', 'month', 'limit_amount', 'created_at', 'updated_at']
assert connection.execute(
    "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'budget_categories'"
).fetchone() is None
assert connection.execute(
    'SELECT category_id, month, limit_amount FROM budgets WHERE id = ?', ('food-july',)
).fetchone() == ('food', '2026-07', 600_000)
assert connection.execute(
    'SELECT category_id, month, limit_amount FROM budgets WHERE id = ?', ('archived-june',)
).fetchone() == ('archived', '2026-06', 100_000)

connection.execute(
    'INSERT INTO budgets VALUES (?, ?, ?, ?, ?, ?)',
    ('food-august', 'food', '2026-08', 700_000, UTC, UTC),
)
try:
    connection.execute(
        'INSERT INTO budgets VALUES (?, ?, ?, ?, ?, ?)',
        ('food-july-duplicate', 'food', '2026-07', 800_000, UTC, UTC),
    )
    raise AssertionError('duplicate category/month budget was accepted')
except sqlite3.IntegrityError:
    pass

for invalid_budget in [
    ('zero-limit', 'travel', '2026-07', 0, UTC, UTC),
    ('invalid-month', 'travel', '2026-13', 100_000, UTC, UTC),
]:
    try:
        connection.execute('INSERT INTO budgets VALUES (?, ?, ?, ?, ?, ?)', invalid_budget)
        raise AssertionError(f'invalid budget was accepted: {invalid_budget[0]}')
    except sqlite3.IntegrityError:
        pass

try:
    connection.execute('DELETE FROM categories WHERE id = ?', ('food',))
    raise AssertionError('referenced category was deleted')
except sqlite3.IntegrityError:
    pass

assert connection.execute('PRAGMA foreign_key_check').fetchall() == []
assert connection.execute('PRAGMA integrity_check').fetchone()[0] == 'ok'
connection.close()
DATABASE_PATH.unlink()

connection = open_database()
apply_before_budget_migration(connection)
connection.execute(
    'INSERT INTO categories VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    ('salary', 'Salary', 'income', 'salary', 0, None, UTC, UTC),
)
connection.execute(
    'INSERT INTO budgets VALUES (?, ?, ?, ?, ?, ?, ?)',
    ('invalid-income-budget', 'salary', '2026-07', 500_000, 'COP', UTC, UTC),
)
try:
    connection.executescript(migration_sql('0004_one_category_monthly_budgets.sql'))
    raise AssertionError('legacy budget linked to an income category was migrated')
except sqlite3.IntegrityError:
    pass
connection.close()
DATABASE_PATH.unlink()

print('one-category monthly budgets schema migration: PASS')
