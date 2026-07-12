import sqlite3
from pathlib import Path
root=Path(__file__).parents[1]; db_file=root/'tests'/'transaction_persistence_test.sqlite'
if db_file.exists(): db_file.unlink()
connection=sqlite3.connect(db_file); connection.execute('PRAGMA foreign_keys=ON')
for migration in sorted((root/'src/database/migrations').glob('*.sql')): connection.executescript(migration.read_text(encoding='utf-8').replace('--> statement-breakpoint',''))
utc='2026-07-12T15:30:00.000Z'
accounts=[('checking','Checking','checking','COP',600000,None,0,None,utc,utc),('card','Card','credit_card','COP',-1000000,None,0,None,utc,utc),('savings','Savings','savings','COP',0,None,0,None,utc,utc),('bancolombia','Bancolombia','checking','COP',10000000,None,0,None,utc,utc),('davibank','Davibank','checking','COP',5000000,None,0,None,utc,utc)]
categories=[('expense','Food','expense','food',0,None,utc,utc),('income','Salary','income','salary',0,None,utc,utc)]
connection.executemany('INSERT INTO accounts VALUES (?,?,?,?,?,?,?,?,?,?)',accounts);connection.executemany('INSERT INTO categories VALUES (?,?,?,?,?,?,?,?)',categories)
transactions=[('expense-checking','expense','posted',100000,'COP','checking',None,'expense',' lunch ','2026-07-12',utc,utc),('expense-card','expense','posted',200000,'COP','card',None,'expense',None,'2026-07-11',utc,utc),('income','income','posted',500000,'COP','savings',None,'income',None,'2026-07-12','2026-07-12T16:00:00.000Z','2026-07-12T16:00:00.000Z'),('voided','expense','voided',900000,'COP','checking',None,'expense',None,'2026-07-12','2026-07-12T17:00:00.000Z','2026-07-12T17:00:00.000Z'),('reported-expense','expense','posted',150000,'COP','bancolombia',None,'expense',None,'2026-07-12','2026-07-12T18:00:00.000Z','2026-07-12T18:00:00.000Z')]
connection.executemany('INSERT INTO transactions VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',transactions);connection.commit();connection.close()
connection=sqlite3.connect(db_file)
balance_sql="""SELECT a.id,a.opening_balance+coalesce(sum(case when t.status!='posted' then 0 when t.type='income' then t.amount when t.type='expense' then -t.amount else 0 end),0) FROM accounts a LEFT JOIN transactions t ON t.account_id=a.id GROUP BY a.id"""
balances=dict(connection.execute(balance_sql));assert {key:balances[key] for key in ('checking','card','savings')}=={'checking':500000,'card':-1200000,'savings':500000},balances
reported=connection.execute("SELECT type,status,amount,account_id,destination_account_id FROM transactions WHERE id='reported-expense'").fetchone();assert reported==('expense','posted',150000,'bancolombia',None),reported
assert balances['bancolombia']==9850000;assert balances['davibank']==5000000;accounts_net_worth=balances['bancolombia']+balances['davibank'];home_total_balance=accounts_net_worth;assert accounts_net_worth==14850000;assert home_total_balance==14850000
connection.execute("INSERT INTO transactions VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",('reported-income','income','posted',200000,'COP','bancolombia',None,'income',None,'2026-07-12','2026-07-12T19:00:00.000Z','2026-07-12T19:00:00.000Z'))
connection.execute("INSERT INTO transactions VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",('reported-voided','expense','voided',999999,'COP','bancolombia',None,'expense',None,'2026-07-12','2026-07-12T20:00:00.000Z','2026-07-12T20:00:00.000Z'))
refreshed=dict(connection.execute(balance_sql));assert refreshed['bancolombia']==10050000;assert refreshed['davibank']==5000000
summary=connection.execute("SELECT sum(case when type='income' then amount else 0 end),sum(case when type='expense' then amount else 0 end) FROM transactions WHERE status='posted' AND transaction_date>='2026-07-01' AND transaction_date<'2026-08-01'").fetchone();assert summary==(700000,450000);assert summary[0]-summary[1]==250000
order=[r[0] for r in connection.execute('SELECT id FROM transactions ORDER BY transaction_date DESC,created_at DESC')];assert order[:3]==['reported-voided','reported-income','reported-expense']
assert connection.execute('SELECT count(*) FROM transactions').fetchone()[0]==7;assert connection.execute('PRAGMA integrity_check').fetchone()[0]=='ok';connection.close();db_file.unlink();print('transactions database integration: PASS')
