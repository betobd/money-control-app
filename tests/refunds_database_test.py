import sqlite3
from pathlib import Path

root = Path(__file__).parents[1]


def apply_migrations(database):
    for migration in sorted((root / 'src/database/migrations').glob('*.sql')):
        database.executescript(migration.read_text(encoding='utf-8').replace('--> statement-breakpoint', ''))


database = sqlite3.connect(':memory:')
database.execute('PRAGMA foreign_keys = ON')
apply_migrations(database)
now = '2026-07-24T12:00:00.000Z'
database.execute(
    "INSERT INTO accounts (id,name,type,currency,opening_balance,is_archived,created_at,updated_at) VALUES ('checking','Checking','checking','COP',500000,0,?,?)",
    (now, now),
)
database.execute(
    "INSERT INTO accounts (id,name,type,currency,opening_balance,credit_limit,is_archived,created_at,updated_at) VALUES ('card','Card','credit_card','COP',-300000,1000000,0,?,?)",
    (now, now),
)
database.execute(
    "INSERT INTO categories (id,name,type,icon,is_archived,created_at,updated_at) VALUES ('food','Food','expense','food',0,?,?)",
    (now, now),
)
database.executemany(
    '''INSERT INTO transactions (
      id,type,status,amount,currency,account_id,destination_account_id,category_id,
      original_transaction_id,note,transaction_date,created_at,updated_at
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)''',
    [
        ('expense', 'expense', 'posted', 100000, 'COP', 'checking', None, 'food', None, 'Groceries', '2026-07-20', now, now),
        ('card-expense', 'expense', 'posted', 200000, 'COP', 'card', None, 'food', None, 'Card purchase', '2026-07-20', now, now),
        ('refund-1', 'refund', 'posted', 30000, 'COP', 'checking', None, None, 'expense', None, '2026-07-23', now, now),
        ('refund-2', 'refund', 'posted', 20000, 'COP', 'checking', None, None, 'expense', None, '2026-07-24', now, now),
        ('card-refund', 'refund', 'posted', 50000, 'COP', 'card', None, None, 'card-expense', None, '2026-07-24', now, now),
    ],
)

balance = dict(database.execute('''
  SELECT a.id, a.opening_balance + coalesce(sum(case
    when t.status <> 'posted' then 0
    when t.type = 'income' and t.account_id = a.id then t.amount
    when t.type = 'expense' and t.account_id = a.id then -t.amount
    when t.type = 'refund' and t.account_id = a.id then t.amount
    when t.type = 'transfer' and t.account_id = a.id then -t.amount
    when t.type = 'transfer' and t.destination_account_id = a.id then t.amount
    else 0 end), 0)
  FROM accounts a
  LEFT JOIN transactions t ON t.account_id = a.id OR t.destination_account_id = a.id
  GROUP BY a.id
'''))
assert balance == {'card': -450000, 'checking': 450000}, balance

gross, refunds = database.execute('''
  SELECT
    sum(case when type = 'expense' then amount else 0 end),
    sum(case when type = 'refund' then amount else 0 end)
  FROM transactions WHERE status = 'posted'
''').fetchone()
assert (gross, refunds, gross - refunds) == (300000, 100000, 200000)

budget_july = database.execute('''
  SELECT coalesce(sum(case
    when row.type = 'expense' then row.amount
    when row.type = 'refund' then -row.amount else 0 end), 0)
  FROM transactions row
  LEFT JOIN transactions original ON row.original_transaction_id = original.id
  WHERE row.status = 'posted'
    AND coalesce(row.category_id, original.category_id) = 'food'
    AND row.transaction_date >= '2026-07-01'
    AND row.transaction_date < '2026-08-01'
''').fetchone()[0]
assert budget_july == 200000

for row, message in [
    (('too-much', 'refund', 'posted', 50001, 'COP', 'checking', None, None, 'expense', None, '2026-07-24', now, now), 'over-refund'),
    (('refund-of-refund', 'refund', 'posted', 1, 'COP', 'checking', None, None, 'refund-1', None, '2026-07-24', now, now), 'refund reference'),
    (('wrong-account', 'refund', 'posted', 1, 'COP', 'card', None, None, 'expense', None, '2026-07-24', now, now), 'wrong account'),
    (('before-expense', 'refund', 'posted', 1, 'COP', 'checking', None, None, 'expense', None, '2026-07-19', now, now), 'early refund'),
]:
    try:
        database.execute('INSERT INTO transactions VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)', row)
        raise AssertionError(f'database accepted {message}')
    except sqlite3.IntegrityError:
        pass

try:
    database.execute("UPDATE transactions SET amount = 90000 WHERE id = 'expense'")
    raise AssertionError('database edited expense with posted refunds')
except sqlite3.IntegrityError:
    pass

database.execute("UPDATE transactions SET status = 'voided', updated_at = ? WHERE id = 'refund-1'", (now,))
database.execute("UPDATE transactions SET status = 'voided', updated_at = ? WHERE id = 'refund-2'", (now,))
database.execute("UPDATE transactions SET amount = 90000, updated_at = ? WHERE id = 'expense'", (now,))
database.execute("UPDATE transactions SET status = 'voided', updated_at = ? WHERE id = 'expense'", (now,))

try:
    database.execute("UPDATE transactions SET status = 'posted' WHERE id = 'refund-1'")
    raise AssertionError('database reactivated a voided refund')
except sqlite3.IntegrityError:
    pass

payment_count = database.execute(
    "SELECT count(*) FROM transactions WHERE type = 'transfer' AND destination_account_id = 'card'"
).fetchone()[0]
assert payment_count == 0
assert database.execute('PRAGMA foreign_key_check').fetchall() == []
assert database.execute('PRAGMA integrity_check').fetchone()[0] == 'ok'
