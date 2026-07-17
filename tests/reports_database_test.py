import sqlite3
from pathlib import Path

root = Path(__file__).parents[1]
db_file = root / 'tests' / 'reports_persistence_test.sqlite'
if db_file.exists():
    db_file.unlink()


def open_database():
    database = sqlite3.connect(db_file)
    database.row_factory = sqlite3.Row
    database.execute('PRAGMA foreign_keys = ON')
    return database


def apply_migrations(database):
    for migration in sorted((root / 'src/database/migrations').glob('*.sql')):
        database.executescript(
            migration.read_text(encoding='utf-8').replace('--> statement-breakpoint', '')
        )


SUMMARY_SQL = '''
SELECT
  COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) AS income,
  COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) AS expenses,
  SUM(CASE WHEN type = 'income' THEN 1 ELSE 0 END) AS income_count,
  SUM(CASE WHEN type = 'expense' THEN 1 ELSE 0 END) AS expense_count
FROM transactions
WHERE status = 'posted' AND transaction_date >= ? AND transaction_date <= ?
'''

CASH_FLOW_SQL = '''
SELECT transaction_date AS bucket,
  COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) AS income,
  COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) AS expenses
FROM transactions
WHERE status = 'posted' AND type IN ('income', 'expense')
  AND transaction_date >= ? AND transaction_date <= ?
GROUP BY transaction_date
ORDER BY transaction_date
'''

CATEGORY_SQL = '''
SELECT t.category_id, COALESCE(c.name, 'Unknown category') AS category_name,
  COALESCE(c.icon, 'other') AS icon, SUM(t.amount) AS total, COUNT(*) AS transaction_count
FROM transactions t
LEFT JOIN categories c ON c.id = t.category_id
WHERE t.status = 'posted' AND t.type = 'expense'
  AND t.transaction_date >= ? AND t.transaction_date <= ?
GROUP BY t.category_id, c.id, c.name, c.icon
ORDER BY total DESC, t.category_id
'''

NET_WORTH_START_SQL = '''
SELECT
  (SELECT COALESCE(SUM(opening_balance), 0) FROM accounts)
  + COALESCE(SUM(CASE WHEN type = 'income' THEN amount WHEN type = 'expense' THEN -amount ELSE 0 END), 0)
FROM transactions
WHERE status = 'posted' AND type IN ('income', 'expense') AND transaction_date < ?
'''

NET_WORTH_CHANGES_SQL = '''
SELECT transaction_date,
  SUM(CASE WHEN type = 'income' THEN amount WHEN type = 'expense' THEN -amount ELSE 0 END) AS amount
FROM transactions
WHERE status = 'posted' AND type IN ('income', 'expense')
  AND transaction_date >= ? AND transaction_date <= ?
GROUP BY transaction_date ORDER BY transaction_date
'''


def summary(database):
    return tuple(database.execute(SUMMARY_SQL, ('2026-07-01', '2026-07-31')).fetchone())


connection = open_database()
apply_migrations(connection)
utc = '2026-07-16T15:00:00.000Z'
accounts = [
    ('checking', 'Checking', 'checking', 'COP', 1_000_000, None, 0, None, utc, utc),
    ('card', 'Credit card', 'credit_card', 'COP', -200_000, 1_000_000, 0, None, utc, utc),
    ('archived', 'Archived cash', 'cash', 'COP', 100_000, None, 1, utc, utc, utc),
]
categories = [
    ('food', 'Food', 'expense', 'food', 0, None, utc, utc),
    ('old-utilities', 'Old utilities', 'expense', 'bills', 1, utc, utc, utc),
    ('salary', 'Salary', 'income', 'salary', 0, None, utc, utc),
]
connection.executemany('INSERT INTO accounts VALUES (?,?,?,?,?,?,?,?,?,?)', accounts)
connection.executemany('INSERT INTO categories VALUES (?,?,?,?,?,?,?,?)', categories)
transactions = [
    ('prior-expense', 'expense', 'posted', 100_000, 'COP', 'checking', None, 'food', None, '2026-06-30', utc, utc),
    ('income', 'income', 'posted', 500_000, 'COP', 'checking', None, 'salary', None, '2026-07-01', utc, utc),
    ('food-expense', 'expense', 'posted', 100_000, 'COP', 'checking', None, 'food', None, '2026-07-02', utc, utc),
    ('transfer', 'transfer', 'posted', 50_000, 'COP', 'checking', 'card', None, None, '2026-07-03', utc, utc),
    ('voided-expense', 'expense', 'voided', 900_000, 'COP', 'checking', None, 'food', None, '2026-07-04', utc, utc),
    ('archived-expense', 'expense', 'posted', 200_000, 'COP', 'archived', None, 'old-utilities', None, '2026-07-05', utc, utc),
    ('recurring-income', 'income', 'posted', 50_000, 'COP', 'checking', None, 'salary', None, '2026-07-06', utc, utc),
]
connection.executemany('INSERT INTO transactions VALUES (?,?,?,?,?,?,?,?,?,?,?,?)', transactions)

# Pending/skipped occurrences contain money snapshots but have no financial effect.
rule = (
    'rule', 'expense', 700_000, 'COP', 'checking', None, 'food', None,
    'monthly', 1, '2026-07-07', '2026-08-07', None, 1, None, utc, utc,
)
connection.execute('INSERT INTO recurring_transactions VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)', rule)
occurrences = [
    ('pending', 'rule', '2026-07-07', 'pending', 'expense', 700_000, 'COP', 'checking', None, 'food', None, None, utc, utc),
    ('skipped', 'rule', '2026-07-08', 'skipped', 'expense', 800_000, 'COP', 'checking', None, 'food', None, None, utc, utc),
    ('posted', 'rule', '2026-07-06', 'posted', 'income', 50_000, 'COP', 'checking', None, 'salary', None, 'recurring-income', utc, utc),
]
connection.executemany('INSERT INTO recurring_occurrences VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)', occurrences)
connection.commit()

assert summary(connection) == (550_000, 300_000, 2, 2)

largest = connection.execute('''
SELECT t.amount, c.name, a.name, t.transaction_date
FROM transactions t JOIN accounts a ON a.id = t.account_id
LEFT JOIN categories c ON c.id = t.category_id
WHERE t.status = 'posted' AND t.type = 'expense'
  AND t.transaction_date BETWEEN ? AND ?
ORDER BY t.amount DESC, t.transaction_date DESC, t.id DESC LIMIT 1
''', ('2026-07-01', '2026-07-31')).fetchone()
assert tuple(largest) == (200_000, 'Old utilities', 'Archived cash', '2026-07-05')

cash_flow = [tuple(row) for row in connection.execute(CASH_FLOW_SQL, ('2026-07-01', '2026-07-31'))]
assert cash_flow == [
    ('2026-07-01', 500_000, 0),
    ('2026-07-02', 0, 100_000),
    ('2026-07-05', 0, 200_000),
    ('2026-07-06', 50_000, 0),
]

category_rows = [tuple(row) for row in connection.execute(CATEGORY_SQL, ('2026-07-01', '2026-07-31'))]
assert category_rows == [
    ('old-utilities', 'Old utilities', 'bills', 200_000, 1),
    ('food', 'Food', 'food', 100_000, 1),
]

starting_net_worth = connection.execute(NET_WORTH_START_SQL, ('2026-07-01',)).fetchone()[0]
assert starting_net_worth == 800_000  # opening balances include debt and archived cash, then prior expense
changes = [tuple(row) for row in connection.execute(NET_WORTH_CHANGES_SQL, ('2026-07-01', '2026-07-31'))]
assert changes == [
    ('2026-07-01', 500_000),
    ('2026-07-02', -100_000),
    ('2026-07-05', -200_000),
    ('2026-07-06', 50_000),
]
assert starting_net_worth + sum(row[1] for row in changes) == 1_050_000

# Edits and voiding immediately change aggregates while transfer edits do not.
connection.execute("UPDATE transactions SET amount = 150000 WHERE id = 'food-expense'")
assert summary(connection) == (550_000, 350_000, 2, 2)
connection.execute("UPDATE transactions SET amount = 900000 WHERE id = 'transfer'")
assert summary(connection) == (550_000, 350_000, 2, 2)
connection.execute("UPDATE transactions SET status = 'voided' WHERE id = 'archived-expense'")
assert summary(connection) == (550_000, 150_000, 2, 1)
connection.commit()
connection.close()

# Persisted report facts survive restart.
connection = open_database()
assert summary(connection) == (550_000, 150_000, 2, 1)
assert connection.execute("SELECT status FROM transactions WHERE id = 'archived-expense'").fetchone()[0] == 'voided'
assert connection.execute('PRAGMA integrity_check').fetchone()[0] == 'ok'
connection.close()
db_file.unlink()
print('reports database integration: PASS')
