import sqlite3
from pathlib import Path

root = Path(__file__).parents[1]
connection = sqlite3.connect(':memory:')
connection.execute('PRAGMA foreign_keys = ON')
for migration in sorted((root / 'src/database/migrations').glob('*.sql')):
    connection.executescript(migration.read_text(encoding='utf-8').replace('--> statement-breakpoint', ''))

utc = '2026-07-12T12:00:00.000Z'
defaults = [
    ('default-expense-food-dining', 'Food & Dining', 'expense', 'food'), ('default-expense-bills', 'Bills', 'expense', 'bills'),
    ('default-expense-transport', 'Transport', 'expense', 'transport'), ('default-expense-shopping', 'Shopping', 'expense', 'shopping'),
    ('default-expense-entertainment', 'Entertainment', 'expense', 'entertainment'), ('default-expense-health', 'Health', 'expense', 'health'),
    ('default-expense-education', 'Education', 'expense', 'education'), ('default-expense-other', 'Other', 'expense', 'other'),
    ('default-income-salary', 'Salary', 'income', 'salary'), ('default-income-freelance', 'Freelance', 'income', 'freelance'),
    ('default-income-gift', 'Gift', 'income', 'gift'), ('default-income-refund', 'Refund', 'income', 'refund'), ('default-income-other', 'Other', 'income', 'other'),
]
def seed_if_empty():
    with connection:
        if connection.execute('SELECT count(*) FROM categories').fetchone()[0]: return False
        connection.executemany('INSERT INTO categories VALUES (?,?,?,?,?,?,?,?)', [(id, name, type, icon, 0, None, utc, utc) for id, name, type, icon in defaults])
        return True

assert seed_if_empty() is True
assert seed_if_empty() is False
assert connection.execute('SELECT count(*) FROM categories').fetchone()[0] == 13
connection.execute("UPDATE categories SET name = 'Meals' WHERE id = 'default-expense-food-dining'")
connection.execute("UPDATE categories SET is_archived = 1, archived_at = ? WHERE id = 'default-expense-bills'", (utc,))
assert seed_if_empty() is False
assert connection.execute("SELECT name FROM categories WHERE id = 'default-expense-food-dining'").fetchone()[0] == 'Meals'

connection.execute('INSERT INTO categories VALUES (?,?,?,?,?,?,?,?)', ('custom-expense', 'Custom', 'expense', 'other', 0, None, utc, utc))
connection.execute('INSERT INTO categories VALUES (?,?,?,?,?,?,?,?)', ('custom-income', ' custom ', 'income', 'other', 0, None, utc, utc))
try:
    connection.execute('INSERT INTO categories VALUES (?,?,?,?,?,?,?,?)', ('duplicate', ' CUSTOM ', 'expense', 'other', 0, None, utc, utc))
    raise AssertionError('same-type active duplicate accepted')
except sqlite3.IntegrityError: pass

connection.execute("UPDATE categories SET is_archived = 1, archived_at = ? WHERE id = 'custom-expense'", (utc,))
connection.execute('INSERT INTO categories VALUES (?,?,?,?,?,?,?,?)', ('replacement', 'custom', 'expense', 'other', 0, None, utc, utc))
try:
    connection.execute("UPDATE categories SET is_archived = 0, archived_at = NULL WHERE id = 'custom-expense'")
    raise AssertionError('restore conflict accepted')
except sqlite3.IntegrityError: pass
connection.execute("UPDATE categories SET name = 'Restored', is_archived = 0, archived_at = NULL WHERE id = 'custom-expense'")

connection.execute('INSERT INTO categories VALUES (?,?,?,?,?,?,?,?)', ('unused', 'Unused', 'expense', 'other', 0, None, utc, utc))
connection.execute("DELETE FROM categories WHERE id = 'unused'")
assert connection.execute("SELECT count(*) FROM categories WHERE id = 'unused'").fetchone()[0] == 0

connection.execute('INSERT INTO accounts (id,name,type,currency,opening_balance,credit_limit,is_archived,archived_at,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)', ('account', 'Checking', 'checking', 'COP', 0, None, 0, None, utc, utc))
connection.execute('INSERT INTO transactions VALUES (?,?,?,?,?,?,?,?,?,?,?,?)', ('history', 'expense', 'voided', 100, 'COP', 'account', None, 'custom-expense', None, '2026-07-12', utc, utc))
try:
    connection.execute("DELETE FROM categories WHERE id = 'custom-expense'")
    raise AssertionError('foreign key allowed historical category deletion')
except sqlite3.IntegrityError: pass
assert connection.execute("SELECT category_id FROM transactions WHERE id = 'history'").fetchone()[0] == 'custom-expense'
assert connection.execute('PRAGMA integrity_check').fetchone()[0] == 'ok'
print('categories database integration: PASS')
