"""Migration 0015: the overall monthly spending ceiling.

Proves the table's constraints and, more importantly, the carry-forward read the
service depends on: a month with no row of its own inherits the nearest earlier
row, and an inactive row stops that inheritance instead of falling through to an
older ceiling.
"""
import sqlite3
from pathlib import Path


ROOT = Path(__file__).parents[1]
MIGRATIONS = ROOT / 'src' / 'database' / 'migrations'
DATABASE_PATH = ROOT / 'tests' / 'monthly_budget_ceiling_test.sqlite'
UTC = '2026-07-13T12:00:00.000Z'

# Pinned to "every migration up to and including 0015" rather than a glob of all
# of them, so a later migration cannot silently retarget these assertions.
PRE = sorted(path.name for path in MIGRATIONS.glob('*.sql') if path.name < '0015_')
V0015 = '0015_monthly_budget_ceiling.sql'


def migration_sql(name: str) -> str:
    return (MIGRATIONS / name).read_text(encoding='utf-8').replace('--> statement-breakpoint', '')


def apply(connection: sqlite3.Connection, names) -> None:
    for name in names:
        connection.executescript(migration_sql(name))


def effective(connection: sqlite3.Connection, month: str):
    """The row governing `month`: its own, or the most recent earlier one."""
    return connection.execute(
        'SELECT month, limit_amount, is_active FROM monthly_budgets '
        'WHERE month <= ? ORDER BY month DESC LIMIT 1',
        (month,),
    ).fetchone()


if DATABASE_PATH.exists():
    DATABASE_PATH.unlink()

connection = sqlite3.connect(DATABASE_PATH)
connection.execute('PRAGMA foreign_keys = ON')

# The table must not exist before 0015 and must exist after it.
apply(connection, PRE)
assert connection.execute(
    "SELECT count(*) FROM sqlite_master WHERE type = 'table' AND name = 'monthly_budgets'"
).fetchone()[0] == 0
apply(connection, [V0015])
assert connection.execute(
    "SELECT count(*) FROM sqlite_master WHERE type = 'table' AND name = 'monthly_budgets'"
).fetchone()[0] == 1

connection.execute(
    'INSERT INTO monthly_budgets VALUES (?, ?, ?, ?, ?, ?)',
    ('ceiling-may', '2026-05', 5_000_000, 1, UTC, UTC),
)

# A month with its own row uses it; later months carry it forward.
assert effective(connection, '2026-05') == ('2026-05', 5_000_000, 1)
assert effective(connection, '2026-09') == ('2026-05', 5_000_000, 1)
# Months before the first ceiling have none.
assert effective(connection, '2026-04') is None

# A later explicit ceiling wins for its own month and the ones after it, while
# the months between it and the earlier row keep inheriting the earlier one.
connection.execute(
    'INSERT INTO monthly_budgets VALUES (?, ?, ?, ?, ?, ?)',
    ('ceiling-aug', '2026-08', 7_000_000, 1, UTC, UTC),
)
assert effective(connection, '2026-07') == ('2026-05', 5_000_000, 1)
assert effective(connection, '2026-08') == ('2026-08', 7_000_000, 1)
assert effective(connection, '2027-01') == ('2026-08', 7_000_000, 1)

# The tombstone: removing the ceiling from a month must not fall through to the
# older row. This is the whole reason is_active exists rather than a DELETE.
connection.execute(
    'INSERT INTO monthly_budgets VALUES (?, ?, ?, ?, ?, ?)',
    ('ceiling-oct-off', '2026-10', 7_000_000, 0, UTC, UTC),
)
assert effective(connection, '2026-10') == ('2026-10', 7_000_000, 0)
assert effective(connection, '2026-12') == ('2026-10', 7_000_000, 0)
# August is untouched: turning the ceiling off later never rewrites the past.
assert effective(connection, '2026-08') == ('2026-08', 7_000_000, 1)

# One row per month.
try:
    connection.execute(
        'INSERT INTO monthly_budgets VALUES (?, ?, ?, ?, ?, ?)',
        ('ceiling-duplicate', '2026-05', 1_000_000, 1, UTC, UTC),
    )
    raise AssertionError('two ceilings were accepted for the same month')
except sqlite3.IntegrityError:
    pass

# A zero or negative ceiling is meaningless, and so is a float.
for bad_limit in (0, -1, 1500.5):
    try:
        connection.execute(
            'INSERT INTO monthly_budgets VALUES (?, ?, ?, ?, ?, ?)',
            (f'ceiling-bad-{bad_limit}', '2027-03', bad_limit, 1, UTC, UTC),
        )
        raise AssertionError(f'ceiling accepted a limit of {bad_limit}')
    except sqlite3.IntegrityError:
        pass

# Month shape is enforced, including a month number outside 01-12.
for bad_month in ('2026-13', '2026-00', '202607', 'July'):
    try:
        connection.execute(
            'INSERT INTO monthly_budgets VALUES (?, ?, ?, ?, ?, ?)',
            (f'ceiling-bad-month-{bad_month}', bad_month, 1_000_000, 1, UTC, UTC),
        )
        raise AssertionError(f'ceiling accepted the month {bad_month}')
    except sqlite3.IntegrityError:
        pass

# is_active is a strict boolean, and timestamps must be UTC.
try:
    connection.execute(
        'INSERT INTO monthly_budgets VALUES (?, ?, ?, ?, ?, ?)',
        ('ceiling-bad-flag', '2027-04', 1_000_000, 2, UTC, UTC),
    )
    raise AssertionError('ceiling accepted a non-boolean is_active')
except sqlite3.IntegrityError:
    pass
try:
    connection.execute(
        'INSERT INTO monthly_budgets VALUES (?, ?, ?, ?, ?, ?)',
        ('ceiling-bad-timestamp', '2027-05', 1_000_000, 1, '2026-07-13 12:00:00', UTC),
    )
    raise AssertionError('ceiling accepted a non-UTC created_at')
except sqlite3.IntegrityError:
    pass

# The ceiling is independent of category budgets: it has no foreign key, so a
# category can still be deleted, and no budgets row is affected.
assert connection.execute('PRAGMA foreign_key_check').fetchall() == []
assert connection.execute('PRAGMA integrity_check').fetchone()[0] == 'ok'

connection.commit()
connection.close()
DATABASE_PATH.unlink()

print('monthly budget ceiling migration: PASS')
