"""Real-SQLite coverage for the Investments-in-Reports queries (phase 4).

Applies the full migration chain and verifies, against the actual engine, the two
SQL shapes the report repository uses:
  - realized investment income: posted income within the period whose account is an
    investment account OR whose category is the seeded Investment Income category
    (voided rows and unrelated income excluded, no double counting);
  - the investment valuation series: value_minor - basis_minor per valuation,
    scoped to investment accounts and ordered by account then date.
"""
import sqlite3
from pathlib import Path

MIGRATION_DIR = Path(__file__).parents[1] / 'src' / 'database' / 'migrations'
MIGRATIONS = sorted(MIGRATION_DIR.glob('*.sql'))
UTC = '2026-07-12T12:00:00.000Z'

INCOME_SQL = '''
SELECT coalesce(sum(coalesce(t.base_amount_minor, t.amount)), 0), count(*)
FROM transactions t JOIN accounts a ON a.id = t.account_id
WHERE t.status = 'posted' AND t.type = 'income'
  AND t.transaction_date BETWEEN ? AND ?
  AND (a.type = 'investment' OR t.category_id = 'default-income-investment')
'''

SERIES_SQL = '''
SELECT iv.investment_account_id, iv.currency_code, iv.valuation_date,
       iv.value_minor - iv.basis_minor
FROM investment_valuations iv JOIN accounts a ON a.id = iv.investment_account_id
WHERE a.type = 'investment'
ORDER BY iv.investment_account_id, iv.valuation_date
'''


def new_con():
    con = sqlite3.connect(':memory:')
    con.execute('PRAGMA foreign_keys = ON')
    for f in MIGRATIONS:
        con.executescript(f.read_text(encoding='utf-8').replace('--> statement-breakpoint', ''))
    return con


def seed(con):
    con.executemany(
        'INSERT INTO accounts (id,name,type,currency,opening_balance,credit_limit,statement_closing_day,payment_due_day,is_archived,archived_at,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
        [
            ('sav', 'Savings', 'savings', 'COP', 0, None, None, None, 0, None, UTC, UTC),
            ('cdt', 'CDT', 'investment', 'COP', 10000000, None, None, None, 0, None, UTC, UTC),
        ],
    )
    con.execute("INSERT INTO categories (id,name,type,icon,is_archived,archived_at,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)", ('salary', 'Salary', 'income', None, 0, None, UTC, UTC))
    con.execute("INSERT INTO categories (id,name,type,icon,is_archived,archived_at,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)", ('default-income-investment', 'Investment Income', 'income', 'investment', 0, None, UTC, UTC))
    con.executemany(
        'INSERT INTO transactions (id,type,status,amount,currency,account_id,destination_account_id,category_id,note,transaction_date,created_at,updated_at,base_currency_code) VALUES (?,?,?,?,?,?,?,?,?,?,?,?, CASE WHEN ?2 = \'transfer\' THEN NULL ELSE \'COP\' END)',
        [
            # Reinvested income into the investment account (counts: account is investment).
            ('i1', 'income', 'posted', 50000, 'COP', 'cdt', None, 'default-income-investment', None, '2026-07-10', UTC, UTC),
            # CDT interest received in the bank, tagged Investment Income (counts: category).
            ('i2', 'income', 'posted', 1050000, 'COP', 'sav', None, 'default-income-investment', None, '2026-07-15', UTC, UTC),
            # Ordinary salary income (excluded).
            ('i3', 'income', 'posted', 2000000, 'COP', 'sav', None, 'salary', None, '2026-07-16', UTC, UTC),
            # Income into the investment account with an unrelated category (counts: account).
            ('i4', 'income', 'posted', 30000, 'COP', 'cdt', None, 'salary', None, '2026-07-18', UTC, UTC),
            # Voided investment income (excluded).
            ('i5', 'income', 'voided', 999999, 'COP', 'cdt', None, 'default-income-investment', None, '2026-07-19', UTC, UTC),
            # Outside the period (excluded).
            ('i6', 'income', 'posted', 500000, 'COP', 'cdt', None, 'default-income-investment', None, '2026-08-02', UTC, UTC),
        ],
    )
    con.executemany(
        'INSERT INTO investment_valuations (id,investment_account_id,value_minor,basis_minor,currency_code,valuation_date,note,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)',
        [
            ('v1', 'cdt', 10000000, 10000000, 'COP', '2026-06-30', None, UTC, UTC),
            ('v2', 'cdt', 10500000, 10000000, 'COP', '2026-07-31', None, UTC, UTC),
        ],
    )
    con.commit()


def test_realized_investment_income():
    con = new_con()
    seed(con)
    total, count = con.execute(INCOME_SQL, ('2026-07-01', '2026-07-31')).fetchone()
    # i1 (50,000) + i2 (1,050,000) + i4 (30,000); salary, voided, and out-of-period excluded.
    assert (total, count) == (1130000, 3), (total, count)
    print('realized investment income: OK', total, count)


def test_investment_valuation_series():
    con = new_con()
    seed(con)
    rows = con.execute(SERIES_SQL).fetchall()
    assert rows == [
        ('cdt', 'COP', '2026-06-30', 0),
        ('cdt', 'COP', '2026-07-31', 500000),
    ], rows
    print('investment valuation series: OK')


if __name__ == '__main__':
    test_realized_investment_income()
    test_investment_valuation_series()
    print('All investments-in-reports database tests passed.')
