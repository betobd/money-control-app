# Linked Refunds v1

Refunds are persisted as the fourth transaction type in `transactions`. A refund has a positive whole-COP amount, the original expense account, no direct category or destination account, and a non-null `original_transaction_id`. Category and original context are inherited with joins instead of duplicated on the refund row.

Creation starts only from posted expense details and runs in an exclusive SQLite transaction. The repository revalidates the original row, account, dates, and cumulative posted amount immediately before insert. Multiple partial refunds are allowed, but posted refunds may not exceed the expense. Refunds cannot reference themselves, another refund, income, transfer, or a voided expense.

Posted refunds are immutable and cannot be reactivated. Corrections use void and recreate. An expense with a posted refund cannot be edited or voided; after every linked refund is voided, those actions become available again. Fully refunded expenses remain posted and visible with net expense zero.

Balances add posted refunds back to the original account. For credit cards this reduces current debt and utilization. Statement payments and due-reminder settlement continue to count only posted transfers into the card, so merchant refunds never masquerade as payments.

Reports expose gross expenses, refunds, and net expenses. Refund date controls the report and budget period. Budget category spending is expense minus refunds for the effective original category and can be negative. Home uses net expenses and displays a separate Refunds metric when nonzero.

Backup format v3 preserves `originalTransactionId`. V1 and v2 are migrated in memory by adding null links; historical income rows remain unchanged. Transaction CSV exports include refund rows, inherited category values, and original transaction ID/date/amount/note columns.
