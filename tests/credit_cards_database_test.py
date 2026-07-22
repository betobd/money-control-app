import sqlite3
from pathlib import Path

root = Path(__file__).parents[1]
migrations = root / 'src' / 'database' / 'migrations'
database = sqlite3.connect(':memory:')
database.execute('PRAGMA foreign_keys = ON')
for migration in sorted(migrations.glob('*.sql')):
    database.executescript(migration.read_text(encoding='utf-8').replace('--> statement-breakpoint', ''))

utc = '2026-07-21T12:00:00.000Z'
database.execute(
    '''INSERT INTO accounts (id,name,type,currency,opening_balance,credit_limit,is_archived,archived_at,created_at,updated_at,statement_closing_day,payment_due_day)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)''',
    ('card', 'Visa', 'credit_card', 'COP', -400000, 2000000, 0, None, utc, utc, 15, 5),
)
database.execute(
    '''INSERT INTO accounts (id,name,type,currency,opening_balance,credit_limit,is_archived,archived_at,created_at,updated_at,statement_closing_day,payment_due_day)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)''',
    ('checking', 'Checking', 'checking', 'COP', 1000000, None, 0, None, utc, utc, None, None),
)
database.execute(
    'INSERT INTO categories VALUES (?,?,?,?,?,?,?,?)',
    ('food', 'Food', 'expense', 'food', 0, None, utc, utc),
)
database.execute(
    '''INSERT INTO credit_card_statements VALUES (?,?,?,?,?,?,?,?,?,?)''',
    ('statement', 'card', '2026-06-16', '2026-07-15', '2026-07-15', '2026-08-05', 400000, 40000, utc, utc),
)
assert database.execute('SELECT count(*) FROM credit_card_statements').fetchone()[0] == 1
database.executemany(
    'INSERT INTO transactions VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
    [
        ('purchase', 'expense', 'posted', 100000, 'COP', 'card', None, 'food', None, '2026-07-20', utc, utc),
        ('payment', 'transfer', 'posted', 40000, 'COP', 'checking', 'card', None, None, '2026-07-21', utc, utc),
    ],
)
balance_rows = database.execute('''
    SELECT a.id, a.opening_balance + COALESCE(SUM(CASE
      WHEN t.status <> 'posted' THEN 0
      WHEN t.type = 'income' AND t.account_id = a.id THEN t.amount
      WHEN t.type = 'expense' AND t.account_id = a.id THEN -t.amount
      WHEN t.type = 'transfer' AND t.account_id = a.id THEN -t.amount
      WHEN t.type = 'transfer' AND t.destination_account_id = a.id THEN t.amount
      ELSE 0 END), 0)
    FROM accounts a LEFT JOIN transactions t
      ON t.account_id = a.id OR t.destination_account_id = a.id
    GROUP BY a.id
''').fetchall()
balances = dict(balance_rows)
assert balances == {'card': -460000, 'checking': 960000}
income, expenses = database.execute('''
    SELECT COALESCE(SUM(CASE WHEN type='income' THEN amount ELSE 0 END),0),
           COALESCE(SUM(CASE WHEN type='expense' THEN amount ELSE 0 END),0)
    FROM transactions WHERE status='posted'
''').fetchone()
assert (income, expenses) == (0, 100000)

try:
    database.execute(
        '''INSERT INTO credit_card_statements VALUES (?,?,?,?,?,?,?,?,?,?)''',
        ('duplicate', 'card', '2026-06-16', '2026-07-15', '2026-07-15', '2026-08-05', 400000, 40000, utc, utc),
    )
    raise AssertionError('duplicate card/closing date should fail')
except sqlite3.IntegrityError:
    pass

try:
    database.execute(
        '''INSERT INTO credit_card_statements VALUES (?,?,?,?,?,?,?,?,?,?)''',
        ('invalid-minimum', 'card', '2026-07-16', '2026-08-15', '2026-08-15', '2026-09-05', 100000, 100001, utc, utc),
    )
    raise AssertionError('minimum above balance should fail')
except sqlite3.IntegrityError:
    pass

columns = {row[1] for row in database.execute('PRAGMA table_info(accounts)')}
assert {'statement_closing_day', 'payment_due_day'} <= columns
assert database.execute('PRAGMA foreign_key_check').fetchall() == []
assert database.execute('PRAGMA integrity_check').fetchone()[0] == 'ok'
database.close()
print('credit card database tests passed')
