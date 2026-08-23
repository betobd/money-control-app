import type { AccountWithBalance } from '@/features/accounts/account.types';
import type { BudgetMonthView } from '@/features/budgets/budget.types';
import { calculateCreditCardUtilization } from '@/features/credit-cards/credit-card-utilization';
import { convertUsdMinorToCopMinor, formatMoneyWithSymbol, type ScaledRate } from '@/features/currency/currency';
import type { InvestmentAccountView, InvestmentPortfolioSummary, InvestmentValuation } from '@/features/investments/investment.types';
import { calculateCreditCardStatementView } from '@/features/credit-cards/credit-card-statement.service';
import type { RecurringRuleListItem } from '@/features/recurring-transactions/recurring-transaction.types';
import type { ReportData, ReportPeriodSelection } from '@/features/reports/report.types';
import {
  buildTransactionListQuery,
} from '@/features/transactions/transaction-list-filters';
import { bogotaToday } from '@/features/transactions/transaction-date';
import {
  normalizeTransactionListQuery,
} from '@/features/transactions/transaction.service';
import type { TransactionFilterOptions } from '@/features/transactions/transaction.types';
import { CsvSerializer, type CsvColumn, type CsvScalar } from './csv-serializer';
import type { DataExportRepository } from './data-export.repository';
import type {
  AccountExportSource,
  CreditCardStatementExportSource,
  DataExportKind,
  DataExportOverview,
  ExportResult,
  RecurringExportOptions,
  TransactionExportOptions,
  TransactionExportPreview,
  TransactionExportQuery,
  TransactionExportRow,
} from './data-export.types';
import { exportLimits } from './data-export.types';
import type { ExportFileAdapter } from './export-file.adapter';

type AccountExportService = {
  list(includeArchived: boolean): Promise<AccountWithBalance[]>;
};

type BudgetExportService = {
  listMonth(month: string): Promise<BudgetMonthView>;
};

type RecurringRuleExportService = {
  listRules(): Promise<RecurringRuleListItem[]>;
};

type ReportExportService = {
  load(selection: ReportPeriodSelection, today?: string): Promise<ReportData>;
};

type TransactionFilterService = {
  listFilterOptions(): Promise<TransactionFilterOptions>;
};

type InvestmentExportService = {
  getPortfolio(rate: ScaledRate | null): Promise<InvestmentPortfolioSummary>;
  listValuations(accountId: string): Promise<InvestmentValuation[]>;
};

type ExportValuationRate = { rateScaled: number; rateScale: number; effectiveDate: string; source: string } | null;

type DataExportServiceOptions = {
  today?: () => string;
  /** Resolves the current USD/COP valuation rate for estimated-COP account columns. */
  resolveValuationRate?: () => Promise<ExportValuationRate>;
};

export type DataExportErrorCode = 'no_data' | 'row_limit_exceeded';

export class DataExportError extends Error {
  constructor(public readonly code: DataExportErrorCode, message: string) {
    super(message);
  }
}

type AccountCsvRow = AccountExportSource & {
  status: 'active' | 'archived';
  estimatedBaseCurrencyCop: number | null;
  currentDebt: number | null;
  availableCredit: number | null;
  utilizationPercentage: number | null;
};

type BudgetCsvRow = BudgetMonthView['budgets'][number];

type RecurringCsvRow = RecurringRuleListItem & {
  lifecycleStatus: 'active' | 'paused' | 'ended';
};

type StatementCsvRow = CreditCardStatementExportSource & {
  view: ReturnType<typeof calculateCreditCardStatementView>;
};

type ReportCsvRow = {
  metric: string;
  value: CsvScalar;
  periodStart: string;
  periodEnd: string;
};

type InvestmentValuationCsvRow = InvestmentValuation & { accountName: string };

function estimateTransactionBytes(count: number): number {
  return 512 + count * 420;
}

function compareAuditRows(
  left: { createdAt: string; id: string },
  right: { createdAt: string; id: string },
): number {
  return left.createdAt.localeCompare(right.createdAt) || left.id.localeCompare(right.id);
}

function lifecycleStatus(rule: RecurringRuleListItem): RecurringCsvRow['lifecycleStatus'] {
  if (rule.endedAt) return 'ended';
  return rule.isActive ? 'active' : 'paused';
}

function normalizeExportQuery(options: TransactionExportOptions, today: string): TransactionExportQuery {
  const query = buildTransactionListQuery(options.filters, '', today);
  const normalized = normalizeTransactionListQuery({ ...query, limit: 1 });
  const { cursor: _cursor, limit: _limit, search: _search, ...exportQuery } = normalized;
  void _cursor;
  void _limit;
  void _search;
  return exportQuery;
}

function reportRows(data: ReportData): ReportCsvRow[] {
  const firstNetWorth = data.netWorth[0]?.netWorth ?? 0;
  const lastNetWorth = data.netWorth.at(-1)?.netWorth ?? firstNetWorth;
  const largest = data.summary.largestExpense;
  const values: [string, CsvScalar][] = [
    ['total_income_cop', data.summary.income],
    ['gross_expenses_cop', data.summary.grossExpenses],
    ['refunds_cop', data.summary.refunds],
    ['net_expenses_cop', data.summary.expenses],
    ['net_result_cop', data.summary.net],
    ['expense_count', data.summary.expenseCount],
    ['refund_count', data.summary.refundCount],
    ['income_count', data.summary.incomeCount],
    ['average_expense_cop', data.summary.averageExpense],
    ['largest_expense_cop', largest?.amount ?? null],
    ['largest_expense_date', largest?.transactionDate ?? null],
    ['largest_expense_category', largest?.categoryName ?? null],
    ['largest_expense_account', largest?.accountName ?? null],
    ['net_worth_start_cop', firstNetWorth],
    ['net_worth_end_cop', lastNetWorth],
  ];
  return values.map(([metric, value]) => ({
    metric,
    value,
    periodStart: data.period.dateFrom,
    periodEnd: data.period.dateTo,
  }));
}

export class DataExportService {
  private readonly today: () => string;

  constructor(
    private readonly repository: DataExportRepository,
    private readonly accounts: AccountExportService,
    private readonly budgets: BudgetExportService,
    private readonly recurring: RecurringRuleExportService,
    private readonly reports: ReportExportService,
    private readonly transactionFilters: TransactionFilterService,
    private readonly investments: InvestmentExportService,
    private readonly serializer: CsvSerializer,
    private readonly files: ExportFileAdapter,
    options: DataExportServiceOptions = {},
  ) {
    this.today = options.today ?? (() => bogotaToday());
    this.resolveValuationRate = options.resolveValuationRate ?? (async () => null);
  }

  private readonly resolveValuationRate: () => Promise<ExportValuationRate>;

  cleanupStaleFiles(): Promise<void> {
    return this.files.cleanupStaleFiles();
  }

  async getOverview(
    transactionOptions: TransactionExportOptions,
    budgetMonth: string,
  ): Promise<DataExportOverview> {
    const [
      accountRows,
      budgetData,
      recurringRules,
      creditCardStatements,
      transactionFilters,
      transactions,
      portfolio,
    ] = await Promise.all([
      this.accounts.list(true),
      this.budgets.listMonth(budgetMonth),
      this.recurring.listRules(),
      this.repository.countCreditCardStatements(),
      this.transactionFilters.listFilterOptions(),
      this.previewTransactions(transactionOptions),
      this.investments.getPortfolio(null),
    ]);
    return {
      accounts: accountRows.length,
      budgets: budgetData.budgets.length,
      recurringRules: recurringRules.length,
      creditCardStatements,
      reportMetrics: 15,
      investments: portfolio.investmentAccountCount,
      transactionFilters,
      transactions,
    };
  }

  async previewTransactions(options: TransactionExportOptions): Promise<TransactionExportPreview> {
    const query = normalizeExportQuery(options, this.today());
    const count = await this.repository.countTransactions(query);
    return {
      count: count.count,
      dateRange: {
        dateFrom: query.dateFrom ?? count.oldestDate ?? undefined,
        dateTo: query.dateTo ?? count.newestDate ?? undefined,
      },
      estimatedBytes: estimateTransactionBytes(count.count),
      isLarge: count.count >= exportLimits.largeTransactionWarningRows,
      exceedsLimit: count.count > exportLimits.transactionRows,
    };
  }

  async exportTransactions(options: TransactionExportOptions): Promise<ExportResult> {
    const today = this.today();
    const query = normalizeExportQuery(options, today);
    const preview = await this.previewTransactions(options);
    this.requireRows('transactions', preview.count, exportLimits.transactionRows);
    const dateFrom = preview.dateRange.dateFrom!;
    const dateTo = preview.dateRange.dateTo!;
    const rows = this.repository.iterateTransactions(
      query,
      exportLimits.transactionBatchSize,
      exportLimits.transactionRows,
    );
    const columns: CsvColumn<TransactionExportRow>[] = [
      { header: 'transaction_id', value: (row) => row.transactionId },
      { header: 'transaction_date', value: (row) => row.transactionDate },
      { header: 'type', value: (row) => row.type },
      { header: 'status', value: (row) => row.status },
      { header: 'currency_code', value: (row) => row.currencyCode },
      { header: 'amount_minor', value: (row) => row.amountCop },
      { header: 'base_currency_amount_cop', value: (row) => row.baseCurrencyAmountCop },
      { header: 'exchange_rate', value: (row) => row.exchangeRate },
      { header: 'exchange_rate_date', value: (row) => row.exchangeRateDate },
      { header: 'exchange_rate_source', value: (row) => row.exchangeRateSource },
      { header: 'destination_amount_minor', value: (row) => row.destinationAmountMinor },
      { header: 'destination_currency_code', value: (row) => row.destinationCurrencyCode },
      { header: 'category_id', value: (row) => row.categoryId },
      { header: 'category_name', value: (row) => row.categoryName, protectFormula: true },
      { header: 'subcategory_id', value: (row) => row.subcategoryId },
      { header: 'subcategory_name', value: (row) => row.subcategoryName, protectFormula: true },
      { header: 'original_transaction_id', value: (row) => row.originalTransactionId },
      { header: 'original_transaction_date', value: (row) => row.originalTransactionDate },
      { header: 'original_transaction_amount_cop', value: (row) => row.originalTransactionAmountCop },
      { header: 'original_transaction_note', value: (row) => options.includeNotes ? row.originalTransactionNote : null, protectFormula: true },
      { header: 'source_account_id', value: (row) => row.sourceAccountId },
      { header: 'source_account_name', value: (row) => row.sourceAccountName, protectFormula: true },
      { header: 'destination_account_id', value: (row) => row.destinationAccountId },
      { header: 'destination_account_name', value: (row) => row.destinationAccountName, protectFormula: true },
      { header: 'note', value: (row) => options.includeNotes ? row.note : null, protectFormula: true },
      { header: 'recurring_occurrence_id', value: (row) => row.recurringOccurrenceId },
      { header: 'created_at', value: (row) => row.createdAt },
      { header: 'updated_at', value: (row) => row.updatedAt },
    ];
    return this.write(
      'transactions',
      `money-control-transactions-${dateFrom}-to-${dateTo}.csv`,
      preview.count,
      columns,
      rows,
    );
  }

  async exportAccounts(): Promise<ExportResult> {
    const rate = await this.resolveValuationRate();
    const scaledRate = rate ? { rateScaled: rate.rateScaled, rateScale: rate.rateScale } : null;
    const rows = (await this.accounts.list(true))
      .sort(compareAuditRows)
      .map((account): AccountCsvRow => {
        const utilization = account.type === 'credit_card'
          ? calculateCreditCardUtilization(account.balance, account.creditLimit)
          : null;
        const estimatedCop = account.currency === 'COP'
          ? account.balance
          : scaledRate
            ? convertUsdMinorToCopMinor(account.balance, scaledRate)
            : null;
        return {
          ...account,
          status: account.isArchived ? 'archived' : 'active',
          estimatedBaseCurrencyCop: estimatedCop,
          currentDebt: utilization?.currentDebt ?? null,
          availableCredit: utilization?.availableCredit ?? null,
          utilizationPercentage: utilization?.utilizationBasisPoints === null
            || utilization?.utilizationBasisPoints === undefined
            ? null
            : utilization.utilizationBasisPoints / 100,
        };
      });
    this.requireRows('accounts', rows.length, exportLimits.otherRows);
    const valuationRate = rate ? rate.rateScaled / rate.rateScale : null;
    const columns: CsvColumn<AccountCsvRow>[] = [
      { header: 'account_id', value: (row) => row.id },
      { header: 'name', value: (row) => row.name, protectFormula: true },
      { header: 'type', value: (row) => row.type },
      { header: 'status', value: (row) => row.status },
      { header: 'currency_code', value: (row) => row.currency },
      { header: 'opening_balance_minor', value: (row) => row.openingBalance },
      { header: 'current_balance_minor', value: (row) => row.balance },
      { header: 'estimated_base_currency_balance_cop', value: (row) => row.estimatedBaseCurrencyCop },
      { header: 'valuation_rate', value: (row) => row.currency === 'COP' ? null : valuationRate },
      { header: 'valuation_rate_date', value: (row) => row.currency === 'COP' ? null : rate?.effectiveDate ?? null },
      { header: 'valuation_rate_source', value: (row) => row.currency === 'COP' ? null : rate?.source ?? null },
      { header: 'credit_limit_minor', value: (row) => row.type === 'credit_card' ? row.creditLimit : null },
      { header: 'current_debt_minor', value: (row) => row.currentDebt },
      { header: 'available_credit_minor', value: (row) => row.availableCredit },
      { header: 'utilization_percentage', value: (row) => row.utilizationPercentage },
      { header: 'statement_closing_day', value: (row) => row.type === 'credit_card' ? row.statementClosingDay : null },
      { header: 'payment_due_day', value: (row) => row.type === 'credit_card' ? row.paymentDueDay : null },
      { header: 'created_at', value: (row) => row.createdAt },
      { header: 'updated_at', value: (row) => row.updatedAt },
    ];
    return this.write('accounts', `money-control-accounts-${this.today()}.csv`, rows.length, columns, rows);
  }

  async exportBudgets(month: string): Promise<ExportResult> {
    const rows = (await this.budgets.listMonth(month)).budgets;
    this.requireRows('budgets', rows.length, exportLimits.otherRows);
    const columns: CsvColumn<BudgetCsvRow>[] = [
      { header: 'budget_id', value: (row) => row.id },
      { header: 'month', value: (row) => row.month },
      { header: 'category_id', value: (row) => row.categoryId },
      { header: 'category_name', value: (row) => row.categoryName, protectFormula: true },
      { header: 'limit_amount_cop', value: (row) => row.limitAmount },
      { header: 'spent_amount_cop', value: (row) => row.spent },
      { header: 'remaining_amount_cop', value: (row) => row.remaining },
      { header: 'percentage_used', value: (row) => row.percentageUsed },
      { header: 'status', value: (row) => row.status },
      { header: 'created_at', value: (row) => row.createdAt },
      { header: 'updated_at', value: (row) => row.updatedAt },
    ];
    return this.write('budgets', `money-control-budgets-${month}.csv`, rows.length, columns, rows);
  }

  async exportRecurringRules(options: RecurringExportOptions): Promise<ExportResult> {
    const rows = (await this.recurring.listRules())
      .sort(compareAuditRows)
      .map((rule): RecurringCsvRow => ({ ...rule, lifecycleStatus: lifecycleStatus(rule) }));
    this.requireRows('recurring rules', rows.length, exportLimits.otherRows);
    const columns: CsvColumn<RecurringCsvRow>[] = [
      { header: 'recurring_rule_id', value: (row) => row.id },
      { header: 'type', value: (row) => row.type },
      { header: 'amount_cop', value: (row) => row.amount },
      { header: 'source_account_id', value: (row) => row.accountId },
      { header: 'source_account_name', value: (row) => row.accountName, protectFormula: true },
      { header: 'destination_account_id', value: (row) => row.destinationAccountId },
      { header: 'destination_account_name', value: (row) => row.destinationAccountName, protectFormula: true },
      { header: 'category_id', value: (row) => row.categoryId },
      { header: 'category_name', value: (row) => row.categoryName, protectFormula: true },
      { header: 'subcategory_id', value: (row) => row.subcategoryId },
      { header: 'subcategory_name', value: (row) => row.subcategoryName, protectFormula: true },
      { header: 'frequency', value: (row) => row.frequency },
      { header: 'interval', value: (row) => row.interval },
      { header: 'start_date', value: (row) => row.startDate },
      { header: 'next_occurrence_date', value: (row) => row.nextOccurrenceDate },
      { header: 'end_date', value: (row) => row.endDate },
      { header: 'active', value: (row) => row.isActive },
      { header: 'lifecycle_status', value: (row) => row.lifecycleStatus },
      { header: 'note', value: (row) => options.includeNotes ? row.note : null, protectFormula: true },
      { header: 'created_at', value: (row) => row.createdAt },
      { header: 'updated_at', value: (row) => row.updatedAt },
    ];
    return this.write(
      'recurring-rules',
      `money-control-recurring-rules-${this.today()}.csv`,
      rows.length,
      columns,
      rows,
    );
  }

  async exportCreditCardStatements(): Promise<ExportResult> {
    const today = this.today();
    const rows = (await this.repository.listCreditCardStatementSources()).map(
      (source): StatementCsvRow => ({
        ...source,
        view: calculateCreditCardStatementView(source.statement, source.payments, today),
      }),
    );
    this.requireRows('credit-card statements', rows.length, exportLimits.otherRows);
    const columns: CsvColumn<StatementCsvRow>[] = [
      { header: 'statement_id', value: (row) => row.statement.id },
      { header: 'card_account_id', value: (row) => row.statement.accountId },
      { header: 'card_name', value: (row) => row.cardName, protectFormula: true },
      { header: 'period_start', value: (row) => row.statement.periodStart },
      { header: 'period_end', value: (row) => row.statement.periodEnd },
      { header: 'closing_date', value: (row) => row.statement.closingDate },
      { header: 'due_date', value: (row) => row.statement.dueDate },
      { header: 'statement_balance_cop', value: (row) => row.statement.statementBalance },
      { header: 'minimum_payment_cop', value: (row) => row.statement.minimumPayment },
      { header: 'qualifying_payments_cop', value: (row) => row.view.amountPaid },
      { header: 'minimum_remaining_cop', value: (row) => row.view.minimumRemaining },
      { header: 'statement_remaining_cop', value: (row) => row.view.remainingStatement },
      { header: 'status', value: (row) => row.view.status },
      { header: 'created_at', value: (row) => row.statement.createdAt },
      { header: 'updated_at', value: (row) => row.statement.updatedAt },
    ];
    return this.write(
      'credit-card-statements',
      `money-control-card-statements-${today}.csv`,
      rows.length,
      columns,
      rows,
    );
  }

  async exportReport(selection: ReportPeriodSelection): Promise<ExportResult> {
    const data = await this.reports.load(selection, this.today());
    const rows = reportRows(data);
    const columns: CsvColumn<ReportCsvRow>[] = [
      { header: 'metric', value: (row) => row.metric },
      { header: 'value', value: (row) => row.value, protectFormula: true },
      { header: 'period_start', value: (row) => row.periodStart },
      { header: 'period_end', value: (row) => row.periodEnd },
    ];
    const singleMonth = data.period.dateFrom.endsWith('-01')
      && data.period.dateFrom.slice(0, 7) === data.period.dateTo.slice(0, 7);
    const periodName = singleMonth
      ? data.period.dateFrom.slice(0, 7)
      : `${data.period.dateFrom}-to-${data.period.dateTo}`;
    return this.write(
      'report-summary',
      `money-control-report-${periodName}.csv`,
      rows.length,
      columns,
      rows,
    );
  }

  async exportInvestments(): Promise<ExportResult> {
    const rate = await this.resolveValuationRate();
    const scaledRate = rate ? { rateScaled: rate.rateScaled, rateScale: rate.rateScale } : null;
    const portfolio = await this.investments.getPortfolio(scaledRate);
    const rows = [...portfolio.accounts].sort((left, right) =>
      left.account.id < right.account.id ? -1 : left.account.id > right.account.id ? 1 : 0,
    );
    this.requireRows('investments', rows.length, exportLimits.otherRows);
    const columns: CsvColumn<InvestmentAccountView>[] = [
      { header: 'investment_account_id', value: (row) => row.account.id },
      { header: 'account_name', value: (row) => row.account.name, protectFormula: true },
      { header: 'provider_name', value: (row) => row.metadata.providerName, protectFormula: true },
      { header: 'investment_type', value: (row) => row.metadata.investmentType },
      { header: 'tracking_mode', value: (row) => row.metadata.trackingMode },
      { header: 'liquidity', value: (row) => row.metadata.liquidity },
      { header: 'currency_code', value: (row) => row.account.currency },
      { header: 'current_value_minor', value: (row) => row.currentValueMinor },
      { header: 'current_value_display', value: (row) => formatMoneyWithSymbol(row.currentValueMinor, row.account.currency) },
      { header: 'estimated_value_cop', value: (row) => row.estimatedValueCopMinor },
      { header: 'total_contributions_minor', value: (row) => row.totalContributionsMinor },
      { header: 'total_withdrawals_minor', value: (row) => row.totalWithdrawalsMinor },
      { header: 'net_contributions_minor', value: (row) => row.netContributionsMinor },
      { header: 'estimated_gain_loss_minor', value: (row) => row.estimatedGainLossMinor },
      { header: 'estimated_return_percentage', value: (row) => row.estimatedReturn.available ? row.estimatedReturn.basisPoints / 100 : null },
      { header: 'latest_valuation_date', value: (row) => row.latestValuation?.valuationDate ?? null },
      { header: 'start_date', value: (row) => row.metadata.startDate },
      { header: 'maturity_date', value: (row) => row.metadata.maturityDate },
      { header: 'status', value: (row) => row.account.isArchived ? 'archived' : 'active' },
    ];
    return this.write('investments', `money-control-investments-${this.today()}.csv`, rows.length, columns, rows);
  }

  async exportInvestmentValuations(): Promise<ExportResult> {
    const rate = await this.resolveValuationRate();
    const scaledRate = rate ? { rateScaled: rate.rateScaled, rateScale: rate.rateScale } : null;
    const portfolio = await this.investments.getPortfolio(scaledRate);
    const nameById = new Map(portfolio.accounts.map((view) => [view.account.id, view.account.name]));
    const rows: InvestmentValuationCsvRow[] = [];
    for (const view of portfolio.accounts) {
      const valuations = await this.investments.listValuations(view.account.id);
      for (const valuation of valuations) {
        rows.push({ ...valuation, accountName: nameById.get(valuation.investmentAccountId) ?? view.account.name });
      }
    }
    rows.sort((left, right) => {
      if (left.investmentAccountId !== right.investmentAccountId) {
        return left.investmentAccountId < right.investmentAccountId ? -1 : 1;
      }
      return left.valuationDate < right.valuationDate ? -1 : left.valuationDate > right.valuationDate ? 1 : 0;
    });
    this.requireRows('investment valuations', rows.length, exportLimits.investmentValuationRows);
    const columns: CsvColumn<InvestmentValuationCsvRow>[] = [
      { header: 'valuation_id', value: (row) => row.id },
      { header: 'investment_account_id', value: (row) => row.investmentAccountId },
      { header: 'account_name', value: (row) => row.accountName, protectFormula: true },
      { header: 'valuation_date', value: (row) => row.valuationDate },
      { header: 'currency_code', value: (row) => row.currencyCode },
      { header: 'value_minor', value: (row) => row.valueMinor },
      { header: 'value_display', value: (row) => formatMoneyWithSymbol(row.valueMinor, row.currencyCode) },
      { header: 'note', value: (row) => row.note, protectFormula: true },
      { header: 'created_at', value: (row) => row.createdAt },
      { header: 'updated_at', value: (row) => row.updatedAt },
    ];
    return this.write('investment-valuations', `money-control-investment-valuations-${this.today()}.csv`, rows.length, columns, rows);
  }

  private requireRows(label: string, count: number, maximum: number): void {
    if (count === 0) {
      throw new DataExportError('no_data', `No ${label} match the selected options.`);
    }
    if (count > maximum) {
      throw new DataExportError(
        'row_limit_exceeded',
        `This export contains ${count.toLocaleString('en-US')} rows, above the ${maximum.toLocaleString('en-US')} row safety limit. Narrow the selected period or filters and try again.`,
      );
    }
  }

  private async write<Row>(
    kind: DataExportKind,
    fileName: string,
    rowCount: number,
    columns: readonly CsvColumn<Row>[],
    rows: Iterable<Row> | AsyncIterable<Row>,
  ): Promise<ExportResult> {
    const result = await this.files.writeAndShare(
      fileName,
      this.serializer.serialize(columns, rows, { includeBom: true, lineEnding: '\r\n' }),
    );
    return { kind, fileName, rowCount, ...result };
  }
}
