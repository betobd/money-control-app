"""Migration 0014 (configurable base currency) integrity and data-preservation tests.

0014 rebuilds six tables to relax the closed `IN ('COP','USD')` currency CHECK into
a structural three-letter one, and adds `transactions.base_currency_code`. A
create-copy-swap of that size is exactly where a column, an index, a trigger or a
row quietly goes missing, so this applies 0000-0013 to a database populated with
every record type, applies 0014, and asserts that:
  - every row, ID, amount, date and relationship survives unchanged;
  - base_currency_code is backfilled to COP for non-transfers and NULL for transfers;
  - every index and trigger that existed before still exists and still fires;
  - a currency outside the old pair (EUR, JPY) is now accepted, and a malformed
    code (lowercase, two letters, four letters, empty) is still rejected;
  - the foreign-snapshot rule still rejects a foreign row with no rate snapshot,
    now stated against base_currency_code rather than a literal 'COP';
  - app_settings seeds COP when the install already has accounts, USD when empty;
  - PRAGMA foreign_key_check and integrity_check are clean.
"""
import sqlite3
from pathlib import Path

MIGRATION_DIR = Path(__file__).parents[1] / 'src' / 'database' / 'migrations'
MIGRATIONS = sorted(MIGRATION_DIR.glob('*.sql'))
# Selecting by "before 0014" rather than "all except 0014" keeps migrations added
# later from being applied ahead of it as the chain grows.
PRE = [m for m in MIGRATIONS if m.name < '0014']
V0014 = MIGRATION_DIR / '0014_configurable_base_currency.sql'
UTC = '2026-08-01T12:00:00.000Z'

REBUILT = [
    'accounts', 'transactions', 'transaction_splits', 'credit_card_statements',
    'investment_accounts', 'investment_valuations', 'recurring_transactions',
    'recurring_occurrences', 'exchange_rates',
]


def apply(con, files):
    for f in files:
        con.executescript(f.read_text(encoding='utf-8').replace('--> statement-breakpoint', ''))


def new_con():
    con = sqlite3.connect(':memory:')
    con.row_factory = sqlite3.Row
    con.execute('PRAGMA foreign_keys = ON')
    return con


def rejects(con, sql, params=()):
    """True when SQLite refuses the statement (constraint or trigger)."""
    try:
        con.execute(sql, params)
    except sqlite3.IntegrityError:
        con.rollback()
        return True
    con.rollback()
    return False


def seed(con):
    apply(con, PRE)
    con.executemany(
        'INSERT INTO accounts (id,name,type,currency,opening_balance,credit_limit,statement_closing_day,payment_due_day,is_archived,archived_at,created_at,updated_at)'
        ' VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
        [
            ('checking', 'Checking', 'checking', 'COP', 3_000_000, None, None, None, 0, None, UTC, UTC),
            ('savings_usd', 'USD Savings', 'savings', 'USD', 150_000, None, None, None, 0, None, UTC, UTC),
            ('card', 'Visa', 'credit_card', 'COP', -1_000_000, 5_000_000, 15, 5, 0, None, UTC, UTC),
            ('old', 'Old Wallet', 'cash', 'COP', 20_000, None, None, None, 1, UTC, UTC, UTC),
            ('broker', 'Broker', 'investment', 'USD', 0, None, None, None, 0, None, UTC, UTC),
        ],
    )
    con.executemany(
        'INSERT INTO categories (id,name,type,icon,is_archived,archived_at,created_at,updated_at) VALUES (?,?,?,?,0,NULL,?,?)',
        [('salary', 'Salary', 'income', None, UTC, UTC), ('home', 'Home', 'expense', None, UTC, UTC)],
    )
    con.execute(
        'INSERT INTO categories (id,name,type,icon,parent_category_id,is_archived,archived_at,created_at,updated_at)'
        " VALUES ('market','Market','expense',NULL,'home',0,NULL,?,?)", (UTC, UTC))

    rate = (41_023_456, 10_000)
    con.executemany(
        'INSERT INTO transactions (id,type,status,amount,currency,account_id,destination_account_id,category_id,subcategory_id,'
        'original_transaction_id,base_amount_minor,exchange_rate_scaled,exchange_rate_scale,exchange_rate_date,exchange_rate_source,'
        'destination_amount_minor,destination_currency_code,note,transaction_date,created_at,updated_at)'
        ' VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
        [
            # COP income, no rate snapshot (allowed: it is the base currency).
            ('inc1', 'income', 'posted', 2_000_000, 'COP', 'checking', None, 'salary', None, None,
             2_000_000, None, None, None, None, None, None, None, '2026-08-05', UTC, UTC),
            # COP expense against a subcategory.
            ('exp1', 'expense', 'posted', 300_000, 'COP', 'checking', None, 'home', 'market', None,
             300_000, None, None, None, None, None, None, 'groceries', '2026-08-06', UTC, UTC),
            # USD expense: carries a full rate snapshot.
            ('exp_usd', 'expense', 'posted', 4_999, 'USD', 'savings_usd', None, 'home', None, None,
             205_076, rate[0], rate[1], '2026-08-07', 'frankfurter', None, None, None, '2026-08-07', UTC, UTC),
            ('inc_void', 'income', 'voided', 999_999, 'COP', 'checking', None, 'salary', None, None,
             999_999, None, None, None, None, None, None, None, '2026-08-08', UTC, UTC),
            # Same-currency transfer.
            ('xfer1', 'transfer', 'posted', 500_000, 'COP', 'checking', 'card', None, None, None,
             None, None, None, None, None, 500_000, 'COP', 'card payment', '2026-08-09', UTC, UTC),
            # Cross-currency transfer: both legs authoritative.
            ('xfer_fx', 'transfer', 'posted', 400_000, 'COP', 'checking', 'savings_usd', None, None, None,
             None, rate[0], rate[1], '2026-08-10', 'transfer_effective', 9_750, 'USD', None, '2026-08-10', UTC, UTC),
            # Refund of the COP expense (self-referencing row).
            ('ref1', 'refund', 'posted', 50_000, 'COP', 'checking', None, None, None, 'exp1',
             50_000, None, None, None, None, None, None, None, '2026-08-11', UTC, UTC),
        ],
    )
    con.execute(
        'INSERT INTO transaction_splits (id,transaction_id,account_id,amount,position)'
        " VALUES ('sp1','xfer1','checking',500000,0)")
    con.execute(
        'INSERT INTO credit_card_statements (id,account_id,period_start,period_end,closing_date,due_date,statement_balance,minimum_payment,created_at,updated_at)'
        " VALUES ('st1','card','2026-07-16','2026-08-15','2026-08-15','2026-09-05',900000,90000,?,?)", (UTC, UTC))
    con.execute(
        'INSERT INTO investment_accounts (account_id,investment_type,tracking_mode,liquidity,provider_name,start_date,maturity_date,note,created_at,updated_at)'
        " VALUES ('broker','brokerage','balance','liquid','Broker Inc','2026-01-05',NULL,NULL,?,?)", (UTC, UTC))
    con.execute(
        'INSERT INTO investment_valuations (id,investment_account_id,value_minor,basis_minor,currency_code,valuation_date,note,created_at,updated_at)'
        " VALUES ('val1','broker',175000,150000,'USD','2026-08-12',NULL,?,?)", (UTC, UTC))
    con.execute(
        'INSERT INTO exchange_rates (id,base_currency_code,quote_currency_code,rate_scaled,rate_scale,effective_date,fetched_at,provider,source,created_at,updated_at)'
        " VALUES ('USD-COP','USD','COP',?,?,'2026-08-12',?,'frankfurter','frankfurter',?,?)", (rate[0], rate[1], UTC, UTC, UTC))
    con.executemany(
        'INSERT INTO recurring_transactions (id,type,amount,currency,account_id,destination_account_id,category_id,subcategory_id,note,'
        'frequency,interval,start_date,next_occurrence_date,end_date,is_active,ended_at,created_at,updated_at)'
        ' VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
        [('rule1', 'expense', 120_000, 'COP', 'checking', None, 'home', 'market', 'rent',
          'monthly', 1, '2026-08-01', '2026-09-01', None, 1, None, UTC, UTC)],
    )
    con.execute(
        'INSERT INTO recurring_occurrences (id,recurring_transaction_id,scheduled_date,status,type,amount,currency,account_id,'
        'destination_account_id,category_id,subcategory_id,note,transaction_id,created_at,updated_at)'
        " VALUES ('occ1','rule1','2026-08-01','pending','expense',120000,'COP','checking',NULL,'home','market','rent',NULL,?,?)", (UTC, UTC))
    con.execute(
        'INSERT INTO budgets (id,category_id,month,limit_amount,color,rule_id,created_at,updated_at)'
        " VALUES ('bud1','home','2026-08',900000,NULL,NULL,?,?)", (UTC, UTC))
    con.commit()


def snapshot(con):
    """Everything that must survive the rebuild, keyed by table."""
    state = {}
    for table in REBUILT + ['categories', 'budgets']:
        rows = con.execute(f'SELECT * FROM "{table}" ORDER BY rowid').fetchall()
        state[table] = [dict(r) for r in rows]
    state['__indexes'] = sorted(
        r['name'] for r in con.execute("SELECT name FROM sqlite_master WHERE type='index' AND sql IS NOT NULL"))
    state['__triggers'] = sorted(
        r['name'] for r in con.execute("SELECT name FROM sqlite_master WHERE type='trigger'"))
    return state


con = new_con()
seed(con)
before = snapshot(con)
apply(con, [V0014])
after = snapshot(con)

# 1. Every row survives, byte for byte, except the one column 0014 adds.
for table in REBUILT + ['categories', 'budgets']:
    assert len(before[table]) == len(after[table]), f'{table}: row count changed'
    for old, new in zip(before[table], after[table]):
        for column, value in old.items():
            assert new[column] == value, f'{table}.{column}: {value!r} -> {new[column]!r}'
print('data preserved across the rebuild: PASS')

# 2. Indexes and triggers came back. A create-copy-swap drops them with the table;
# forgetting to recreate one silently removes a uniqueness or integrity guarantee.
assert before['__indexes'] == after['__indexes'], \
    f'indexes lost: {sorted(set(before["__indexes"]) - set(after["__indexes"]))}'
assert before['__triggers'] == after['__triggers'], \
    f'triggers lost: {sorted(set(before["__triggers"]) - set(after["__triggers"]))}'
print(f'{len(after["__indexes"])} indexes and {len(after["__triggers"])} triggers preserved: PASS')

# 3. base_currency_code backfill.
rows = {r['id']: r for r in con.execute('SELECT id, type, base_currency_code FROM transactions')}
for txn_id, row in rows.items():
    expected = None if row['type'] == 'transfer' else 'COP'
    assert row['base_currency_code'] == expected, f'{txn_id}: base {row["base_currency_code"]!r}'
print('base_currency_code backfilled: PASS')

# 3b. Every existing rate snapshot was written as "1 USD = r COP"; the new pair
# columns must say so, and must stay NULL where there is no snapshot.
pairs = con.execute(
    'SELECT id, exchange_rate_scaled, exchange_rate_base_code, exchange_rate_quote_code FROM transactions').fetchall()
assert any(r['exchange_rate_scaled'] is not None for r in pairs), 'fixture has no rate snapshot to check'
for row in pairs:
    expected = ('USD', 'COP') if row['exchange_rate_scaled'] is not None else (None, None)
    actual = (row['exchange_rate_base_code'], row['exchange_rate_quote_code'])
    assert actual == expected, f'{row["id"]}: rate pair {actual} != {expected}'
# A rate without its pair, or a pair without a rate, must be impossible.
assert rejects(
    con,
    'INSERT INTO transactions (id,type,status,amount,currency,account_id,category_id,base_amount_minor,base_currency_code,'
    'exchange_rate_scaled,exchange_rate_scale,exchange_rate_date,transaction_date,created_at,updated_at)'
    " VALUES ('rate_no_pair','expense','posted',5000,'USD','savings_usd','home',20000,'COP',41023456,10000,'2026-08-20','2026-08-20',?,?)",
    (UTC, UTC)), 'a rate snapshot must name its currency pair'
print('rate snapshot pair recorded: PASS')

# 4. The seeded base currency reflects the install.
assert con.execute('SELECT base_currency_code FROM app_settings').fetchone()[0] == 'COP'
assert rejects(con, "INSERT INTO app_settings (id,base_currency_code,created_at,updated_at) VALUES ('other','EUR',?,?)", (UTC, UTC)), \
    'app_settings must stay a singleton'
fresh = new_con()
apply(fresh, PRE + [V0014])
assert fresh.execute('SELECT base_currency_code FROM app_settings').fetchone()[0] == 'USD', \
    'an empty install must not be pinned to COP'
fresh.close()
print('base currency seeded from the data: PASS')

# 5. Currencies beyond the old pair are now accepted.
for code in ('EUR', 'JPY', 'BHD', 'XOF'):
    con.execute(
        'INSERT INTO accounts (id,name,type,currency,opening_balance,credit_limit,statement_closing_day,payment_due_day,is_archived,archived_at,created_at,updated_at)'
        ' VALUES (?,?,?,?,?,NULL,NULL,NULL,0,NULL,?,?)', (f'acc_{code}', f'Account {code}', 'savings', code, 1000, UTC, UTC))
con.commit()
print('new currencies accepted: PASS')

# 6. Malformed codes are still rejected: the check is structural, not absent.
for bad in ('eur', 'EU', 'EURO', '', 'E1R', 'US$'):
    assert rejects(
        con,
        'INSERT INTO accounts (id,name,type,currency,opening_balance,credit_limit,statement_closing_day,payment_due_day,is_archived,archived_at,created_at,updated_at)'
        ' VALUES (?,?,?,?,?,NULL,NULL,NULL,0,NULL,?,?)', (f'bad_{bad}', f'Bad {bad}', 'savings', bad, 1000, UTC, UTC)), \
        f'malformed currency accepted: {bad!r}'
print('malformed currency codes rejected: PASS')

# 7. The foreign-snapshot rule still bites, now via base_currency_code.
assert rejects(
    con,
    'INSERT INTO transactions (id,type,status,amount,currency,account_id,category_id,base_amount_minor,base_currency_code,transaction_date,created_at,updated_at)'
    " VALUES ('no_rate','expense','posted',5000,'EUR','acc_EUR','home',20000,'COP','2026-08-20',?,?)", (UTC, UTC)), \
    'a foreign-currency row with no rate snapshot must be rejected'
# The same row in the base currency needs no snapshot.
con.execute(
    'INSERT INTO transactions (id,type,status,amount,currency,account_id,category_id,base_amount_minor,base_currency_code,transaction_date,created_at,updated_at)'
    " VALUES ('base_ok','expense','posted',5000,'EUR','acc_EUR','home',5000,'EUR','2026-08-20',?,?)", (UTC, UTC))
# A non-transfer must always say which currency its snapshot is in.
assert rejects(
    con,
    'INSERT INTO transactions (id,type,status,amount,currency,account_id,category_id,base_amount_minor,base_currency_code,transaction_date,created_at,updated_at)'
    " VALUES ('no_base','expense','posted',5000,'COP','checking','home',5000,NULL,'2026-08-20',?,?)", (UTC, UTC)), \
    'a non-transfer row must carry base_currency_code'
con.commit()
print('foreign-snapshot rule still enforced: PASS')

# 8. The triggers rebuilt in step 2 actually fire, not merely exist.
assert rejects(
    con,
    'INSERT INTO transactions (id,type,status,amount,currency,account_id,category_id,subcategory_id,base_amount_minor,base_currency_code,transaction_date,created_at,updated_at)'
    " VALUES ('bad_sub','expense','posted',1000,'COP','checking','salary','market',1000,'COP','2026-08-21',?,?)", (UTC, UTC)), \
    'subcategory guard must reject a subcategory under the wrong parent'
assert rejects(
    con,
    'INSERT INTO transactions (id,type,status,amount,currency,account_id,original_transaction_id,base_amount_minor,base_currency_code,transaction_date,created_at,updated_at)'
    " VALUES ('bad_ref','refund','posted',1000,'COP','checking','inc1',1000,'COP','2026-08-21',?,?)", (UTC, UTC)), \
    'refund guard must reject a refund of a non-expense'
print('rebuilt triggers still fire: PASS')

assert con.execute('PRAGMA foreign_key_check').fetchall() == []
assert con.execute('PRAGMA integrity_check').fetchone()[0] == 'ok'
con.close()
print('foreign keys and integrity clean: PASS')
print('migration 0014: ALL PASS')
