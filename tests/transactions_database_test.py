import sqlite3
from pathlib import Path

root = Path(__file__).parents[1]
db_file = root / 'tests' / 'transaction_persistence_test.sqlite'
if db_file.exists():
    db_file.unlink()


def open_database():
    database = sqlite3.connect(db_file)
    database.execute('PRAGMA foreign_keys = ON')
    return database


connection = open_database()
for migration in sorted((root / 'src/database/migrations').glob('*.sql')):
    connection.executescript(
        migration.read_text(encoding='utf-8').replace('--> statement-breakpoint', '')
    )

utc = '2026-07-12T15:30:00.000Z'
accounts = [
    ('checking', 'Checking', 'checking', 'COP', 3_000_000, None, 0, None, utc, utc),
    ('card', 'Credit card', 'credit_card', 'COP', -1_050_000, None, 0, None, utc, utc),
    ('savings', 'Savings', 'savings', 'COP', 1_000_000, None, 0, None, utc, utc),
    ('archived', 'Archived cash', 'cash', 'COP', 200_000, None, 1, utc, utc, utc),
]
categories = [
    ('expense', 'Food', 'expense', 'food', 0, None, utc, utc),
    ('income', 'Salary', 'income', 'salary', 0, None, utc, utc),
]
connection.executemany('INSERT INTO accounts VALUES (?,?,?,?,?,?,?,?,?,?)', accounts)
connection.executemany('INSERT INTO categories VALUES (?,?,?,?,?,?,?,?)', categories)
connection.executemany(
    'INSERT INTO transactions VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
    [
        ('expense', 'expense', 'posted', 150_000, 'COP', 'savings', None, 'expense', None, '2026-07-12', utc, utc),
        ('income', 'income', 'posted', 300_000, 'COP', 'savings', None, 'income', None, '2026-07-12', utc, utc),
    ],
)

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
), 0)
FROM accounts a
LEFT JOIN transactions t ON t.account_id = a.id OR t.destination_account_id = a.id
GROUP BY a.id
'''
summary_sql = '''
SELECT
  COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0),
  COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0)
FROM transactions
WHERE status = 'posted' AND transaction_date >= '2026-07-01' AND transaction_date < '2026-08-01'
'''

before = dict(connection.execute(balance_sql))
assert before['checking'] == 3_000_000
assert before['card'] == -1_050_000
assert before['checking'] + before['card'] == 1_950_000
summary_before = connection.execute(summary_sql).fetchone()

payment = (
    'card-payment', 'transfer', 'posted', 500_000, 'COP', 'checking', 'card', None,
    ' Credit card payment ', '2026-07-12', utc, utc,
)
connection.execute('INSERT INTO transactions VALUES (?,?,?,?,?,?,?,?,?,?,?,?)', payment)
connection.commit()
connection.close()

# Persistence and all transfer fields survive a database/app restart.
connection = open_database()
persisted = connection.execute(
    '''SELECT type, status, amount, account_id, destination_account_id, category_id,
              transaction_date, note
       FROM transactions WHERE id = 'card-payment' ''',
).fetchone()
assert persisted == (
    'transfer', 'posted', 500_000, 'checking', 'card', None,
    '2026-07-12', ' Credit card payment ',
), persisted

after_payment = dict(connection.execute(balance_sql))
assert after_payment['checking'] == 2_500_000, after_payment
assert after_payment['card'] == -550_000, after_payment
assert after_payment['checking'] + after_payment['card'] == 1_950_000
assert connection.execute(summary_sql).fetchone() == summary_before == (300_000, 150_000)

connection.executemany(
    'INSERT INTO transactions VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
    [
        ('checking-to-savings', 'transfer', 'posted', 250_000, 'COP', 'checking', 'savings', None, None, '2026-07-12', utc, utc),
        ('card-to-savings', 'transfer', 'posted', 100_000, 'COP', 'card', 'savings', None, None, '2026-07-12', utc, utc),
        ('voided-transfer', 'transfer', 'voided', 900_000, 'COP', 'checking', 'savings', None, None, '2026-07-12', utc, utc),
    ],
)
after_all = dict(connection.execute(balance_sql))
assert after_all['checking'] == 2_250_000
assert after_all['card'] == -650_000
assert after_all['savings'] == 1_500_000
assert sum(after_all.values()) == sum(before.values())
assert connection.execute(summary_sql).fetchone() == summary_before

history = connection.execute(
    '''SELECT t.id, source.name, destination.name, category.name
       FROM transactions t
       JOIN accounts source ON source.id = t.account_id
       LEFT JOIN accounts destination ON destination.id = t.destination_account_id
       LEFT JOIN categories category ON category.id = t.category_id
       ORDER BY t.transaction_date DESC, t.created_at DESC'''
).fetchall()
payment_history = next(row for row in history if row[0] == 'card-payment')
assert payment_history == ('card-payment', 'Checking', 'Credit card', None)

# Editing mutates the existing row, preserves identity/creation metadata, and changes derived effects.
later = '2026-07-12T18:00:00.000Z'
connection.execute(
    'INSERT INTO categories VALUES (?,?,?,?,?,?,?,?)',
    ('expense-2', 'Utilities', 'expense', 'bills', 0, None, utc, utc),
)
connection.execute(
    '''UPDATE transactions
       SET amount = ?, account_id = ?, category_id = ?, note = ?, updated_at = ?
       WHERE id = ? AND status = 'posted' ''',
    (200_000, 'checking', 'expense-2', ' edited expense ', later, 'expense'),
)
edited_expense = connection.execute(
    '''SELECT id, amount, account_id, category_id, note, created_at, updated_at
       FROM transactions WHERE id = 'expense' ''',
).fetchone()
assert edited_expense == (
    'expense', 200_000, 'checking', 'expense-2', ' edited expense ', utc, later,
)

connection.execute(
    "UPDATE transactions SET amount = 300000, updated_at = ? WHERE id = 'checking-to-savings' AND status = 'posted'",
    (later,),
)
after_edits = dict(connection.execute(balance_sql))
assert after_edits['checking'] == 2_000_000, after_edits
assert after_edits['card'] == -650_000, after_edits
assert after_edits['savings'] == 1_700_000, after_edits
assert sum(after_edits.values()) == sum(before.values()) - 50_000
assert connection.execute(summary_sql).fetchone() == (300_000, 200_000)

# Voiding changes status in place and removes expense, income, and transfer effects.
voided_at = '2026-07-12T19:00:00.000Z'
for transaction_id in ('expense', 'income', 'card-payment'):
    connection.execute(
        "UPDATE transactions SET status = 'voided', updated_at = ? WHERE id = ? AND status = 'posted'",
        (voided_at, transaction_id),
    )
after_voids = dict(connection.execute(balance_sql))
assert after_voids['checking'] == 2_700_000, after_voids
assert after_voids['card'] == -1_150_000, after_voids
assert after_voids['savings'] == 1_400_000, after_voids
assert connection.execute(summary_sql).fetchone() == (0, 0)
assert sum(after_voids.values()) == 3_150_000
assert connection.execute("SELECT count(*) FROM transactions WHERE id IN ('expense','income','card-payment')").fetchone()[0] == 3
assert connection.execute("SELECT count(*) FROM transactions WHERE status = 'voided'").fetchone()[0] == 4

try:
    connection.execute(
        'INSERT INTO transactions VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
        ('same-account', 'transfer', 'posted', 1, 'COP', 'checking', 'checking', None, None, '2026-07-12', utc, utc),
    )
    raise AssertionError('database accepted a same-account transfer')
except sqlite3.IntegrityError:
    pass

assert connection.execute('PRAGMA integrity_check').fetchone()[0] == 'ok'
connection.commit()
connection.close()

# Edited and voided lifecycle state survives restart.
connection = open_database()
assert connection.execute(
    "SELECT status, amount, account_id, category_id, created_at, updated_at FROM transactions WHERE id = 'expense'"
).fetchone() == ('voided', 200_000, 'checking', 'expense-2', utc, voided_at)
assert dict(connection.execute(balance_sql)) == after_voids
assert connection.execute(summary_sql).fetchone() == (0, 0)
assert connection.execute('PRAGMA integrity_check').fetchone()[0] == 'ok'
connection.close()
db_file.unlink()
print('transactions database integration: PASS')
