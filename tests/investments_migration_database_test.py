"""Migration 0012 (Investments v1) integrity and data-preservation tests.

Applies migrations 0000-0011 to build a populated pre-investments database covering
every record type (accounts of each type, income, expense, transfer, refund, voided
transaction, recurring rule + occurrence, credit card + statement, archived account),
then applies 0012 and asserts that:
  - all existing data is preserved exactly (IDs, amounts, relationships, archived and
    voided state, refund link);
  - derived balances, report totals, and budget spend are numerically identical;
  - the new investment_accounts / investment_valuations tables exist and are empty;
  - a type='investment' account plus its metadata and a valuation are now insertable;
  - the investment CHECK constraints (type, tracking_mode, liquidity, currency, value,
    maturity/start ordering, one valuation per account+date) are enforced;
  - an unknown account type is still rejected;
  - PRAGMA foreign_key_check and integrity_check are clean.
"""
import sqlite3
from pathlib import Path

MIGRATION_DIR = Path(__file__).parents[1] / 'src' / 'database' / 'migrations'
MIGRATIONS = sorted(MIGRATION_DIR.glob('*.sql'))
PRE = [m for m in MIGRATIONS if m.name != '0012_investments_v1.sql']
V0012 = MIGRATION_DIR / '0012_investments_v1.sql'
UTC = '2026-07-12T12:00:00.000Z'


def apply(con, files):
    for f in files:
        con.executescript(f.read_text(encoding='utf-8').replace('--> statement-breakpoint', ''))


def new_con():
    con = sqlite3.connect(':memory:')
    con.execute('PRAGMA foreign_keys = ON')
    return con


def seed_pre_investments(con):
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
    con.execute("INSERT INTO categories (id,name,type,icon,is_archived,archived_at,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)", ('salary', 'Salary', 'income', None, 0, None, UTC, UTC))
    con.execute("INSERT INTO categories (id,name,type,icon,is_archived,archived_at,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)", ('food', 'Food', 'expense', None, 0, None, UTC, UTC))
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
  AND COALESCE(r.category_id, o.category_id)='food'
'''


def test_populated_migration_preserves_everything():
    con = new_con()
    seed_pre_investments(con)
    balances_before = con.execute(BALANCE_SQL).fetchall()
    report_before = con.execute(REPORT_SQL).fetchone()
    budget_before = con.execute(BUDGET_SQL).fetchone()

    apply(con, [V0012])

    assert con.execute('PRAGMA foreign_key_check').fetchall() == []
    assert con.execute('PRAGMA integrity_check').fetchone()[0] == 'ok'

    # Every account preserved, including the archived cash account.
    assert con.execute('SELECT COUNT(*) FROM accounts').fetchone()[0] == 4
    assert con.execute("SELECT opening_balance FROM accounts WHERE id='card'").fetchone()[0] == -1000000
    assert con.execute("SELECT is_archived, archived_at FROM accounts WHERE id='old'").fetchone() == (1, UTC)

    # Transactions preserved; voided still voided; refund link intact.
    assert con.execute('SELECT COUNT(*) FROM transactions').fetchone()[0] == 7
    assert con.execute("SELECT status FROM transactions WHERE id='inc_void'").fetchone()[0] == 'voided'
    assert con.execute("SELECT original_transaction_id FROM transactions WHERE id='ref1'").fetchone()[0] == 'exp1'

    # Statement, recurring rule, and occurrence preserved.
    assert con.execute("SELECT statement_balance, minimum_payment FROM credit_card_statements WHERE id='stmt1'").fetchone() == (1150000, 100000)
    assert con.execute("SELECT amount FROM recurring_transactions WHERE id='rule1'").fetchone()[0] == 80000
    assert con.execute("SELECT status, amount FROM recurring_occurrences WHERE id='occ1'").fetchone() == ('pending', 80000)

    # New investment tables exist and are empty; no investment rows invented.
    assert con.execute('SELECT COUNT(*) FROM investment_accounts').fetchone()[0] == 0
    assert con.execute('SELECT COUNT(*) FROM investment_valuations').fetchone()[0] == 0

    # Derived totals unchanged.
    assert con.execute(BALANCE_SQL).fetchall() == balances_before
    assert con.execute(REPORT_SQL).fetchone() == report_before
    assert con.execute(BUDGET_SQL).fetchone() == budget_before
    print('populated migration preserves everything: OK', report_before, budget_before)


def test_investment_account_and_valuation_insertable():
    con = new_con()
    apply(con, MIGRATIONS)
    # A COP CDT and a USD brokerage are now valid accounts.
    con.executemany(
        'INSERT INTO accounts (id,name,type,currency,opening_balance,credit_limit,statement_closing_day,payment_due_day,is_archived,archived_at,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
        [
            ('cdt', 'CDT Bancolombia', 'investment', 'COP', 10000000, None, None, None, 0, None, UTC, UTC),
            ('ibkr', 'Interactive Brokers', 'investment', 'USD', 0, None, None, None, 0, None, UTC, UTC),
        ],
    )
    con.execute(
        'INSERT INTO investment_accounts (account_id,investment_type,tracking_mode,liquidity,provider_name,start_date,maturity_date,note,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)',
        ('cdt', 'fixed_term_deposit', 'balance', 'locked', 'Bancolombia', '2026-01-15', '2027-01-15', None, UTC, UTC),
    )
    con.execute(
        'INSERT INTO investment_accounts (account_id,investment_type,tracking_mode,liquidity,provider_name,start_date,maturity_date,note,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)',
        ('ibkr', 'brokerage', 'balance', 'liquid', 'IBKR', None, None, None, UTC, UTC),
    )
    # A USD valuation on IBKR (value in native minor units, basis snapshot).
    con.execute(
        'INSERT INTO investment_valuations (id,investment_account_id,value_minor,basis_minor,currency_code,valuation_date,note,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)',
        ('val1', 'ibkr', 1250000, 1000000, 'USD', '2026-03-31', None, UTC, UTC),
    )
    con.commit()

    assert con.execute('PRAGMA foreign_key_check').fetchall() == []
    assert con.execute('PRAGMA integrity_check').fetchone()[0] == 'ok'
    assert con.execute("SELECT investment_type, liquidity FROM investment_accounts WHERE account_id='cdt'").fetchone() == ('fixed_term_deposit', 'locked')
    assert con.execute("SELECT value_minor, basis_minor, currency_code FROM investment_valuations WHERE id='val1'").fetchone() == (1250000, 1000000, 'USD')
    print('investment account + valuation insertable: OK')


def _rejects(con, sql, params, label):
    try:
        con.execute(sql, params)
        con.commit()
        raise AssertionError(f'{label} should be rejected')
    except sqlite3.IntegrityError:
        con.rollback()


def test_investment_constraints_enforced():
    con = new_con()
    apply(con, MIGRATIONS)
    con.execute(
        'INSERT INTO accounts (id,name,type,currency,opening_balance,credit_limit,statement_closing_day,payment_due_day,is_archived,archived_at,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
        ('inv', 'Fondo', 'investment', 'COP', 0, None, None, None, 0, None, UTC, UTC),
    )
    con.commit()

    IA = 'INSERT INTO investment_accounts (account_id,investment_type,tracking_mode,liquidity,provider_name,start_date,maturity_date,note,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)'
    # Unknown investment type.
    _rejects(con, IA, ('inv', 'crypto', 'balance', 'liquid', None, None, None, None, UTC, UTC), 'unknown investment_type')
    # holdings tracking mode is reserved for v2, not yet allowed.
    _rejects(con, IA, ('inv', 'brokerage', 'holdings', 'liquid', None, None, None, None, UTC, UTC), 'holdings tracking_mode')
    # Unknown liquidity.
    _rejects(con, IA, ('inv', 'brokerage', 'balance', 'semi', None, None, None, None, UTC, UTC), 'unknown liquidity')
    # Maturity before start.
    _rejects(con, IA, ('inv', 'fixed_term_deposit', 'balance', 'locked', None, '2027-01-15', '2026-01-15', None, UTC, UTC), 'maturity before start')

    # Now a valid metadata row so valuation FK/constraints can be exercised.
    con.execute(IA, ('inv', 'investment_fund', 'balance', 'restricted', None, None, None, None, UTC, UTC))
    con.commit()

    IV = 'INSERT INTO investment_valuations (id,investment_account_id,value_minor,basis_minor,currency_code,valuation_date,note,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)'
    # Unsupported currency.
    _rejects(con, IV, ('bad1', 'inv', 1000, 0, 'EUR', '2026-03-31', None, UTC, UTC), 'unsupported valuation currency')
    # Negative value.
    _rejects(con, IV, ('bad2', 'inv', -1, 0, 'COP', '2026-03-31', None, UTC, UTC), 'negative value')
    # Orphan investment account reference.
    _rejects(con, IV, ('bad3', 'ghost', 1000, 0, 'COP', '2026-03-31', None, UTC, UTC), 'orphan valuation')

    # One valuation per account per date.
    con.execute(IV, ('v1', 'inv', 1000, 0, 'COP', '2026-03-31', None, UTC, UTC))
    con.commit()
    _rejects(con, IV, ('v2', 'inv', 2000, 0, 'COP', '2026-03-31', None, UTC, UTC), 'duplicate account+date valuation')
    print('investment constraints enforced: OK')


def test_unknown_account_type_still_rejected():
    con = new_con()
    apply(con, MIGRATIONS)
    _rejects(
        con,
        'INSERT INTO accounts (id,name,type,currency,opening_balance,credit_limit,statement_closing_day,payment_due_day,is_archived,archived_at,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
        ('x', 'Mystery', 'crypto', 'COP', 0, None, None, None, 0, None, UTC, UTC),
        'unknown account type',
    )
    print('unknown account type still rejected: OK')


if __name__ == '__main__':
    test_populated_migration_preserves_everything()
    test_investment_account_and_valuation_insertable()
    test_investment_constraints_enforced()
    test_unknown_account_type_still_rejected()
    print('All migration 0012 tests passed.')
