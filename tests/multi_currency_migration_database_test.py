"""Migration 0009 (Multi-Currency v1) integrity and data-preservation tests.

Applies migrations 0000-0008 to build a populated pre-multi-currency database
covering every record type (accounts, income, expense, transfer, refund, recurring
rule + occurrence, credit card + statement, archived account, voided transaction),
then applies 0009 and asserts that:
  - all existing COP data is preserved exactly (IDs, amounts, relationships);
  - base_amount_minor == amount for income/expense/refund;
  - transfers migrate as same-currency COP transfers with a COP destination leg;
  - no exchange-rate snapshots are invented;
  - report and budget totals are numerically identical;
  - USD accounts/transactions are now insertable while EUR is rejected;
  - PRAGMA foreign_key_check and integrity_check are clean.
"""
import sqlite3
from pathlib import Path

MIGRATION_DIR = Path(__file__).parents[1] / 'src' / 'database' / 'migrations'
MIGRATIONS = sorted(MIGRATION_DIR.glob('*.sql'))
# Migrations 0000-0008 build the pre-multi-currency database. Selecting by "before
# 0009" (rather than "all except 0009") keeps later migrations that depend on 0009's
# columns from being applied ahead of it as the chain grows.
PRE = [m for m in MIGRATIONS if m.name < '0009']
V0009 = MIGRATION_DIR / '0009_multi_currency.sql'
UTC = '2026-07-12T12:00:00.000Z'


def apply(con, files):
    for f in files:
        con.executescript(f.read_text(encoding='utf-8').replace('--> statement-breakpoint', ''))


def new_con():
    con = sqlite3.connect(':memory:')
    con.execute('PRAGMA foreign_keys = ON')
    return con


def seed_pre_multicurrency(con):
    apply(con, PRE)
    con.executemany(
        'INSERT INTO accounts (id,name,type,currency,opening_balance,credit_limit,statement_closing_day,payment_due_day,is_archived,archived_at,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
        [
            ('checking', 'Checking', 'checking', 'COP', 3000000, None, None, None, 0, None, UTC, UTC),
            ('savings', 'Savings', 'savings', 'COP', 5000000, None, None, None, 0, None, UTC, UTC),
            ('card', 'Visa', 'credit_card', 'COP', -1000000, 5000000, 15, 5, 0, None, UTC, UTC),
            ('old', 'Old Wallet', 'cash', 'COP', 20000, None, None, None, 1, UTC, UTC, UTC),
        ],
    )
    con.execute("INSERT INTO categories VALUES (?,?,?,?,?,?,?,?)", ('salary', 'Salary', 'income', None, 0, None, UTC, UTC))
    con.execute("INSERT INTO categories VALUES (?,?,?,?,?,?,?,?)", ('food', 'Food', 'expense', None, 0, None, UTC, UTC))
    con.executemany(
        'INSERT INTO transactions (id,type,status,amount,currency,account_id,destination_account_id,category_id,original_transaction_id,note,transaction_date,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)',
        [
            ('inc1', 'income', 'posted', 2000000, 'COP', 'checking', None, 'salary', None, None, '2026-07-05', UTC, UTC),
            ('exp1', 'expense', 'posted', 300000, 'COP', 'checking', None, 'food', None, 'groceries', '2026-07-06', UTC, UTC),
            ('exp2', 'expense', 'posted', 150000, 'COP', 'card', None, 'food', None, None, '2026-07-07', UTC, UTC),
            ('inc_void', 'income', 'voided', 999999, 'COP', 'checking', None, 'salary', None, None, '2026-07-08', UTC, UTC),
            ('xfer1', 'transfer', 'posted', 500000, 'COP', 'checking', 'savings', None, None, None, '2026-07-09', UTC, UTC),
            ('pay1', 'transfer', 'posted', 400000, 'COP', 'checking', 'card', None, None, 'card payment', '2026-07-10', UTC, UTC),
            ('ref1', 'refund', 'posted', 50000, 'COP', 'checking', None, None, 'exp1', 'partial refund', '2026-07-11', UTC, UTC),
        ],
    )
    con.execute(
        'INSERT INTO credit_card_statements (id,account_id,period_start,period_end,closing_date,due_date,statement_balance,minimum_payment,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)',
        ('stmt1', 'card', '2026-06-16', '2026-07-15', '2026-07-15', '2026-08-05', 1150000, 100000, UTC, UTC),
    )
    con.execute(
        'INSERT INTO recurring_transactions (id,type,amount,currency,account_id,destination_account_id,category_id,note,frequency,interval,start_date,next_occurrence_date,end_date,is_active,ended_at,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
        ('rule1', 'expense', 80000, 'COP', 'checking', None, 'food', None, 'monthly', 1, '2026-07-01', '2026-08-01', None, 1, None, UTC, UTC),
    )
    con.execute(
        'INSERT INTO recurring_occurrences (id,recurring_transaction_id,scheduled_date,status,type,amount,currency,account_id,destination_account_id,category_id,note,transaction_id,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
        ('occ1', 'rule1', '2026-07-01', 'pending', 'expense', 80000, 'COP', 'checking', None, 'food', None, None, UTC, UTC),
    )
    con.commit()


BALANCE_SQL = '''
SELECT a.id, a.opening_balance + COALESCE(SUM(CASE
  WHEN t.status <> 'posted' THEN 0
  WHEN t.type='income'   AND t.account_id=a.id THEN t.amount
  WHEN t.type='expense'  AND t.account_id=a.id THEN -t.amount
  WHEN t.type='refund'   AND t.account_id=a.id THEN t.amount
  WHEN t.type='transfer' AND t.account_id=a.id THEN -t.amount
  WHEN t.type='transfer' AND t.destination_account_id=a.id THEN t.amount
  ELSE 0 END), 0)
FROM accounts a
LEFT JOIN transactions t ON (t.account_id=a.id OR t.destination_account_id=a.id)
GROUP BY a.id ORDER BY a.id
'''

REPORT_SQL = '''
SELECT
  COALESCE(SUM(CASE WHEN type='income'  THEN amount ELSE 0 END),0),
  COALESCE(SUM(CASE WHEN type='expense' THEN amount ELSE 0 END),0),
  COALESCE(SUM(CASE WHEN type='refund'  THEN amount ELSE 0 END),0)
FROM transactions WHERE status='posted'
'''

# Budget-style spend for category 'food' in July (expense minus refund via original attribution)
BUDGET_SQL = '''
SELECT COALESCE(SUM(CASE
  WHEN r.type='expense' THEN r.amount
  WHEN r.type='refund'  THEN -r.amount ELSE 0 END),0)
FROM transactions r LEFT JOIN transactions o ON r.original_transaction_id=o.id
WHERE r.status='posted' AND r.transaction_date>='2026-07-01' AND r.transaction_date<'2026-08-01'
  AND COALESCE(r.category_id, o.category_id)='food'
'''


def test_populated_migration_preserves_everything():
    con = new_con()
    seed_pre_multicurrency(con)
    balances_before = con.execute(BALANCE_SQL).fetchall()
    report_before = con.execute(REPORT_SQL).fetchone()
    budget_before = con.execute(BUDGET_SQL).fetchone()

    apply(con, [V0009])

    assert con.execute('PRAGMA foreign_key_check').fetchall() == []
    assert con.execute('PRAGMA integrity_check').fetchone()[0] == 'ok'

    # Every account preserved and COP.
    assert con.execute('SELECT COUNT(*) FROM accounts').fetchone()[0] == 4
    assert con.execute("SELECT COUNT(*) FROM accounts WHERE currency='COP'").fetchone()[0] == 4
    assert con.execute("SELECT opening_balance FROM accounts WHERE id='card'").fetchone()[0] == -1000000
    assert con.execute("SELECT is_archived, archived_at FROM accounts WHERE id='old'").fetchone() == (1, UTC)

    # Transactions preserved; base amounts and transfer legs backfilled.
    assert con.execute('SELECT COUNT(*) FROM transactions').fetchone()[0] == 7
    for tid in ('inc1', 'exp1', 'exp2', 'ref1'):
        amount, base = con.execute('SELECT amount, base_amount_minor FROM transactions WHERE id=?', (tid,)).fetchone()
        assert base == amount, f'{tid} base_amount_minor should equal amount'
        assert con.execute('SELECT exchange_rate_scaled FROM transactions WHERE id=?', (tid,)).fetchone()[0] is None
    for tid in ('xfer1', 'pay1'):
        amount, dest, destccy, base = con.execute(
            'SELECT amount, destination_amount_minor, destination_currency_code, base_amount_minor FROM transactions WHERE id=?', (tid,)
        ).fetchone()
        assert dest == amount and destccy == 'COP' and base is None, f'{tid} transfer legs wrong'
    # Voided income preserved and still excluded by status.
    assert con.execute("SELECT status FROM transactions WHERE id='inc_void'").fetchone()[0] == 'voided'
    # Refund link preserved.
    assert con.execute("SELECT original_transaction_id FROM transactions WHERE id='ref1'").fetchone()[0] == 'exp1'

    # Statement, recurring rule, and occurrence preserved.
    assert con.execute("SELECT statement_balance, minimum_payment FROM credit_card_statements WHERE id='stmt1'").fetchone() == (1150000, 100000)
    assert con.execute("SELECT amount, currency FROM recurring_transactions WHERE id='rule1'").fetchone() == (80000, 'COP')
    assert con.execute("SELECT status, amount FROM recurring_occurrences WHERE id='occ1'").fetchone() == ('pending', 80000)

    # No invented exchange rates.
    assert con.execute('SELECT COUNT(*) FROM exchange_rates').fetchone()[0] == 0

    # Derived totals unchanged.
    assert con.execute(BALANCE_SQL).fetchall() == balances_before
    assert con.execute(REPORT_SQL).fetchone() == report_before
    assert con.execute(BUDGET_SQL).fetchone() == budget_before
    print('populated migration preserves everything: OK', report_before, budget_before)


def test_usd_allowed_and_eur_rejected_after_migration():
    con = new_con()
    apply(con, MIGRATIONS)
    con.execute("INSERT INTO categories VALUES (?,?,?,?,?,?,?,?)", ('salary', 'Salary', 'income', None, 0, None, UTC, UTC))
    # USD account now allowed.
    con.execute(
        'INSERT INTO accounts (id,name,type,currency,opening_balance,credit_limit,statement_closing_day,payment_due_day,is_archived,archived_at,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
        ('usd', 'USD Savings', 'savings', 'USD', 100050, None, None, None, 0, None, UTC, UTC),
    )
    # USD income requires a base COP snapshot + rate snapshot.
    con.execute(
        'INSERT INTO transactions (id,type,status,amount,currency,account_id,destination_account_id,category_id,original_transaction_id,base_amount_minor,exchange_rate_scaled,exchange_rate_scale,exchange_rate_date,exchange_rate_source,destination_amount_minor,destination_currency_code,note,transaction_date,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
        ('usdinc', 'income', 'posted', 50025, 'USD', 'usd', None, 'salary', None, 2051025, 41000000, 10000, '2026-07-12', 'frankfurter', None, None, None, '2026-07-12', UTC, UTC),
    )
    assert con.execute("SELECT base_amount_minor FROM transactions WHERE id='usdinc'").fetchone()[0] == 2051025

    # EUR still rejected by CHECK.
    try:
        con.execute(
            'INSERT INTO accounts (id,name,type,currency,opening_balance,credit_limit,statement_closing_day,payment_due_day,is_archived,archived_at,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
            ('eur', 'Euro', 'savings', 'EUR', 0, None, None, None, 0, None, UTC, UTC),
        )
        raise AssertionError('EUR account should be rejected')
    except sqlite3.IntegrityError:
        pass

    # A USD income without a rate snapshot must be rejected.
    try:
        con.execute(
            'INSERT INTO transactions (id,type,status,amount,currency,account_id,destination_account_id,category_id,original_transaction_id,base_amount_minor,destination_amount_minor,destination_currency_code,note,transaction_date,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
            ('bad', 'income', 'posted', 100, 'USD', 'usd', None, 'salary', None, 400000, None, None, None, '2026-07-12', UTC, UTC),
        )
        raise AssertionError('USD income without rate snapshot should be rejected')
    except sqlite3.IntegrityError:
        pass
    print('USD allowed, EUR + rateless USD rejected: OK')


def test_cross_currency_transfer_shape():
    con = new_con()
    apply(con, MIGRATIONS)
    con.executemany(
        'INSERT INTO accounts (id,name,type,currency,opening_balance,credit_limit,statement_closing_day,payment_due_day,is_archived,archived_at,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
        [
            ('cop', 'COP Checking', 'checking', 'COP', 10000000, None, None, None, 0, None, UTC, UTC),
            ('usd', 'USD Savings', 'savings', 'USD', 0, None, None, None, 0, None, UTC, UTC),
        ],
    )
    # COP 4,150,000 -> USD 1,000.00 with effective rate 4150.
    con.execute(
        'INSERT INTO transactions (id,type,status,amount,currency,account_id,destination_account_id,category_id,original_transaction_id,base_amount_minor,exchange_rate_scaled,exchange_rate_scale,exchange_rate_date,exchange_rate_source,destination_amount_minor,destination_currency_code,note,transaction_date,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
        ('xc', 'transfer', 'posted', 4150000, 'COP', 'cop', 'usd', None, None, None, 41500000, 10000, '2026-07-12', 'transfer_effective', 100000, 'USD', None, '2026-07-12', UTC, UTC),
    )
    row = con.execute("SELECT amount, currency, destination_amount_minor, destination_currency_code FROM transactions WHERE id='xc'").fetchone()
    assert row == (4150000, 'COP', 100000, 'USD')
    assert con.execute('PRAGMA foreign_key_check').fetchall() == []

    # A cross-currency transfer without an effective rate must be rejected.
    try:
        con.execute(
            'INSERT INTO transactions (id,type,status,amount,currency,account_id,destination_account_id,category_id,original_transaction_id,base_amount_minor,destination_amount_minor,destination_currency_code,note,transaction_date,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
            ('xc2', 'transfer', 'posted', 100000, 'COP', 'cop', 'usd', None, None, None, 20, 'USD', None, '2026-07-12', UTC, UTC),
        )
        raise AssertionError('cross-currency transfer without rate should be rejected')
    except sqlite3.IntegrityError:
        pass
    print('cross-currency transfer shape: OK')


def test_reports_and_budgets_use_cop_base_snapshot():
    con = new_con()
    apply(con, MIGRATIONS)
    con.execute("INSERT INTO categories VALUES (?,?,?,?,?,?,?,?)", ('food', 'Food', 'expense', None, 0, None, UTC, UTC))
    con.execute(
        'INSERT INTO accounts (id,name,type,currency,opening_balance,credit_limit,statement_closing_day,payment_due_day,is_archived,archived_at,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
        ('usd', 'USD', 'savings', 'USD', 0, None, None, None, 0, None, UTC, UTC),
    )
    # USD 25.00 expense with a COP base snapshot of 102,500.
    con.execute(
        'INSERT INTO transactions (id,type,status,amount,currency,account_id,destination_account_id,category_id,original_transaction_id,base_amount_minor,exchange_rate_scaled,exchange_rate_scale,exchange_rate_date,exchange_rate_source,destination_amount_minor,destination_currency_code,note,transaction_date,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
        ('usdexp', 'expense', 'posted', 2500, 'USD', 'usd', None, 'food', None, 102500, 41000000, 10000, '2026-07-12', 'frankfurter', None, None, None, '2026-07-12', UTC, UTC),
    )
    # Report-style gross expenses use the COP base snapshot, not the native amount.
    gross = con.execute(
        "SELECT coalesce(sum(case when type='expense' then coalesce(base_amount_minor, amount) else 0 end),0) FROM transactions WHERE status='posted'"
    ).fetchone()[0]
    assert gross == 102500, gross
    # Budget-style spend for the category also uses the COP base snapshot.
    spent = con.execute(
        """SELECT coalesce(sum(case when r.type='expense' then coalesce(r.base_amount_minor, r.amount)
                                    when r.type='refund' then -coalesce(r.base_amount_minor, r.amount) else 0 end),0)
             FROM transactions r LEFT JOIN transactions o ON r.original_transaction_id=o.id
            WHERE r.status='posted' AND coalesce(r.category_id, o.category_id)='food'"""
    ).fetchone()[0]
    assert spent == 102500, spent
    print('reports and budgets use COP base snapshot: OK')


if __name__ == '__main__':
    test_populated_migration_preserves_everything()
    test_usd_allowed_and_eur_rejected_after_migration()
    test_cross_currency_transfer_shape()
    test_reports_and_budgets_use_cop_base_snapshot()
    print('All migration 0009 tests passed.')
