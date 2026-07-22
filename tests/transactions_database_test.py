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


def apply_migrations(database):
    for migration in sorted((root / 'src/database/migrations').glob('*.sql')):
        database.executescript(
            migration.read_text(encoding='utf-8').replace('--> statement-breakpoint', '')
        )


connection = open_database()
apply_migrations(connection)

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
connection.executemany('INSERT INTO accounts (id,name,type,currency,opening_balance,credit_limit,is_archived,archived_at,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)', accounts)
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


# Filtered history uses the same parameterized joins, predicates, and stable cursor
# shape as SQLiteTransactionRepository, against an isolated persisted fixture.
query_database = sqlite3.connect(':memory:')
query_database.row_factory = sqlite3.Row
query_database.execute('PRAGMA foreign_keys = ON')
apply_migrations(query_database)
filter_accounts = [
    ('checking-filter', 'Checking', 'checking', 'COP', 0, None, 0, None, utc, utc),
    ('savings-filter', 'Savings', 'savings', 'COP', 0, None, 0, None, utc, utc),
    ('archived-filter', 'Old Wallet', 'cash', 'COP', 0, None, 1, utc, utc, utc),
    ('unused-filter', 'Unused', 'cash', 'COP', 0, None, 0, None, utc, utc),
]
filter_categories = [
    ('food-filter', 'Food', 'expense', 'food', 0, None, utc, utc),
    ('salary-filter', 'Salary', 'income', 'salary', 0, None, utc, utc),
    ('archived-category-filter', 'Café', 'expense', 'food', 1, utc, utc, utc),
    ('unused-category-filter', 'Unused', 'expense', 'other', 0, None, utc, utc),
]
query_database.executemany('INSERT INTO accounts (id,name,type,currency,opening_balance,credit_limit,is_archived,archived_at,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)', filter_accounts)
query_database.executemany('INSERT INTO categories VALUES (?,?,?,?,?,?,?,?)', filter_categories)
tie_time = '2026-07-10T10:00:00.000Z'
query_database.executemany(
    'INSERT INTO transactions VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
    [
        ('tx-note', 'expense', 'posted', 10_000, 'COP', 'checking-filter', None, 'food-filter', 'GROCERIES', '2026-07-13', '2026-07-13T12:00:00.000Z', utc),
        ('tx-income', 'income', 'posted', 20_000, 'COP', 'savings-filter', None, 'salary-filter', None, '2026-07-12', '2026-07-12T13:00:00.000Z', utc),
        ('tx-transfer', 'transfer', 'posted', 5_000, 'COP', 'checking-filter', 'archived-filter', None, 'Move funds', '2026-07-11', '2026-07-11T14:00:00.000Z', utc),
        ('tie-a', 'expense', 'posted', 1_000, 'COP', 'checking-filter', None, 'food-filter', None, '2026-07-10', tie_time, utc),
        ('tie-c', 'expense', 'posted', 1_000, 'COP', 'checking-filter', None, 'food-filter', None, '2026-07-10', tie_time, utc),
        ('tie-b', 'expense', 'posted', 1_000, 'COP', 'checking-filter', None, 'food-filter', None, '2026-07-10', tie_time, utc),
        ('tx-voided', 'expense', 'voided', 7_000, 'COP', 'archived-filter', None, 'archived-category-filter', 'old lunch', '2026-06-30', '2026-06-30T09:00:00.000Z', utc),
    ],
)


def escape_like(value):
    return value.replace('\\', '\\\\').replace('%', '\\%').replace('_', '\\_')


def query_history(
    *, search=None, types=None, statuses=None, account_id=None, category_id=None,
    date_from=None, date_to=None, limit=40, cursor=None,
):
    conditions = []
    parameters = []
    normalized_search = search.strip() if search else ''
    if normalized_search:
        pattern = f'%{escape_like(normalized_search.lower())}%'
        conditions.append('''(
          lower(coalesce(t.note, '')) LIKE ? ESCAPE '\\'
          OR lower(source.name) LIKE ? ESCAPE '\\'
          OR lower(coalesce(destination.name, '')) LIKE ? ESCAPE '\\'
          OR lower(coalesce(category.name, '')) LIKE ? ESCAPE '\\'
          OR lower(t.type) LIKE ? ESCAPE '\\'
        )''')
        parameters.extend([pattern] * 5)
    if types:
        conditions.append(f"t.type IN ({','.join('?' for _ in types)})")
        parameters.extend(types)
    if statuses:
        conditions.append(f"t.status IN ({','.join('?' for _ in statuses)})")
        parameters.extend(statuses)
    if account_id:
        conditions.append('(t.account_id = ? OR t.destination_account_id = ?)')
        parameters.extend([account_id, account_id])
    if category_id:
        conditions.append('t.category_id = ?')
        parameters.append(category_id)
    if date_from:
        conditions.append('t.transaction_date >= ?')
        parameters.append(date_from)
    if date_to:
        conditions.append('t.transaction_date <= ?')
        parameters.append(date_to)
    if cursor:
        conditions.append('''(
          t.transaction_date < ?
          OR (t.transaction_date = ? AND t.created_at < ?)
          OR (t.transaction_date = ? AND t.created_at = ? AND t.id < ?)
        )''')
        parameters.extend([
            cursor[0], cursor[0], cursor[1], cursor[0], cursor[1], cursor[2],
        ])
    where = f"WHERE {' AND '.join(conditions)}" if conditions else ''
    rows = query_database.execute(
        f'''SELECT t.id, t.type, t.status, t.transaction_date, t.created_at,
                   source.name AS source_name, destination.name AS destination_name,
                   category.name AS category_name
            FROM transactions t
            JOIN accounts source ON source.id = t.account_id
            LEFT JOIN accounts destination ON destination.id = t.destination_account_id
            LEFT JOIN categories category ON category.id = t.category_id
            {where}
            ORDER BY t.transaction_date DESC, t.created_at DESC, t.id DESC
            LIMIT ?''',
        [*parameters, limit + 1],
    ).fetchall()
    page = rows[:limit]
    next_cursor = None
    if len(rows) > limit:
        last = page[-1]
        next_cursor = (last['transaction_date'], last['created_at'], last['id'])
    return page, next_cursor


def filtered_ids(**query):
    return [row['id'] for row in query_history(**query)[0]]


all_ids = filtered_ids(limit=100)
assert filtered_ids(search='GROCERIES', limit=100) == ['tx-note']
assert filtered_ids(search='  groceries  ', limit=100) == ['tx-note']
assert 'tx-note' in filtered_ids(search='Food', limit=100)
assert 'tx-transfer' in filtered_ids(search='Checking', limit=100)
assert 'tx-transfer' in filtered_ids(search='Old Wallet', limit=100)
assert filtered_ids(search='transfer', limit=100) == ['tx-transfer']
assert filtered_ids(search='old lunch', statuses=['voided'], limit=100) == ['tx-voided']
assert filtered_ids(search='does not exist', limit=100) == []
assert filtered_ids(search='   ', limit=100) == all_ids

assert set(filtered_ids(types=['expense'], limit=100)) == {
    'tx-note', 'tie-a', 'tie-b', 'tie-c', 'tx-voided',
}
assert filtered_ids(types=['income'], limit=100) == ['tx-income']
assert filtered_ids(types=['transfer'], limit=100) == ['tx-transfer']
assert filtered_ids(statuses=['voided'], limit=100) == ['tx-voided']
assert 'tx-note' in filtered_ids(statuses=['posted'], limit=100)
assert filtered_ids(types=['expense'], statuses=['voided'], limit=100) == ['tx-voided']

assert filtered_ids(account_id='savings-filter', limit=100) == ['tx-income']
assert 'tx-transfer' in filtered_ids(account_id='checking-filter', limit=100)
assert filtered_ids(account_id='archived-filter', limit=100) == ['tx-transfer', 'tx-voided']
assert 'tx-note' in filtered_ids(category_id='food-filter', limit=100)
assert filtered_ids(category_id='salary-filter', limit=100) == ['tx-income']
assert filtered_ids(category_id='archived-category-filter', limit=100) == ['tx-voided']
assert 'tx-transfer' not in filtered_ids(category_id='food-filter', limit=100)

assert 'tx-voided' not in filtered_ids(date_from='2026-07-01', date_to='2026-07-31', limit=100)
assert filtered_ids(date_from='2026-06-01', date_to='2026-06-30', limit=100) == ['tx-voided']
assert set(filtered_ids(date_from='2026-06-14', date_to='2026-07-13', limit=100)) == set(all_ids)
assert filtered_ids(date_from='2026-07-11', date_to='2026-07-11', limit=100) == ['tx-transfer']
assert filtered_ids(
    search='old wallet', types=['transfer'], statuses=['posted'],
    account_id='archived-filter', date_from='2026-07-01', date_to='2026-07-31', limit=100,
) == ['tx-transfer']
assert 'tx-note' in filtered_ids(types=['expense'], category_id='food-filter', limit=100)
assert filtered_ids(account_id='archived-filter', date_from='2026-07-01', limit=100) == ['tx-transfer']

tie_ids = [transaction_id for transaction_id in all_ids if transaction_id.startswith('tie-')]
assert tie_ids == ['tie-c', 'tie-b', 'tie-a'], tie_ids
collected = []
cursor = None
while True:
    page, cursor = query_history(limit=2, cursor=cursor)
    collected.extend(row['id'] for row in page)
    if cursor is None:
        break
assert collected == all_ids
assert len(collected) == len(set(collected))
assert query_history(limit=100)[1] is None

# A refreshed first page reflects edits and voiding against the current query.
query_database.execute("UPDATE transactions SET note = 'renamed' WHERE id = 'tx-note'")
assert 'tx-note' not in filtered_ids(search='groceries', limit=100)
query_database.execute("UPDATE transactions SET note = 'groceries' WHERE id = 'tie-a'")
assert filtered_ids(search='groceries', limit=100) == ['tie-a']
query_database.execute("UPDATE transactions SET status = 'voided' WHERE id = 'tx-note'")
assert 'tx-note' not in filtered_ids(statuses=['posted'], limit=100)
assert 'tx-note' in filtered_ids(statuses=['voided'], limit=100)

filter_account_options = query_database.execute('''
  SELECT a.id FROM accounts a
  WHERE a.is_archived = 0 OR EXISTS (
    SELECT 1 FROM transactions t
    WHERE t.account_id = a.id OR t.destination_account_id = a.id
  )
''').fetchall()
filter_category_options = query_database.execute('''
  SELECT c.id FROM categories c
  WHERE c.is_archived = 0
     OR EXISTS (SELECT 1 FROM transactions t WHERE t.category_id = c.id)
''').fetchall()
assert {row['id'] for row in filter_account_options} == {
    'checking-filter', 'savings-filter', 'archived-filter', 'unused-filter',
}
assert {row['id'] for row in filter_category_options} == {
    'food-filter', 'salary-filter', 'archived-category-filter', 'unused-category-filter',
}
query_database.close()

db_file.unlink()
print('transactions database integration: PASS')
