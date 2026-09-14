"""Migration 0016: first-run onboarding completion.

Proves that installs which already hold data skip the welcome flow, that a fresh
install shows it, and that the column only accepts UTC timestamps or NULL.
"""
import sqlite3
from pathlib import Path


ROOT = Path(__file__).parents[1]
MIGRATIONS = ROOT / 'src' / 'database' / 'migrations'
UTC = '2026-09-14T12:00:00.000Z'

# Pinned to "every migration before 0016" rather than a glob of all of them, so a
# later migration cannot silently retarget these assertions.
PRE = sorted(path.name for path in MIGRATIONS.glob('*.sql') if path.name < '0016_')
V0016 = '0016_onboarding_completion.sql'


def migration_sql(name: str) -> str:
    return (MIGRATIONS / name).read_text(encoding='utf-8').replace('--> statement-breakpoint', '')


def apply(connection: sqlite3.Connection, names) -> None:
    for name in names:
        connection.executescript(migration_sql(name))


def fresh_database() -> sqlite3.Connection:
    connection = sqlite3.connect(':memory:')
    connection.execute('PRAGMA foreign_keys = ON')
    apply(connection, PRE)
    return connection


def completed_at(connection: sqlite3.Connection):
    return connection.execute("SELECT onboarding_completed_at FROM app_settings WHERE id = 'device'").fetchone()[0]


def rejects(connection: sqlite3.Connection, sql: str, params=()) -> bool:
    try:
        connection.execute(sql, params)
    except sqlite3.IntegrityError:
        return True
    return False


def add_account(connection: sqlite3.Connection) -> None:
    columns = [row[1] for row in connection.execute('PRAGMA table_info(accounts)')]
    values = {
        'id': 'account-1', 'name': 'Wallet', 'type': 'cash', 'currency': 'COP',
        'opening_balance': 0, 'is_active': 1, 'created_at': UTC, 'updated_at': UTC,
    }
    present = [column for column in values if column in columns]
    connection.execute(
        f"INSERT INTO accounts ({', '.join(present)}) VALUES ({', '.join('?' for _ in present)})",
        [values[column] for column in present],
    )


# A fresh install: default categories only, USD seeded. The flow must show.
fresh = fresh_database()
apply(fresh, [V0016])
assert completed_at(fresh) is None, 'a fresh install must show onboarding'

# An install with accounts (migration 0014 seeded it as COP) skips the flow.
existing = sqlite3.connect(':memory:')
existing.execute('PRAGMA foreign_keys = ON')
apply(existing, [name for name in PRE if name < '0014_'])
add_account(existing)
apply(existing, [name for name in PRE if name >= '0014_'])
assert existing.execute('SELECT base_currency_code FROM app_settings').fetchone()[0] == 'COP'
apply(existing, [V0016])
assert completed_at(existing) is not None, 'an install with data must skip onboarding'

# An empty install whose user already picked a non-default base skips it too.
chosen = fresh_database()
chosen.execute("UPDATE app_settings SET base_currency_code = 'EUR'")
apply(chosen, [V0016])
assert completed_at(chosen) is not None, 'a deliberately chosen base currency counts as set up'

# An empty install with only a monthly ceiling counts as set up.
ceiling = fresh_database()
ceiling.execute('INSERT INTO monthly_budgets VALUES (?, ?, ?, ?, ?, ?)', ('c1', '2026-09', 100, 1, UTC, UTC))
apply(ceiling, [V0016])
assert completed_at(ceiling) is not None, 'a monthly ceiling is data'

# The column takes a UTC timestamp or NULL, nothing else.
assert rejects(fresh, "UPDATE app_settings SET onboarding_completed_at = 'yesterday'"), 'non-timestamp must be rejected'
fresh.execute('UPDATE app_settings SET onboarding_completed_at = ?', (UTC,))
assert completed_at(fresh) == UTC
fresh.execute('UPDATE app_settings SET onboarding_completed_at = NULL')
assert completed_at(fresh) is None

# The completion write keeps the first stamp (coalesce), as the repository does.
fresh.execute('UPDATE app_settings SET onboarding_completed_at = coalesce(onboarding_completed_at, ?)', (UTC,))
fresh.execute('UPDATE app_settings SET onboarding_completed_at = coalesce(onboarding_completed_at, ?)', ('2027-01-01T00:00:00.000Z',))
assert completed_at(fresh) == UTC

print('onboarding migration: ALL OK')
