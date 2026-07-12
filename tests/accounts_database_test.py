import sqlite3
from pathlib import Path

migration_dir = Path(__file__).parents[1] / 'src' / 'database' / 'migrations'
connection = sqlite3.connect(':memory:')
connection.execute('PRAGMA foreign_keys = ON')
migrations = sorted(migration_dir.glob('*.sql'))
for migration in migrations[:2]:
    connection.executescript(migration.read_text(encoding='utf-8').replace('--> statement-breakpoint', ''))

utc = '2026-07-12T12:00:00.000Z'
connection.execute(
    'INSERT INTO accounts VALUES (?,?,?,?,?,?,?,?,?,?)',
    ('legacy-card', 'Legacy Card', 'credit_card', 'COP', 1000000, None, 0, None, utc, utc),
)
for migration in migrations[2:]:
    connection.executescript(migration.read_text(encoding='utf-8').replace('--> statement-breakpoint', ''))
assert connection.execute("SELECT opening_balance FROM accounts WHERE id = 'legacy-card'").fetchone()[0] == -1000000
connection.execute("DELETE FROM accounts WHERE id = 'legacy-card'")

accounts = [
    ('active', 'Checking', 'checking', 'COP', 100000, None, 0, None, utc, utc),
    ('archived', 'Old Cash', 'cash', 'COP', 50000, None, 1, utc, utc, utc),
]
connection.executemany('INSERT INTO accounts VALUES (?,?,?,?,?,?,?,?,?,?)', accounts)
connection.execute("INSERT INTO categories VALUES (?,?,?,?,?,?,?,?)", ('income', 'Salary', 'income', None, 0, None, utc, utc))
connection.execute("INSERT INTO categories VALUES (?,?,?,?,?,?,?,?)", ('expense', 'Food', 'expense', None, 0, None, utc, utc))

transactions = [
    ('income-posted', 'income', 'posted', 200000, 'COP', 'active', None, 'income', None, '2026-07-12', utc, utc),
    ('expense-posted', 'expense', 'posted', 30000, 'COP', 'active', None, 'expense', None, '2026-07-12', utc, utc),
    ('income-voided', 'income', 'voided', 900000, 'COP', 'active', None, 'income', None, '2026-07-12', utc, utc),
    ('transfer', 'transfer', 'posted', 20000, 'COP', 'active', 'archived', None, None, '2026-07-12', utc, utc),
]
connection.executemany('INSERT INTO transactions VALUES (?,?,?,?,?,?,?,?,?,?,?,?)', transactions)

balance_sql = '''
SELECT a.id, a.opening_balance + COALESCE(SUM(
  CASE
    WHEN t.status <> 'posted' THEN 0
    WHEN t.type = 'income' AND t.account_id = a.id THEN t.amount
    WHEN t.type = 'expense' AND t.account_id = a.id THEN -t.amount
    WHEN t.type = 'transfer' AND t.account_id = a.id THEN -t.amount
    WHEN t.type = 'transfer' AND t.destination_account_id = a.id THEN t.amount
    ELSE 0
  END
), 0) AS balance
FROM accounts a
LEFT JOIN transactions t ON t.account_id = a.id OR t.destination_account_id = a.id
GROUP BY a.id
'''
balances = dict(connection.execute(balance_sql))
assert balances == {'active': 250000, 'archived': 70000}, balances
assert sum(balances.values()) == 320000

net_worth_accounts = [
    ('net-checking', 'Net Checking', 'checking', 'COP', 600000, None, 0, None, utc, utc),
    ('net-card', 'Net Card', 'credit_card', 'COP', -1000000, None, 0, None, utc, utc),
    ('net-savings', 'Net Savings', 'savings', 'COP', 1500000, None, 1, utc, utc, utc),
]
connection.executemany('INSERT INTO accounts VALUES (?,?,?,?,?,?,?,?,?,?)', net_worth_accounts)
net_worth_balances = dict(connection.execute(balance_sql))
assert sum(net_worth_balances[account_id] for account_id in ('net-checking', 'net-card', 'net-savings')) == 1100000

history_count = connection.execute(
    "SELECT count(*) FROM transactions WHERE account_id = 'archived' OR destination_account_id = 'archived'"
).fetchone()[0]
balance_before_restore = dict(connection.execute(balance_sql))['archived']
connection.execute(
    "UPDATE accounts SET is_archived = 0, archived_at = NULL, updated_at = ? WHERE id = 'archived'",
    (utc,),
)
assert connection.execute("SELECT is_archived FROM accounts WHERE id = 'archived'").fetchone()[0] == 0
assert dict(connection.execute(balance_sql))['archived'] == balance_before_restore
assert connection.execute(
    "SELECT count(*) FROM transactions WHERE account_id = 'archived' OR destination_account_id = 'archived'"
).fetchone()[0] == history_count

connection.execute(
    'INSERT INTO accounts VALUES (?,?,?,?,?,?,?,?,?,?)',
    ('unused-zero', 'Unused Zero', 'cash', 'COP', 0, None, 0, None, utc, utc),
)
connection.execute("DELETE FROM accounts WHERE id = 'unused-zero'")
assert connection.execute("SELECT count(*) FROM accounts WHERE id = 'unused-zero'").fetchone()[0] == 0

try:
    connection.execute("DELETE FROM accounts WHERE id = 'active'")
    raise AssertionError('foreign keys allowed deletion of an account with transaction history')
except sqlite3.IntegrityError:
    pass
assert connection.execute("SELECT count(*) FROM transactions WHERE account_id = 'active'").fetchone()[0] == 4

try:
    connection.execute("INSERT INTO accounts VALUES (?,?,?,?,?,?,?,?,?,?)", ('duplicate', ' checking ', 'cash', 'COP', 0, None, 0, None, utc, utc))
    raise AssertionError('case-insensitive active duplicate was accepted')
except sqlite3.IntegrityError:
    pass

connection.execute("UPDATE accounts SET is_archived = 1, archived_at = ? WHERE id = 'active'", (utc,))
connection.execute("INSERT INTO accounts VALUES (?,?,?,?,?,?,?,?,?,?)", ('replacement', ' checking ', 'cash', 'COP', 0, None, 0, None, utc, utc))
assert connection.execute("SELECT count(*) FROM accounts WHERE lower(trim(name)) = 'checking'").fetchone()[0] == 2
assert connection.execute('PRAGMA integrity_check').fetchone()[0] == 'ok'
print('accounts database integration: PASS')
