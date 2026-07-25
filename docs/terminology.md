# Money Control — Terminology

The app uses one term per concept in all user-facing text. Use these consistently; do not reintroduce the retired alternatives.

| Term | Meaning | Do not use |
|---|---|---|
| Expense | Money leaving an asset account / charged to a card | — |
| Income | Money entering an asset account | — |
| Transfer | Movement between two accounts (incl. a card payment); never income/expense | "Payment" (except a card payment presented as such) |
| Refund | Money returned against one posted expense; reduces net expenses | "Income" |
| Posted | Active transaction included in balances/reports | — |
| Voided | Retained history excluded from balances/reports | "Deleted" |
| Current balance | Derived balance of an asset account | — |
| Current debt | `max(-signedBalance, 0)` owed on a card | "Amount owed", "Amounts owed", "Current card debt", "Card balance" |
| No debt | A card whose signed balance is zero | — |
| Credit balance | A card overpaid into a positive signed balance | "Amount owed" (for a positive balance) |
| Available credit | `creditLimit − currentDebt` | — |
| Credit utilization | Debt as a share of the limit (basis points) | "Utilization" (bare) |
| Statement balance | Bank-entered statement amount (metadata) | — |
| Minimum payment | Bank-entered minimum (metadata; never calculated) | — |
| Remaining statement | Unpaid portion of the latest statement | "Statement remaining" |
| Expected debt | Projected current debt after a previewed payment | "Expected card debt" |
| Gross expenses | Sum of posted expenses before refunds | — |
| Net expenses | Gross expenses − refunds | "Expenses" (when the value is net) |
| Net result | Income − net expenses | "Net" |
| Budget limit | The monthly limit for a category budget | "Limit amount" |
| Spent | Posted expenses (minus refunds) in a budget's category/month | — |
| Remaining | Budget limit − spent | — |
| Backup | The versioned JSON restore document | "Save" (as a synonym) |
| Restore | Replacing local data from a backup | — |
| Data Export | Human-readable CSV projection (not restorable) | "Backup" |

The normative financial definitions remain in [financial-rules.md](financial-rules.md).
