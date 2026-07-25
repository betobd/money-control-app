import sqlite3
from pathlib import Path

root = Path(__file__).parents[1]
migrations = root / 'src/database/migrations'


def statements(path):
    return [
        statement.strip()
        for statement in path.read_text(encoding='utf-8').split('--> statement-breakpoint')
        if statement.strip()
    ]


def apply(database, path):
    database.execute('BEGIN')
    try:
        for statement in statements(path):
            database.execute(statement)
        database.commit()
    except Exception:
        database.rollback()
        raise


for fixture in ('empty', 'populated'):
    database = sqlite3.connect(':memory:')
    database.execute('PRAGMA foreign_keys = ON')
    for migration in sorted(migrations.glob('000[0-7]_*.sql')):
        apply(database, migration)

    if fixture == 'populated':
        now = '2026-07-24T12:00:00.000Z'
        database.execute(
            "INSERT INTO accounts (id,name,type,currency,opening_balance,is_archived,created_at,updated_at) VALUES ('account','Checking','cash','COP',100000,0,?,?)",
            (now, now),
        )
        database.execute(
            "INSERT INTO categories (id,name,type,icon,is_archived,created_at,updated_at) VALUES ('category','Food','expense','food',0,?,?)",
            (now, now),
        )
        database.execute(
            "INSERT INTO transactions VALUES ('transaction','expense','posted',25000,'COP','account',NULL,'category','Lunch','2026-07-20',?,?)",
            (now, now),
        )
        database.execute(
            "INSERT INTO transaction_splits VALUES ('split','transaction','account',-25000,0)"
        )
        database.execute(
            '''INSERT INTO recurring_transactions (
              id,type,amount,currency,account_id,category_id,note,frequency,"interval",
              start_date,next_occurrence_date,is_active,created_at,updated_at
            ) VALUES ('rule','expense',25000,'COP','account','category','Lunch','monthly',1,
              '2026-07-20','2026-08-20',1,?,?)''',
            (now, now),
        )
        database.execute(
            "INSERT INTO recurring_occurrences VALUES ('occurrence','rule','2026-07-20','posted','expense',25000,'COP','account',NULL,'category','Lunch','transaction',?,?)",
            (now, now),
        )
        database.commit()

    apply(database, migrations / '0008_linked_refunds.sql')
    columns = [row[1] for row in database.execute('PRAGMA table_info(transactions)')]
    assert 'original_transaction_id' in columns
    if fixture == 'populated':
        assert database.execute('''
          SELECT id, account_id, destination_account_id, category_id, status, created_at, updated_at,
                 original_transaction_id
          FROM transactions
        ''').fetchone() == (
            'transaction', 'account', None, 'category', 'posted', now, now, None
        )
        assert database.execute('SELECT * FROM transaction_splits').fetchone() == (
            'split', 'transaction', 'account', -25000, 0
        )
        assert database.execute(
            "SELECT transaction_id FROM recurring_occurrences WHERE id = 'occurrence'"
        ).fetchone()[0] == 'transaction'
    assert database.execute('PRAGMA foreign_key_check').fetchall() == []
    assert database.execute('PRAGMA integrity_check').fetchone()[0] == 'ok'
