import sqlite3
from pathlib import Path

root = Path(__file__).parents[1]


def apply_migrations(database):
    for migration in sorted((root / 'src/database/migrations').glob('*.sql')):
        database.executescript(
            migration.read_text(encoding='utf-8').replace('--> statement-breakpoint', '')
        )


database = sqlite3.connect(':memory:')
database.row_factory = sqlite3.Row
database.execute('PRAGMA foreign_keys = ON')
apply_migrations(database)

utc = '2026-07-21T15:00:00.000Z'
database.executemany(
    '''INSERT INTO accounts
       (id,name,type,currency,opening_balance,credit_limit,statement_closing_day,payment_due_day,
        is_archived,archived_at,created_at,updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)''',
    [
        ('checking', '=Checking', 'checking', 'COP', 1_000_000, None, None, None, 0, None, utc, utc),
        ('savings', 'Savings', 'savings', 'COP', 500_000, None, None, None, 0, None, utc, utc),
        ('old-cash', 'Old cash', 'cash', 'COP', 10_000, None, None, None, 1, utc, utc, utc),
        ('card', '@Archived card', 'credit_card', 'COP', -300_000, 2_000_000, 15, 5, 1, utc, utc, utc),
    ],
)
database.executemany(
    '''INSERT INTO categories
       (id,name,type,icon,is_archived,archived_at,created_at,updated_at)
       VALUES (?,?,?,?,?,?,?,?)''',
    [
        ('food', 'Food', 'expense', 'food', 0, None, utc, utc),
        ('old-category', '-Old category', 'expense', 'other', 1, utc, utc, utc),
        ('salary', 'Salary', 'income', 'salary', 0, None, utc, utc),
    ],
)

transactions = [
    ('expense', 'expense', 'posted', 25_000, 'COP', 'checking', None, 'food', 'line 1\nline 2', '2026-07-10', utc, utc),
    ('income', 'income', 'posted', 500_000, 'COP', 'checking', None, 'salary', '=formula', '2026-07-10', utc, utc),
    ('archived', 'expense', 'voided', 5_000, 'COP', 'old-cash', None, 'old-category', None, '2026-07-11', utc, utc),
    ('transfer', 'transfer', 'posted', 100_000, 'COP', 'checking', 'savings', None, None, '2026-07-12', utc, utc),
    ('card-payment', 'transfer', 'posted', 100_000, 'COP', 'checking', 'card', None, None, '2026-07-20', utc, utc),
]
database.executemany(
    '''INSERT INTO transactions
       (id,type,status,amount,currency,account_id,destination_account_id,category_id,note,
        transaction_date,created_at,updated_at,base_currency_code)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?, CASE WHEN ?2 = 'transfer' THEN NULL ELSE 'COP' END)''',
    transactions,
)
database.execute(
    '''INSERT INTO recurring_transactions
       (id,type,amount,currency,account_id,destination_account_id,category_id,note,frequency,
        interval,start_date,next_occurrence_date,end_date,is_active,ended_at,created_at,updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)''',
    ('rule', 'expense', 25_000, 'COP', 'checking', None, 'food', '@rule', 'monthly', 1,
     '2026-07-10', '2026-08-10', None, 1, None, utc, utc),
)
database.execute(
    '''INSERT INTO recurring_occurrences
       (id,recurring_transaction_id,scheduled_date,status,type,amount,currency,account_id,
        destination_account_id,category_id,note,transaction_id,created_at,updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)''',
    ('occurrence', 'rule', '2026-07-10', 'posted', 'expense', 25_000, 'COP', 'checking',
     None, 'food', '@rule', 'expense', utc, utc),
)
database.execute(
    '''INSERT INTO credit_card_statements
       (id,account_id,period_start,period_end,closing_date,due_date,statement_balance,
        minimum_payment,created_at,updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?)''',
    ('statement', 'card', '2026-06-16', '2026-07-15', '2026-07-15', '2026-08-05',
     300_000, 30_000, utc, utc),
)

export_query = '''
SELECT
  t.id,
  t.transaction_date,
  t.type,
  t.status,
  t.amount,
  c.id AS category_id,
  c.name AS category_name,
  source.id AS source_account_id,
  source.name AS source_account_name,
  destination.id AS destination_account_id,
  destination.name AS destination_account_name,
  t.note,
  occurrence.id AS recurring_occurrence_id,
  t.created_at,
  t.updated_at
FROM transactions t
JOIN accounts source ON source.id = t.account_id
LEFT JOIN accounts destination ON destination.id = t.destination_account_id
LEFT JOIN categories c ON c.id = t.category_id
LEFT JOIN recurring_occurrences occurrence ON occurrence.transaction_id = t.id
WHERE t.transaction_date >= ? AND t.transaction_date <= ?
ORDER BY t.transaction_date ASC, t.created_at ASC, t.id ASC
'''
rows = database.execute(export_query, ('2026-07-10', '2026-07-20')).fetchall()
assert [row['id'] for row in rows] == [
    'expense', 'income', 'archived', 'transfer', 'card-payment'
]
assert rows[0]['recurring_occurrence_id'] == 'occurrence'
assert rows[2]['source_account_name'] == 'Old cash'
assert rows[2]['category_name'] == '-Old category'
transfer = next(row for row in rows if row['id'] == 'transfer')
assert transfer['category_id'] is None
assert transfer['category_name'] is None
assert transfer['source_account_name'] == '=Checking'
assert transfer['destination_account_name'] == 'Savings'

# Account matching includes either transfer side; category filters exclude transfers naturally.
account_filtered = database.execute(
    export_query.replace(
        'WHERE t.transaction_date >= ? AND t.transaction_date <= ?',
        'WHERE t.transaction_date >= ? AND t.transaction_date <= ? '
        'AND (t.account_id = ? OR t.destination_account_id = ?)',
    ),
    ('2026-07-10', '2026-07-20', 'savings', 'savings'),
).fetchall()
assert [row['id'] for row in account_filtered] == ['transfer']

combined = database.execute(
    export_query.replace(
        'WHERE t.transaction_date >= ? AND t.transaction_date <= ?',
        "WHERE t.transaction_date >= ? AND t.transaction_date <= ? "
        "AND t.type = 'expense' AND t.status = 'voided' AND t.category_id = ?",
    ),
    ('2026-07-10', '2026-07-20', 'old-category'),
).fetchall()
assert [row['id'] for row in combined] == ['archived']

# Statements and all candidate payments are read in two bounded queries, not one query per statement.
statement_rows = database.execute(
    '''SELECT s.*, a.name AS card_name
       FROM credit_card_statements s
       JOIN accounts a ON a.id = s.account_id
       ORDER BY s.closing_date, s.created_at, s.id'''
).fetchall()
payment_rows = database.execute(
    '''SELECT id, destination_account_id AS account_id, amount, transaction_date
       FROM transactions
       WHERE type = 'transfer' AND status = 'posted'
         AND destination_account_id IN ('card')
       ORDER BY transaction_date, created_at, id'''
).fetchall()
assert len(statement_rows) == 1
assert statement_rows[0]['card_name'] == '@Archived card'
assert [(row['id'], row['amount']) for row in payment_rows] == [('card-payment', 100_000)]

# Tens of thousands of rows remain countable and keyset-orderable without changing persisted data.
large_rows = [
    (f'large-{index:05d}', 'expense', 'posted', 1, 'COP', 'checking', None, 'food', None,
     '2026-07-21', utc, utc)
    for index in range(20_000)
]
database.executemany(
    '''INSERT INTO transactions
       (id,type,status,amount,currency,account_id,destination_account_id,category_id,note,
        transaction_date,created_at,updated_at,base_currency_code)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?, CASE WHEN ?2 = 'transfer' THEN NULL ELSE 'COP' END)''',
    large_rows,
)
count = database.execute(
    "SELECT count(*) FROM transactions WHERE transaction_date = '2026-07-21'"
).fetchone()[0]
assert count == 20_000
first_page = database.execute(
    '''SELECT id, transaction_date, created_at
       FROM transactions
       WHERE transaction_date = '2026-07-21'
       ORDER BY transaction_date, created_at, id LIMIT 1000'''
).fetchall()
cursor = first_page[-1]
second_page = database.execute(
    '''SELECT id, transaction_date, created_at
       FROM transactions
       WHERE transaction_date = '2026-07-21'
         AND (transaction_date > ?
           OR (transaction_date = ? AND created_at > ?)
           OR (transaction_date = ? AND created_at = ? AND id > ?))
       ORDER BY transaction_date, created_at, id LIMIT 1000''',
    (cursor['transaction_date'], cursor['transaction_date'], cursor['created_at'],
     cursor['transaction_date'], cursor['created_at'], cursor['id']),
).fetchall()
assert len(first_page) == len(second_page) == 1000
assert first_page[-1]['id'] != second_page[0]['id']

assert database.execute('PRAGMA integrity_check').fetchone()[0] == 'ok'
database.close()
