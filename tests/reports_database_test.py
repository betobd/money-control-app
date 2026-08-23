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
connection.executemany('INSERT INTO accounts (id,name,type,currency,opening_balance,credit_limit,is_archived,archived_at,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)', accounts)
connection.executemany('INSERT INTO categories (id,name,type,icon,is_archived,archived_at,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)', categories)
transactions = [
    ('prior-expense', 'expense', 'posted', 100_000, 'COP', 'checking', None, 'food', None, '2026-06-30', utc, utc),
    ('income', 'income', 'posted', 500_000, 'COP', 'checking', None, 'salary', None, '2026-07-01', utc, utc),
    ('food-expense', 'expense', 'posted', 100_000, 'COP', 'checking', None, 'food', None, '2026-07-02', utc, utc),
    ('transfer', 'transfer', 'posted', 50_000, 'COP', 'checking', 'card', None, None, '2026-07-03', utc, utc),
    ('voided-expense', 'expense', 'voided', 900_000, 'COP', 'checking', None, 'food', None, '2026-07-04', utc, utc),
    ('archived-expense', 'expense', 'posted', 200_000, 'COP', 'archived', None, 'old-utilities', None, '2026-07-05', utc, utc),
    ('recurring-income', 'income', 'posted', 50_000, 'COP', 'checking', None, 'salary', None, '2026-07-06', utc, utc),
]
connection.executemany('INSERT INTO transactions (id,type,status,amount,currency,account_id,destination_account_id,category_id,note,transaction_date,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)', transactions)

# Pending/skipped occurrences contain money snapshots but have no financial effect.
rule = (
    'rule', 'expense', 700_000, 'COP', 'checking', None, 'food', None,
    'monthly', 1, '2026-07-07', '2026-08-07', None, 1, None, utc, utc,
)
connection.execute('INSERT INTO recurring_transactions (id,type,amount,currency,account_id,destination_account_id,category_id,note,frequency,interval,start_date,next_occurrence_date,end_date,is_active,ended_at,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)', rule)
occurrences = [
    ('pending', 'rule', '2026-07-07', 'pending', 'expense', 700_000, 'COP', 'checking', None, 'food', None, None, utc, utc),
    ('skipped', 'rule', '2026-07-08', 'skipped', 'expense', 800_000, 'COP', 'checking', None, 'food', None, None, utc, utc),
    ('posted', 'rule', '2026-07-06', 'posted', 'income', 50_000, 'COP', 'checking', None, 'salary', None, 'recurring-income', utc, utc),
]
connection.executemany('INSERT INTO recurring_occurrences (id,recurring_transaction_id,scheduled_date,status,type,amount,currency,account_id,destination_account_id,category_id,note,transaction_id,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)', occurrences)
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


# Category breakdown by subcategory, mirroring SQLiteReportRepository.categoryExpenses.
# Isolated so the row-set assertions above keep their meaning.
SUBCATEGORY_BREAKDOWN_SQL = '''
SELECT
  COALESCE(t.category_id, o.category_id) AS category_id,
  COALESCE(c.name, oc.name) AS category_name,
  COALESCE(t.subcategory_id, o.subcategory_id) AS subcategory_id,
  COALESCE(sc.name, osc.name) AS subcategory_name,
  COALESCE(SUM(CASE
    WHEN t.type = 'expense' THEN COALESCE(t.base_amount_minor, t.amount)
    WHEN t.type = 'refund' THEN -COALESCE(t.base_amount_minor, t.amount)
    ELSE 0 END), 0) AS total,
  COUNT(*) AS transaction_count
FROM transactions t
LEFT JOIN categories c ON c.id = t.category_id
LEFT JOIN categories sc ON sc.id = t.subcategory_id
LEFT JOIN transactions o ON o.id = t.original_transaction_id
LEFT JOIN categories oc ON oc.id = o.category_id
LEFT JOIN categories osc ON osc.id = o.subcategory_id
WHERE t.status = 'posted' AND t.type IN ('expense', 'refund')
  AND t.transaction_date >= ? AND t.transaction_date <= ?
GROUP BY COALESCE(t.category_id, o.category_id), COALESCE(t.subcategory_id, o.subcategory_id)
ORDER BY total DESC, category_id
'''

# The pre-subcategory ranking, kept verbatim as the reference the breakdown must
# still agree with.
CATEGORY_ONLY_SQL = '''
SELECT
  COALESCE(t.category_id, o.category_id) AS category_id,
  COALESCE(SUM(CASE
    WHEN t.type = 'expense' THEN COALESCE(t.base_amount_minor, t.amount)
    WHEN t.type = 'refund' THEN -COALESCE(t.base_amount_minor, t.amount)
    ELSE 0 END), 0) AS total,
  COUNT(*) AS transaction_count
FROM transactions t
LEFT JOIN transactions o ON o.id = t.original_transaction_id
WHERE t.status = 'posted' AND t.type IN ('expense', 'refund')
  AND t.transaction_date >= ? AND t.transaction_date <= ?
GROUP BY COALESCE(t.category_id, o.category_id)
'''

report_tree = sqlite3.connect(':memory:')
report_tree.row_factory = sqlite3.Row
report_tree.execute('PRAGMA foreign_keys = ON')
apply_migrations(report_tree)
report_tree.execute(
    'INSERT INTO accounts (id,name,type,currency,opening_balance,credit_limit,is_archived,archived_at,created_at,updated_at)'
    " VALUES ('rt-checking','Checking','checking','COP',0,NULL,0,NULL,?,?)",
    (utc, utc),
)
report_tree.executemany(
    'INSERT INTO categories (id,name,type,icon,is_archived,archived_at,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)',
    [
        ('hogar', 'Hogar', 'expense', 'other', 0, None, utc, utc),
        ('transporte', 'Transporte', 'expense', 'transport', 0, None, utc, utc),
    ],
)
report_tree.executemany(
    'INSERT INTO categories (id,name,type,icon,parent_category_id,is_archived,archived_at,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)',
    [
        ('mercado', 'Mercado', 'expense', 'other', 'hogar', 0, None, utc, utc),
        ('servicios', 'Servicios', 'expense', 'bills', 'hogar', 0, None, utc, utc),
        ('taxi', 'Taxi', 'expense', 'transport', 'transporte', 0, None, utc, utc),
    ],
)
report_tree.executemany(
    'INSERT INTO transactions (id,type,status,amount,currency,account_id,destination_account_id,category_id,subcategory_id,original_transaction_id,note,transaction_date,created_at,updated_at)'
    ' VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
    [
        ('rt-mercado', 'expense', 'posted', 200_000, 'COP', 'rt-checking', None, 'hogar', 'mercado', None, None, '2026-07-02', utc, utc),
        ('rt-servicios', 'expense', 'posted', 120_000, 'COP', 'rt-checking', None, 'hogar', 'servicios', None, None, '2026-07-03', utc, utc),
        ('rt-hogar-plain', 'expense', 'posted', 80_000, 'COP', 'rt-checking', None, 'hogar', None, None, None, '2026-07-04', utc, utc),
        ('rt-taxi', 'expense', 'posted', 60_000, 'COP', 'rt-checking', None, 'transporte', 'taxi', None, None, '2026-07-05', utc, utc),
        # A refund of a subcategorised expense must reduce that same leaf.
        ('rt-refund', 'refund', 'posted', 50_000, 'COP', 'rt-checking', None, None, None, 'rt-mercado', None, '2026-07-06', utc, utc),
        # Out of period, and a voided row: neither may appear.
        ('rt-outside', 'expense', 'posted', 999_000, 'COP', 'rt-checking', None, 'hogar', 'mercado', None, None, '2026-08-01', utc, utc),
        ('rt-voided', 'expense', 'voided', 999_000, 'COP', 'rt-checking', None, 'hogar', 'mercado', None, None, '2026-07-07', utc, utc),
    ],
)
report_tree.commit()

period = ('2026-07-01', '2026-07-31')
breakdown = [tuple(row) for row in report_tree.execute(SUBCATEGORY_BREAKDOWN_SQL, period)]
assert breakdown == [
    # Mercado nets the refund: 200,000 - 50,000, over two transactions.
    ('hogar', 'Hogar', 'mercado', 'Mercado', 150_000, 2),
    ('hogar', 'Hogar', 'servicios', 'Servicios', 120_000, 1),
    ('hogar', 'Hogar', None, None, 80_000, 1),
    ('transporte', 'Transporte', 'taxi', 'Taxi', 60_000, 1),
], breakdown

# The decisive invariant: folding the leaf rows must reproduce the category
# ranking exactly. If these ever diverge, a category total would stop being the
# sum of its parts.
folded = {}
for row in report_tree.execute(SUBCATEGORY_BREAKDOWN_SQL, period):
    total, count = folded.get(row['category_id'], (0, 0))
    folded[row['category_id']] = (total + row['total'], count + row['transaction_count'])
category_only = {
    row['category_id']: (row['total'], row['transaction_count'])
    for row in report_tree.execute(CATEGORY_ONLY_SQL, period)
}
assert folded == category_only, (folded, category_only)
assert folded == {'hogar': (350_000, 4), 'transporte': (60_000, 1)}

assert report_tree.execute('PRAGMA integrity_check').fetchone()[0] == 'ok'
report_tree.close()

print('report subcategory breakdown verified')
