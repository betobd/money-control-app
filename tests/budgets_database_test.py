import sqlite3
from pathlib import Path


ROOT = Path(__file__).parents[1]
MIGRATIONS = ROOT / 'src' / 'database' / 'migrations'
DATABASE_PATH = ROOT / 'tests' / 'budgets_database_test.sqlite'
UTC = '2026-07-13T12:00:00.000Z'


def apply_migrations(connection: sqlite3.Connection) -> None:
    for migration in sorted(MIGRATIONS.glob('000*.sql')):
        sql = migration.read_text(encoding='utf-8').replace('--> statement-breakpoint', '')
        connection.executescript(sql)


def budget_rows(connection: sqlite3.Connection, month: str):
    start = f'{month}-01'
    year, month_number = (int(value) for value in month.split('-'))
    next_month = f'{year + 1}-01' if month_number == 12 else f'{year}-{month_number + 1:02d}'
    return connection.execute(
        '''
        SELECT budget.id, budget.category_id, category.name, category.icon,
               category.is_archived, budget.limit_amount,
               coalesce(sum(transaction_row.amount), 0) AS spent
        FROM budgets AS budget
        JOIN categories AS category ON category.id = budget.category_id
        LEFT JOIN transactions AS transaction_row
          ON transaction_row.category_id = budget.category_id
         AND transaction_row.type = 'expense'
         AND transaction_row.status = 'posted'
         AND transaction_row.transaction_date >= ?
         AND transaction_row.transaction_date < ?
        WHERE budget.month = ?
        GROUP BY budget.id, category.id
        ORDER BY category.name
        ''',
        (start, f'{next_month}-01', month),
    ).fetchall()


if DATABASE_PATH.exists():
    DATABASE_PATH.unlink()

connection = sqlite3.connect(DATABASE_PATH)
connection.execute('PRAGMA foreign_keys = ON')
apply_migrations(connection)
connection.executemany(
    'INSERT INTO categories VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [
        ('food', 'Food & Dining', 'expense', 'food', 0, None, UTC, UTC),
        ('travel', 'Travel', 'expense', 'travel', 0, None, UTC, UTC),
        ('other', 'Other', 'expense', 'other', 0, None, UTC, UTC),
        ('archived', 'Old household', 'expense', 'home', 1, UTC, UTC, UTC),
        ('salary', 'Salary', 'income', 'salary', 0, None, UTC, UTC),
    ],
)
connection.executemany(
    'INSERT INTO accounts (id,name,type,currency,opening_balance,credit_limit,is_archived,archived_at,created_at,updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [
        ('checking', 'Checking', 'checking', 'COP', 1_000_000, None, 0, None, UTC, UTC),
        ('savings', 'Savings', 'savings', 'COP', 500_000, None, 0, None, UTC, UTC),
    ],
)
connection.executemany(
    'INSERT INTO budgets VALUES (?, ?, ?, ?, ?, ?)',
    [
        ('food-july', 'food', '2026-07', 600_000, UTC, UTC),
        ('travel-july', 'travel', '2026-07', 300_000, UTC, UTC),
        ('food-august', 'food', '2026-08', 700_000, UTC, UTC),
        ('archived-june', 'archived', '2026-06', 100_000, UTC, UTC),
    ],
)
connection.executemany(
    'INSERT INTO transactions VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [
        ('expense', 'expense', 'posted', 150_000, 'COP', 'checking', None, 'food', None, '2026-07-05', UTC, UTC),
        ('income', 'income', 'posted', 900_000, 'COP', 'checking', None, 'salary', None, '2026-07-05', UTC, UTC),
        ('transfer', 'transfer', 'posted', 50_000, 'COP', 'checking', 'savings', None, None, '2026-07-06', UTC, UTC),
        ('voided', 'expense', 'voided', 80_000, 'COP', 'checking', None, 'food', None, '2026-07-07', UTC, UTC),
        ('unbudgeted', 'expense', 'posted', 70_000, 'COP', 'checking', None, 'other', None, '2026-07-08', UTC, UTC),
    ],
)
connection.commit()
connection.close()

# Reopen to prove persisted budgets survive a database/app restart.
connection = sqlite3.connect(DATABASE_PATH)
connection.execute('PRAGMA foreign_keys = ON')
july = {row[1]: row for row in budget_rows(connection, '2026-07')}
assert july['food'][6] == 150_000
assert july['travel'][6] == 0
assert sum(row[5] for row in july.values()) == 900_000
assert sum(row[6] for row in july.values()) == 150_000

# Editing amount updates spending.
connection.execute("UPDATE transactions SET amount = 200000 WHERE id = 'expense'")
july = {row[1]: row for row in budget_rows(connection, '2026-07')}
assert july['food'][6] == 200_000

# Editing category moves spending between category budgets.
connection.execute("UPDATE transactions SET category_id = 'travel' WHERE id = 'expense'")
july = {row[1]: row for row in budget_rows(connection, '2026-07')}
assert july['food'][6] == 0
assert july['travel'][6] == 200_000

# Editing category and financial date moves spending into another month.
connection.execute("UPDATE transactions SET category_id = 'food', transaction_date = '2026-08-02' WHERE id = 'expense'")
july = {row[1]: row for row in budget_rows(connection, '2026-07')}
august = {row[1]: row for row in budget_rows(connection, '2026-08')}
assert july['food'][6] == 0
assert july['travel'][6] == 0
assert august['food'][6] == 200_000

# Voiding removes the financial contribution.
connection.execute("UPDATE transactions SET status = 'voided' WHERE id = 'expense'")
august = {row[1]: row for row in budget_rows(connection, '2026-08')}
assert august['food'][6] == 0

# Archived historical category labels and icons remain queryable.
june = budget_rows(connection, '2026-06')
assert june == [('archived-june', 'archived', 'Old household', 'home', 1, 100_000, 0)]

try:
    connection.execute(
        'INSERT INTO budgets VALUES (?, ?, ?, ?, ?, ?)',
        ('duplicate-food-july', 'food', '2026-07', 800_000, UTC, UTC),
    )
    raise AssertionError('duplicate category/month budget was accepted')
except sqlite3.IntegrityError:
    pass

assert connection.execute('PRAGMA foreign_key_check').fetchall() == []
assert connection.execute('PRAGMA integrity_check').fetchone()[0] == 'ok'
connection.close()
DATABASE_PATH.unlink()

print('budgets database integration: PASS')
