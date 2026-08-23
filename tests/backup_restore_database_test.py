import sqlite3
from pathlib import Path


root = Path(__file__).parents[1]
db_file = root / 'tests' / 'backup_restore_test.sqlite'
migrations = root / 'src' / 'database' / 'migrations'

# budget_rules precedes budgets here so the dynamic re-insert satisfies the
# budgets.rule_id -> budget_rules foreign key (parent inserted before child).
tables = (
    'accounts',
    'categories',
    'transactions',
    'transaction_splits',
    'budget_rules',
    'budgets',
    'recurring_transactions',
    'recurring_occurrences',
    'credit_card_statements',
    'investment_accounts',
    'investment_valuations',
)
delete_order = (
    'investment_valuations',
    'investment_accounts',
    'credit_card_statements',
    'recurring_occurrences',
    'transaction_splits',
    'budgets',
    'budget_rules',
    'recurring_transactions',
    'transactions',
    'categories',
    'accounts',
)
# investment_accounts uses account_id as its primary key (no id column).
order_keys = {'investment_accounts': 'account_id'}


def open_database():
    database = sqlite3.connect(db_file)
    database.execute('PRAGMA foreign_keys = ON')
    return database


def apply_migrations(database):
    for migration in sorted(migrations.glob('*.sql')):
        database.executescript(
            migration.read_text(encoding='utf-8').replace('--> statement-breakpoint', '')
        )


def snapshot(database):
    return {
        table: database.execute(f'SELECT * FROM {table} ORDER BY {order_keys.get(table, "id")}').fetchall()
        for table in tables
    }


def derived_values(database):
    balances = dict(database.execute('''
        SELECT a.id, a.opening_balance + COALESCE(SUM(
          CASE
            WHEN t.status <> 'posted' THEN 0
            WHEN t.type = 'income' AND t.account_id = a.id THEN t.amount
            WHEN t.type = 'expense' AND t.account_id = a.id THEN -t.amount
            WHEN t.type = 'refund' AND t.account_id = a.id THEN t.amount
            WHEN t.type = 'transfer' AND t.account_id = a.id THEN -t.amount
            WHEN t.type = 'transfer' AND t.destination_account_id = a.id THEN t.amount
            ELSE 0
          END
        ), 0)
        FROM accounts a
        LEFT JOIN transactions t
          ON t.account_id = a.id OR t.destination_account_id = a.id
        GROUP BY a.id
    '''))
    income, expense = database.execute('''
        SELECT
          COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0),
          COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0)
        FROM transactions
        WHERE status = 'posted'
          AND transaction_date >= '2026-07-01'
          AND transaction_date < '2026-08-01'
    ''').fetchone()
    budget_spend = database.execute('''
        SELECT COALESCE(SUM(t.amount), 0)
        FROM transactions t
        WHERE t.status = 'posted'
          AND t.type = 'expense'
          AND t.category_id = 'food'
          AND t.transaction_date >= '2026-07-01'
          AND t.transaction_date < '2026-08-01'
    ''').fetchone()[0]
    return {
        'balances': balances,
        'income': income,
        'expense': expense,
        'net': income - expense,
        'food_budget_spend': budget_spend,
    }


def restore_atomically(database, backup, fail_after=None):
    database.execute('BEGIN IMMEDIATE')
    try:
        for table in delete_order:
            # Refunds self-reference their original expense via
            # transactions.original_transaction_id (ON DELETE RESTRICT), enforced
            # per row. Delete refund children before the parent expenses so the
            # bulk transactions delete cannot trip the constraint mid-statement.
            if table == 'transactions':
                database.execute("DELETE FROM transactions WHERE type = 'refund'")
            database.execute(f'DELETE FROM {table}')

        for table in tables:
            columns = database.execute(f'PRAGMA table_info({table})').fetchall()
            placeholders = ','.join('?' for _ in columns)
            database.executemany(
                f'INSERT INTO {table} VALUES ({placeholders})',
                backup[table],
            )
            if fail_after == table:
                raise RuntimeError(f'simulated failure after {table}')

        for table in tables:
            actual = database.execute(f'SELECT COUNT(*) FROM {table}').fetchone()[0]
            assert actual == len(backup[table]), (table, actual, len(backup[table]))

        assert database.execute('PRAGMA foreign_key_check').fetchall() == []
        if fail_after == 'integrity':
            raise RuntimeError('simulated post-restore integrity failure')
        assert database.execute('PRAGMA integrity_check').fetchone()[0] == 'ok'
        database.commit()
    except Exception:
        database.rollback()
        raise


if db_file.exists():
    db_file.unlink()

connection = open_database()
apply_migrations(connection)

utc = '2026-07-16T15:00:00.000Z'
connection.executemany(
    'INSERT INTO accounts (id,name,type,currency,opening_balance,credit_limit,is_archived,archived_at,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)',
    [
        ('checking', 'Checking', 'checking', 'COP', 2_000_000, None, 0, None, utc, utc),
        ('savings', 'Savings', 'savings', 'COP', 500_000, None, 0, None, utc, utc),
        ('card', 'Credit card', 'credit_card', 'COP', -300_000, 2_000_000, 0, None, utc, utc),
        ('archived-account', 'Old cash', 'cash', 'COP', 100_000, None, 1, utc, utc, utc),
    ],
)
connection.execute(
    'INSERT INTO credit_card_statements VALUES (?,?,?,?,?,?,?,?,?,?)',
    ('statement', 'card', '2026-06-16', '2026-07-15', '2026-07-15', '2026-08-05', 250_000, 25_000, utc, utc),
)
connection.executemany(
    'INSERT INTO categories (id,name,type,icon,is_archived,archived_at,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)',
    [
        ('salary', 'Salary', 'income', 'salary', 0, None, utc, utc),
        ('food', 'Food', 'expense', 'food', 0, None, utc, utc),
        ('archived-category', 'Old bills', 'expense', 'bills', 1, utc, utc, utc),
    ],
)
connection.executemany(
    'INSERT INTO transactions (id,type,status,amount,currency,account_id,destination_account_id,category_id,note,transaction_date,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
    [
        ('income', 'income', 'posted', 500_000, 'COP', 'checking', None, 'salary', 'Salary note', '2026-07-01', utc, utc),
        ('expense', 'expense', 'posted', 120_000, 'COP', 'checking', None, 'food', 'Groceries', '2026-07-02', utc, utc),
        ('transfer', 'transfer', 'posted', 200_000, 'COP', 'checking', 'savings', None, 'Savings transfer', '2026-07-03', utc, utc),
        ('card-expense', 'expense', 'posted', 80_000, 'COP', 'card', None, 'archived-category', None, '2026-07-04', utc, utc),
        ('voided', 'expense', 'voided', 999_000, 'COP', 'checking', None, 'food', 'Voided', '2026-07-05', utc, utc),
        ('recurring-posted', 'expense', 'posted', 50_000, 'COP', 'checking', None, 'food', 'Internet', '2026-07-16', utc, utc),
    ],
)
# A posted linked refund against the 'expense' row exercises the self-referential
# ON DELETE RESTRICT path during restore-over-existing-data. The id sorts after
# its parent so the snapshot-ordered insert satisfies the FK on the insert side too.
connection.execute(
    'INSERT INTO transactions (id,type,status,amount,currency,account_id,destination_account_id,category_id,original_transaction_id,note,transaction_date,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)',
    ('refund-expense', 'refund', 'posted', 40_000, 'COP', 'checking', None, None, 'expense', None, '2026-07-10', utc, utc),
)
connection.execute(
    'INSERT INTO transaction_splits VALUES (?,?,?,?,?)',
    ('split-expense', 'expense', 'checking', -120_000, 0),
)
connection.execute(
    'INSERT INTO budget_rules VALUES (?,?,?,?,?,?,?,?)',
    ('rule-food', 'food', 400_000, 'blue', '2026-07', 1, utc, utc),
)
connection.execute(
    'INSERT INTO budgets VALUES (?,?,?,?,?,?,?,?)',
    ('budget-food', 'food', '2026-07', 400_000, utc, utc, 'blue', 'rule-food'),
)
connection.execute(
    'INSERT INTO recurring_transactions (id,type,amount,currency,account_id,destination_account_id,category_id,note,frequency,interval,start_date,next_occurrence_date,end_date,is_active,ended_at,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
    (
        'rule-internet', 'expense', 50_000, 'COP', 'checking', None, 'food',
        'Internet', 'monthly', 1, '2026-07-16', '2026-09-16', None, 1, None,
        utc, utc,
    ),
)
connection.executemany(
    'INSERT INTO recurring_occurrences (id,recurring_transaction_id,scheduled_date,status,type,amount,currency,account_id,destination_account_id,category_id,note,transaction_id,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
    [
        ('occurrence-posted', 'rule-internet', '2026-07-16', 'posted', 'expense', 50_000, 'COP', 'checking', None, 'food', 'Internet', 'recurring-posted', utc, utc),
        ('occurrence-pending', 'rule-internet', '2026-08-16', 'pending', 'expense', 50_000, 'COP', 'checking', None, 'food', 'Internet', None, utc, utc),
    ],
)
# An investment account with metadata and a valuation exercises the format-v5
# investment tables through the same snapshot/restore/rollback machinery.
connection.execute(
    'INSERT INTO accounts (id,name,type,currency,opening_balance,credit_limit,is_archived,archived_at,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)',
    ('trii', 'Trii', 'investment', 'COP', 1_000_000, None, 0, None, utc, utc),
)
connection.execute(
    'INSERT INTO investment_accounts (account_id,investment_type,tracking_mode,liquidity,provider_name,start_date,maturity_date,note,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)',
    ('trii', 'brokerage', 'balance', 'liquid', 'Trii', None, None, None, utc, utc),
)
connection.execute(
    'INSERT INTO investment_valuations (id,investment_account_id,value_minor,basis_minor,currency_code,valuation_date,note,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)',
    ('val-trii', 'trii', 1_100_000, 1_000_000, 'COP', '2026-07-16', None, utc, utc),
)
connection.commit()

backup = snapshot(connection)
baseline_derived = derived_values(connection)
assert baseline_derived == {
    'balances': {
        'archived-account': 100_000,
        'card': -380_000,
        'checking': 2_170_000,
        'savings': 700_000,
        'trii': 1_000_000,
    },
    'income': 500_000,
    'expense': 250_000,
    'net': 250_000,
    'food_budget_spend': 170_000,
}

# Later local changes make the current database observably different from the backup.
connection.execute("UPDATE accounts SET name = 'Renamed checking' WHERE id = 'checking'")
connection.execute("UPDATE transactions SET status = 'voided' WHERE id = 'recurring-posted'")
connection.execute(
    'INSERT INTO transactions (id,type,status,amount,currency,account_id,destination_account_id,category_id,note,transaction_date,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
    ('later-income', 'income', 'posted', 1, 'COP', 'savings', None, 'salary', None, '2026-07-20', utc, utc),
)
connection.commit()
changed = snapshot(connection)
assert changed != backup

# Every simulated failure must roll the entire destructive replacement back.
for failure in ('accounts', 'categories', 'transactions', 'recurring_occurrences', 'integrity'):
    try:
        restore_atomically(connection, backup, failure)
        raise AssertionError(f'{failure} restore failure unexpectedly committed')
    except RuntimeError:
        pass
    assert snapshot(connection) == changed, failure
    assert connection.execute('PRAGMA foreign_key_check').fetchall() == []

# A valid empty logical backup clears every application-owned table atomically.
empty_backup = {table: [] for table in tables}
restore_atomically(connection, empty_backup)
assert snapshot(connection) == empty_backup
assert derived_values(connection) == {
    'balances': {}, 'income': 0, 'expense': 0, 'net': 0, 'food_budget_spend': 0,
}

restore_atomically(connection, backup)
assert snapshot(connection) == backup
assert derived_values(connection) == baseline_derived
assert connection.execute("SELECT note FROM transactions WHERE id = 'expense'").fetchone()[0] == 'Groceries'
assert connection.execute("SELECT COUNT(*) FROM transactions WHERE id = 'later-income'").fetchone()[0] == 0
assert connection.execute("SELECT is_archived FROM accounts WHERE id = 'archived-account'").fetchone()[0] == 1
assert connection.execute("SELECT is_archived FROM categories WHERE id = 'archived-category'").fetchone()[0] == 1
assert connection.execute("SELECT destination_account_id FROM transactions WHERE id = 'transfer'").fetchone()[0] == 'savings'
assert connection.execute("SELECT transaction_id FROM recurring_occurrences WHERE id = 'occurrence-posted'").fetchone()[0] == 'recurring-posted'
connection.close()

# The restored database remains complete after an app-style close/reopen.
connection = open_database()
assert snapshot(connection) == backup
assert derived_values(connection) == baseline_derived
assert connection.execute('PRAGMA foreign_key_check').fetchall() == []
assert connection.execute('PRAGMA integrity_check').fetchone()[0] == 'ok'
connection.close()

db_file.unlink()
print('backup restore database integration: PASS')


# Restoring a two-level category tree. Isolated so the assertions above keep
# their meaning, and run last because it verifies the ordering rules the real
# restore depends on.
hierarchy = sqlite3.connect(':memory:')
hierarchy.execute('PRAGMA foreign_keys = ON')
apply_migrations(hierarchy)

hierarchy.execute(
    'INSERT INTO accounts (id,name,type,currency,opening_balance,credit_limit,is_archived,archived_at,created_at,updated_at)'
    " VALUES ('h-checking','Checking','checking','COP',0,NULL,0,NULL,?,?)",
    (utc, utc),
)


def insert_category(database, category_id, name, parent=None):
    database.execute(
        'INSERT INTO categories (id,name,type,icon,parent_category_id,is_archived,archived_at,created_at,updated_at)'
        ' VALUES (?,?,?,?,?,0,NULL,?,?)',
        (category_id, name, 'expense', 'other', parent, utc, utc),
    )


# A subcategory cannot be written before the category it belongs to: the restore
# must insert parents first, which is why insertSnapshot splits the rows in two
# passes instead of using the file order.
try:
    insert_category(hierarchy, 'orphan', 'Orphan', 'hogar')
    raise AssertionError('a subcategory must not insert before its parent')
except sqlite3.IntegrityError:
    pass

insert_category(hierarchy, 'hogar', 'Hogar')
insert_category(hierarchy, 'mercado', 'Mercado', 'hogar')
hierarchy.execute(
    'INSERT INTO transactions (id,type,status,amount,currency,account_id,category_id,subcategory_id,transaction_date,created_at,updated_at)'
    " VALUES ('h-expense','expense','posted',50000,'COP','h-checking','hogar','mercado','2026-07-02',?,?)",
    (utc, utc),
)
hierarchy.commit()

# The mirror image on the way out: a bulk delete reaches the parent first (it
# holds the lower rowid) and ON DELETE RESTRICT rejects it, so replaceAll has to
# remove subcategories before categories.
hierarchy.execute('BEGIN IMMEDIATE')
hierarchy.execute('DELETE FROM transactions')
try:
    hierarchy.execute('DELETE FROM categories')
    raise AssertionError('a bulk category delete must trip ON DELETE RESTRICT')
except sqlite3.IntegrityError:
    pass
hierarchy.rollback()

# The ordering the repository actually uses works.
hierarchy.execute('BEGIN IMMEDIATE')
hierarchy.execute('DELETE FROM transactions')
hierarchy.execute('DELETE FROM categories WHERE parent_category_id IS NOT NULL')
hierarchy.execute('DELETE FROM categories')
assert hierarchy.execute('SELECT COUNT(*) FROM categories').fetchone()[0] == 0
hierarchy.commit()

# Re-restore, then run the post-restore domain check the repository runs. It must
# report zero violations for a well-formed tree.
insert_category(hierarchy, 'hogar', 'Hogar')
insert_category(hierarchy, 'transporte', 'Transporte')
insert_category(hierarchy, 'mercado', 'Mercado', 'hogar')
insert_category(hierarchy, 'taxi', 'Taxi', 'transporte')
hierarchy.execute(
    'INSERT INTO transactions (id,type,status,amount,currency,account_id,category_id,subcategory_id,transaction_date,created_at,updated_at)'
    " VALUES ('h-expense','expense','posted',50000,'COP','h-checking','hogar','mercado','2026-07-02',?,?)",
    (utc, utc),
)
hierarchy.commit()

DOMAIN_CHECK_SQL = """
SELECT
  (SELECT count(*) FROM categories AS child
    JOIN categories AS parent ON parent.id = child.parent_category_id
    WHERE parent.parent_category_id IS NOT NULL OR parent.type <> child.type)
  + (SELECT count(*) FROM transactions AS t
    WHERE t.subcategory_id IS NOT NULL
      AND (SELECT parent_category_id FROM categories WHERE id = t.subcategory_id) IS NOT t.category_id)
  + (SELECT count(*) FROM recurring_transactions AS r
    WHERE r.subcategory_id IS NOT NULL
      AND (SELECT parent_category_id FROM categories WHERE id = r.subcategory_id) IS NOT r.category_id)
  + (SELECT count(*) FROM recurring_occurrences AS o
    WHERE o.subcategory_id IS NOT NULL
      AND (SELECT parent_category_id FROM categories WHERE id = o.subcategory_id) IS NOT o.category_id)
"""

assert hierarchy.execute(DOMAIN_CHECK_SQL).fetchone()[0] == 0
assert hierarchy.execute('PRAGMA foreign_key_check').fetchall() == []

# And it must report a violation for a pair that does not belong together. The
# triggers block this on write, so the row is forced in with them disabled --
# which is exactly the case the post-restore check exists to catch.
hierarchy.execute('DROP TRIGGER transactions_subcategory_insert_guard')
hierarchy.execute(
    'INSERT INTO transactions (id,type,status,amount,currency,account_id,category_id,subcategory_id,transaction_date,created_at,updated_at)'
    " VALUES ('h-mismatch','expense','posted',1000,'COP','h-checking','transporte','mercado','2026-07-02',?,?)",
    (utc, utc),
)
assert hierarchy.execute(DOMAIN_CHECK_SQL).fetchone()[0] == 1

assert hierarchy.execute('PRAGMA integrity_check').fetchone()[0] == 'ok'
hierarchy.close()

print('backup restore category hierarchy: PASS')
