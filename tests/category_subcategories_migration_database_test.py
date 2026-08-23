"""Migration 0013 (category subcategories) integrity and data-preservation tests.

Applies migrations 0000-0012 to build a populated pre-subcategory database, then
applies 0013 and asserts that:
  - every existing row is preserved exactly and every new column reads NULL,
    i.e. "keeps its category, has no subcategory";
  - derived balances, report totals and budget spend are numerically identical;
  - the parent-scoped unique index keeps root names unique (the coalesce case)
    while allowing the same subcategory name under different parents;
  - depth is capped at two levels and a subcategory inherits its parent's type;
  - a transaction's subcategory must belong to its category;
  - transfers and refunds cannot carry a subcategory;
  - ON DELETE RESTRICT protects a parent that has children, and a category that
    is referenced as a transaction subcategory;
  - PRAGMA foreign_key_check and integrity_check are clean.
"""
import sqlite3
from pathlib import Path

MIGRATION_DIR = Path(__file__).parents[1] / 'src' / 'database' / 'migrations'
V0013_NAME = '0013_category_subcategories.sql'
PRE = sorted(m for m in MIGRATION_DIR.glob('*.sql') if m.name < V0013_NAME)
V0013 = MIGRATION_DIR / V0013_NAME
UTC = '2026-07-12T12:00:00.000Z'


def apply(con, files):
    for f in files:
        con.executescript(f.read_text(encoding='utf-8').replace('--> statement-breakpoint', ''))


def new_con():
    con = sqlite3.connect(':memory:')
    con.execute('PRAGMA foreign_keys = ON')
    return con


CATEGORY_COLUMNS = 'id,name,type,icon,is_archived,archived_at,created_at,updated_at'


def seed(con):
    apply(con, PRE)
    con.executemany(
        'INSERT INTO accounts (id,name,type,currency,opening_balance,credit_limit,statement_closing_day,payment_due_day,is_archived,archived_at,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
        [
            ('checking', 'Checking', 'checking', 'COP', 3000000, None, None, None, 0, None, UTC, UTC),
            ('savings', 'Savings', 'savings', 'COP', 5000000, None, None, None, 0, None, UTC, UTC),
        ],
    )
    con.executemany(
        f'INSERT INTO categories ({CATEGORY_COLUMNS}) VALUES (?,?,?,?,?,?,?,?)',
        [
            ('salary', 'Salary', 'income', 'salary', 0, None, UTC, UTC),
            ('home', 'Hogar', 'expense', 'other', 0, None, UTC, UTC),
            ('transport', 'Transporte', 'expense', 'transport', 0, None, UTC, UTC),
            ('archived', 'Old', 'expense', 'other', 1, UTC, UTC, UTC),
        ],
    )
    con.executemany(
        'INSERT INTO transactions (id,type,status,amount,currency,account_id,destination_account_id,category_id,original_transaction_id,note,transaction_date,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)',
        [
            ('inc1', 'income', 'posted', 2000000, 'COP', 'checking', None, 'salary', None, None, '2026-07-05', UTC, UTC),
            ('exp1', 'expense', 'posted', 300000, 'COP', 'checking', None, 'home', None, 'groceries', '2026-07-06', UTC, UTC),
            ('exp2', 'expense', 'posted', 150000, 'COP', 'checking', None, 'transport', None, None, '2026-07-07', UTC, UTC),
            ('void1', 'expense', 'voided', 999999, 'COP', 'checking', None, 'home', None, None, '2026-07-08', UTC, UTC),
            ('xfer1', 'transfer', 'posted', 500000, 'COP', 'checking', 'savings', None, None, None, '2026-07-09', UTC, UTC),
            ('ref1', 'refund', 'posted', 50000, 'COP', 'checking', None, None, 'exp1', 'partial refund', '2026-07-11', UTC, UTC),
        ],
    )
    con.execute(
        'INSERT INTO budgets (id,category_id,month,limit_amount,created_at,updated_at) VALUES (?,?,?,?,?,?)',
        ('b1', 'home', '2026-07', 1000000, UTC, UTC),
    )
    con.execute(
        'INSERT INTO recurring_transactions (id,type,amount,currency,account_id,destination_account_id,category_id,note,frequency,interval,start_date,next_occurrence_date,end_date,is_active,ended_at,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
        ('rule1', 'expense', 80000, 'COP', 'checking', None, 'home', None, 'monthly', 1, '2026-07-01', '2026-08-01', None, 1, None, UTC, UTC),
    )
    con.execute(
        'INSERT INTO recurring_occurrences (id,recurring_transaction_id,scheduled_date,status,type,amount,currency,account_id,destination_account_id,category_id,note,transaction_id,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
        ('occ1', 'rule1', '2026-07-01', 'pending', 'expense', 80000, 'COP', 'checking', None, 'home', None, None, UTC, UTC),
    )
    con.commit()


BALANCE_SQL = '''
SELECT a.id, a.opening_balance + COALESCE(SUM(CASE
  WHEN t.status <> 'posted' THEN 0
  WHEN t.type='income'   AND t.account_id=a.id THEN t.amount
  WHEN t.type='expense'  AND t.account_id=a.id THEN -t.amount
  WHEN t.type='refund'   AND t.account_id=a.id THEN t.amount
  WHEN t.type='transfer' AND t.account_id=a.id THEN -t.amount
  WHEN t.type='transfer' AND t.destination_account_id=a.id THEN COALESCE(t.destination_amount_minor, t.amount)
  ELSE 0 END), 0)
FROM accounts a
LEFT JOIN transactions t ON (t.account_id=a.id OR t.destination_account_id=a.id)
GROUP BY a.id ORDER BY a.id
'''

REPORT_SQL = '''
SELECT
  COALESCE(SUM(CASE WHEN type='income'  THEN COALESCE(base_amount_minor, amount) ELSE 0 END),0),
  COALESCE(SUM(CASE WHEN type='expense' THEN COALESCE(base_amount_minor, amount) ELSE 0 END),0),
  COALESCE(SUM(CASE WHEN type='refund'  THEN COALESCE(base_amount_minor, amount) ELSE 0 END),0)
FROM transactions WHERE status='posted'
'''

BUDGET_SQL = '''
SELECT COALESCE(SUM(CASE
  WHEN r.type='expense' THEN COALESCE(r.base_amount_minor, r.amount)
  WHEN r.type='refund'  THEN -COALESCE(r.base_amount_minor, r.amount) ELSE 0 END),0)
FROM transactions r LEFT JOIN transactions o ON r.original_transaction_id=o.id
WHERE r.status='posted' AND r.transaction_date>='2026-07-01' AND r.transaction_date<'2026-08-01'
  AND COALESCE(r.category_id, o.category_id)='home'
'''


def migrated():
    con = new_con()
    seed(con)
    apply(con, [V0013])
    return con


def add_sub(con, sub_id, name, parent, kind='expense'):
    con.execute(
        f'INSERT INTO categories ({CATEGORY_COLUMNS},parent_category_id) VALUES (?,?,?,?,?,?,?,?,?)',
        (sub_id, name, kind, 'other', 0, None, UTC, UTC, parent),
    )


def test_migration_preserves_all_existing_data():
    con = new_con()
    seed(con)
    balances_before = con.execute(BALANCE_SQL).fetchall()
    report_before = con.execute(REPORT_SQL).fetchone()
    budget_before = con.execute(BUDGET_SQL).fetchone()
    transactions_before = con.execute(
        'SELECT id,type,status,amount,account_id,destination_account_id,category_id,original_transaction_id,transaction_date FROM transactions ORDER BY id'
    ).fetchall()
    categories_before = con.execute(f'SELECT {CATEGORY_COLUMNS} FROM categories ORDER BY id').fetchall()

    apply(con, [V0013])

    assert con.execute('PRAGMA foreign_key_check').fetchall() == []
    assert con.execute('PRAGMA integrity_check').fetchone()[0] == 'ok'
    assert con.execute(BALANCE_SQL).fetchall() == balances_before
    assert con.execute(REPORT_SQL).fetchone() == report_before
    assert con.execute(BUDGET_SQL).fetchone() == budget_before
    assert con.execute(
        'SELECT id,type,status,amount,account_id,destination_account_id,category_id,original_transaction_id,transaction_date FROM transactions ORDER BY id'
    ).fetchall() == transactions_before
    assert con.execute(f'SELECT {CATEGORY_COLUMNS} FROM categories ORDER BY id').fetchall() == categories_before
    print('0013 data preservation: OK')


def test_every_new_column_starts_null():
    con = migrated()
    assert con.execute('SELECT COUNT(*) FROM categories WHERE parent_category_id IS NOT NULL').fetchone()[0] == 0
    for table in ('transactions', 'recurring_transactions', 'recurring_occurrences'):
        assert con.execute(f'SELECT COUNT(*) FROM {table} WHERE subcategory_id IS NOT NULL').fetchone()[0] == 0
    print('0013 new columns default to NULL: OK')


def test_root_name_uniqueness_survives_the_null_parent():
    con = migrated()
    try:
        con.execute(
            f'INSERT INTO categories ({CATEGORY_COLUMNS}) VALUES (?,?,?,?,?,?,?,?)',
            ('dup', 'hogar', 'expense', 'other', 0, None, UTC, UTC),
        )
        raise AssertionError('a duplicate root category name was accepted')
    except sqlite3.IntegrityError:
        pass
    # Archived rows sit outside the partial index, exactly as before.
    con.execute(
        f'INSERT INTO categories ({CATEGORY_COLUMNS}) VALUES (?,?,?,?,?,?,?,?)',
        ('dup_archived', 'Hogar', 'expense', 'other', 1, UTC, UTC, UTC),
    )
    print('0013 root name uniqueness: OK')


def test_same_subcategory_name_under_different_parents():
    con = migrated()
    add_sub(con, 'home_other', 'Otros', 'home')
    add_sub(con, 'transport_other', 'Otros', 'transport')
    try:
        add_sub(con, 'home_other_dup', 'otros', 'home')
        raise AssertionError('a duplicate subcategory name under one parent was accepted')
    except sqlite3.IntegrityError:
        pass
    print('0013 parent-scoped subcategory names: OK')


def test_depth_is_capped_at_two_levels():
    con = migrated()
    add_sub(con, 'market', 'Mercado', 'home')
    for message, action in [
        ('a third level was accepted', lambda: add_sub(con, 'deep', 'Deeper', 'market')),
        ('a self-parent was accepted', lambda: con.execute(
            f'INSERT INTO categories ({CATEGORY_COLUMNS},parent_category_id) VALUES (?,?,?,?,?,?,?,?,?)',
            ('self', 'Self', 'expense', 'other', 0, None, UTC, UTC, 'self'))),
        ('a parent with children became a child', lambda: con.execute(
            "UPDATE categories SET parent_category_id='transport' WHERE id='home'")),
    ]:
        try:
            action()
            raise AssertionError(message)
        except sqlite3.IntegrityError:
            pass
    print('0013 two-level depth guard: OK')


def test_subcategory_inherits_parent_type():
    con = migrated()
    try:
        add_sub(con, 'wrong', 'Wrong', 'home', kind='income')
        raise AssertionError('a subcategory with a different type was accepted')
    except sqlite3.IntegrityError:
        pass
    print('0013 subcategory type inheritance: OK')


def test_transaction_subcategory_must_belong_to_its_category():
    con = migrated()
    add_sub(con, 'market', 'Mercado', 'home')
    con.execute(
        'INSERT INTO transactions (id,type,status,amount,currency,account_id,destination_account_id,category_id,subcategory_id,original_transaction_id,note,transaction_date,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
        ('ok1', 'expense', 'posted', 10000, 'COP', 'checking', None, 'home', 'market', None, None, '2026-07-12', UTC, UTC),
    )
    try:
        con.execute(
            'INSERT INTO transactions (id,type,status,amount,currency,account_id,destination_account_id,category_id,subcategory_id,original_transaction_id,note,transaction_date,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
            ('bad1', 'expense', 'posted', 10000, 'COP', 'checking', None, 'transport', 'market', None, None, '2026-07-12', UTC, UTC),
        )
        raise AssertionError('Transporte + Mercado was accepted')
    except sqlite3.IntegrityError:
        pass
    # The same guard runs on update.
    try:
        con.execute("UPDATE transactions SET category_id='transport' WHERE id='ok1'")
        raise AssertionError('moving the parent away from the subcategory was accepted')
    except sqlite3.IntegrityError:
        pass
    print('0013 transaction parent consistency: OK')


def test_transfers_and_refunds_cannot_carry_a_subcategory():
    con = migrated()
    add_sub(con, 'market', 'Mercado', 'home')
    for tx_id, kind, dest, original in [
        ('xfer_bad', 'transfer', 'savings', None),
        ('ref_bad', 'refund', None, 'exp1'),
    ]:
        try:
            con.execute(
                'INSERT INTO transactions (id,type,status,amount,currency,account_id,destination_account_id,category_id,subcategory_id,original_transaction_id,note,transaction_date,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
                (tx_id, kind, 'posted', 10000, 'COP', 'checking', dest, None, 'market', original, None, '2026-07-12', UTC, UTC),
            )
            raise AssertionError(f'a {kind} with a subcategory was accepted')
        except sqlite3.IntegrityError:
            pass
    print('0013 transfers/refunds carry no subcategory: OK')


def test_referenced_categories_cannot_be_deleted():
    con = migrated()
    add_sub(con, 'market', 'Mercado', 'home')
    con.execute(
        'INSERT INTO transactions (id,type,status,amount,currency,account_id,destination_account_id,category_id,subcategory_id,original_transaction_id,note,transaction_date,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
        ('sub_tx', 'expense', 'posted', 10000, 'COP', 'checking', None, 'home', 'market', None, None, '2026-07-12', UTC, UTC),
    )
    con.commit()
    for message, category_id in [
        ('a parent with children was deleted', 'home'),
        ('a subcategory in use was deleted', 'market'),
    ]:
        try:
            con.execute('DELETE FROM categories WHERE id=?', (category_id,))
            con.commit()
            raise AssertionError(message)
        except sqlite3.IntegrityError:
            con.rollback()
    print('0013 delete restrictions: OK')


def test_parent_totals_still_include_subcategory_spending():
    con = migrated()
    add_sub(con, 'market', 'Mercado', 'home')
    con.execute(
        'INSERT INTO transactions (id,type,status,amount,currency,account_id,destination_account_id,category_id,subcategory_id,original_transaction_id,note,transaction_date,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
        ('sub_tx', 'expense', 'posted', 200000, 'COP', 'checking', None, 'home', 'market', None, None, '2026-07-12', UTC, UTC),
    )
    # exp1 300000 - ref1 50000 + sub_tx 200000
    assert con.execute(BUDGET_SQL).fetchone()[0] == 450000
    breakdown = con.execute('''
        SELECT COALESCE(subcategory_id, '<none>'), SUM(amount) FROM transactions
        WHERE status='posted' AND type='expense' AND category_id='home'
        GROUP BY COALESCE(subcategory_id, '<none>') ORDER BY 1
    ''').fetchall()
    assert breakdown == [('<none>', 300000), ('market', 200000)]
    print('0013 parent totals include subcategories: OK')


if __name__ == '__main__':
    for name, function in sorted(globals().items()):
        if name.startswith('test_'):
            function()
    print('category subcategories migration: ALL OK')
