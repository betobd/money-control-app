import assert from 'node:assert/strict';
import test from 'node:test';

import {
  CsvSerializer,
  escapeCsvField,
  protectSpreadsheetFormula,
} from '../src/features/data-export/csv-serializer.ts';
import {
  DataExportError,
  DataExportService,
} from '../src/features/data-export/data-export.service.ts';
import { createDefaultTransactionListFilters } from '../src/features/transactions/transaction-list-filters.ts';

const TODAY = '2026-07-21';
const NOW = '2026-07-21T15:00:00.000Z';

async function collect(chunks) {
  let output = '';
  for await (const chunk of chunks) output += chunk;
  return output;
}

test('CSV serializer handles ordinary, empty, null, comma, quote, line break, Unicode, accents, and emoji values', async () => {
  const serializer = new CsvSerializer();
  const csv = await collect(serializer.serialize(
    [
      { header: 'normal', value: (row) => row.normal },
      { header: 'empty', value: (row) => row.empty },
      { header: 'missing', value: (row) => row.missing },
      { header: 'unicode', value: (row) => row.unicode },
    ],
    [{ normal: 'a,b "quoted"\nnext', empty: '', missing: null, unicode: 'Café Bogotá 😀' }],
  ));
  assert.equal(csv.startsWith('\uFEFFnormal,empty,missing,unicode\r\n'), true);
  assert.match(csv, /"a,b ""quoted""\nnext",,,Café Bogotá 😀\r\n$/);
  assert.equal(escapeCsvField('plain'), 'plain');
  assert.equal(escapeCsvField('a,b'), '"a,b"');
  assert.equal(escapeCsvField('a"b'), '"a""b"');
  assert.equal(escapeCsvField('a\r\nb'), '"a\r\nb"');
  assert.equal(escapeCsvField(''), '');
  assert.equal(escapeCsvField(null), '');
});

test('formula injection protection prefixes every dangerous user-text starter without changing stored values', async () => {
  for (const value of ['=SUM(A1:A2)', '+1', '-1', '@cmd', '\tformula', '\rformula']) {
    assert.equal(protectSpreadsheetFormula(value), `'${value}`);
    assert.equal(escapeCsvField(value, true).includes(`'${value}`), true);
  }
  assert.equal(protectSpreadsheetFormula(' safe'), ' safe');
  assert.equal(escapeCsvField(-125_000, true), '-125000');
});

test('CSV headers are deterministic, BOM appears once, and every record uses CRLF', async () => {
  const serializer = new CsvSerializer();
  const csv = await collect(serializer.serialize(
    [
      { header: 'second', value: (row) => row.second },
      { header: 'first', value: (row) => row.first },
    ],
    [{ first: 1, second: 2 }, { first: 3, second: 4 }],
    { chunkSizeCharacters: 10 },
  ));
  assert.equal(csv, '\uFEFFsecond,first\r\n2,1\r\n4,3\r\n');
  assert.equal(csv.split('\uFEFF').length - 1, 1);
  assert.equal(csv.replaceAll('\r\n', '').includes('\n'), false);
});

class Repository {
  transactions = [];
  statements = [];
  lastQuery = null;

  filtered(query) {
    return this.transactions.filter((row) => {
      if (query.types?.length && !query.types.includes(row.type)) return false;
      if (query.statuses?.length && !query.statuses.includes(row.status)) return false;
      if (query.accountId && row.sourceAccountId !== query.accountId && row.destinationAccountId !== query.accountId) return false;
      if (query.categoryId && row.categoryId !== query.categoryId) return false;
      if (query.dateFrom && row.transactionDate < query.dateFrom) return false;
      if (query.dateTo && row.transactionDate > query.dateTo) return false;
      return true;
    }).sort((a, b) => a.transactionDate.localeCompare(b.transactionDate)
      || a.createdAt.localeCompare(b.createdAt)
      || a.transactionId.localeCompare(b.transactionId));
  }

  async countTransactions(query) {
    this.lastQuery = query;
    const rows = this.filtered(query);
    return {
      count: rows.length,
      oldestDate: rows[0]?.transactionDate ?? null,
      newestDate: rows.at(-1)?.transactionDate ?? null,
    };
  }

  async *iterateTransactions(query, _batchSize, maximumRows) {
    const rows = this.filtered(query);
    if (rows.length > maximumRows) throw new Error('limit');
    for (const row of rows) yield row;
  }

  async countCreditCardStatements() { return this.statements.length; }
  async listCreditCardStatementSources() { return this.statements; }
}

class Files {
  calls = [];
  cleanupCalls = 0;
  async writeAndShare(fileName, chunks) {
    const contents = await collect(chunks);
    this.calls.push({ fileName, contents });
    return { fileSize: new TextEncoder().encode(contents).byteLength, nativeInterfaceOpened: true };
  }
  async cleanupStaleFiles() { this.cleanupCalls += 1; }
}

function account(id, overrides = {}) {
  return {
    id,
    name: id,
    type: 'checking',
    currency: 'COP',
    openingBalance: 100_000,
    balance: 75_000,
    creditLimit: null,
    statementClosingDay: null,
    paymentDueDay: null,
    isArchived: false,
    archivedAt: null,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

function transaction(transactionId, overrides = {}) {
  return {
    transactionId,
    transactionDate: '2026-07-10',
    type: 'expense',
    status: 'posted',
    amountCop: 25_000,
    categoryId: 'food',
    categoryName: 'Food',
    sourceAccountId: 'checking',
    sourceAccountName: 'Checking',
    destinationAccountId: null,
    destinationAccountName: null,
    originalTransactionId: null,
    originalTransactionDate: null,
    originalTransactionAmountCop: null,
    originalTransactionNote: null,
    note: '=private note',
    recurringOccurrenceId: null,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

function reportData() {
  return {
    period: { preset: 'current-month', dateFrom: '2026-07-01', dateTo: '2026-07-31', grouping: 'day', label: 'July' },
    summary: {
      income: 500_000,
      grossExpenses: 150_000,
      refunds: 25_000,
      expenses: 125_000,
      net: 375_000,
      expenseCount: 2,
      refundCount: 1,
      incomeCount: 1,
      averageExpense: 62_500,
      largestExpense: { amount: 100_000, categoryName: '=Utilities', accountName: 'Checking', transactionDate: '2026-07-10' },
    },
    cashFlow: [],
    categoryExpenses: [],
    netWorth: [
      { key: 'start', label: 'Start', date: '2026-06-30', netWorth: 1_000_000, isStartingPoint: true },
      { key: 'end', label: 'End', date: '2026-07-31', netWorth: 1_375_000, isStartingPoint: false },
    ],
    comparison: {},
  };
}

function setup() {
  const repository = new Repository();
  const files = new Files();
  const accounts = {
    values: [
      account('checking', { name: '=Checking' }),
      account('card', {
        name: 'Card', type: 'credit_card', openingBalance: -500_000, balance: -300_000,
        creditLimit: 2_000_000, statementClosingDay: 15, paymentDueDay: 5, isArchived: true,
      }),
    ],
    async list() { return [...this.values]; },
  };
  const budgets = {
    async listMonth(month) {
      return {
        budgets: [{
          id: 'budget', categoryId: 'food', month, limitAmount: 100_000,
          categoryName: '+Food', categoryIcon: 'food', categoryIsArchived: true,
          spent: 125_000, remaining: -25_000, percentageUsed: 125,
          progressWidth: '100%', status: 'over-budget', createdAt: NOW, updatedAt: NOW,
        }],
        summary: {},
      };
    },
  };
  const recurring = {
    async listRules() {
      return [{
        id: 'rule', type: 'expense', amount: 25_000, currency: 'COP', accountId: 'checking',
        destinationAccountId: null, categoryId: 'food', note: '@monthly', frequency: 'monthly', interval: 1,
        startDate: '2026-01-31', nextOccurrenceDate: '2026-08-31', endDate: null,
        isActive: false, endedAt: null, createdAt: NOW, updatedAt: NOW,
        accountName: '=Checking', destinationAccountName: null, categoryName: '-Food',
      }];
    },
  };
  const reports = { async load() { return reportData(); } };
  const transactionFilters = { async listFilterOptions() { return { accounts: [], categories: [] }; } };
  const emptyPortfolio = {
    accounts: [], investmentAccountCount: 0, totalCurrentValueCopMinor: 0, netContributionsCopMinor: 0,
    estimatedGainLossCopMinor: 0, estimatedReturn: { available: false }, lockedOrRestrictedValueCopMinor: 0,
    incomplete: false, allocationByType: [], allocationByCurrency: [],
  };
  const investments = {
    portfolio: emptyPortfolio,
    valuationsByAccount: {},
    async getPortfolio() { return this.portfolio; },
    async listValuations(accountId) { return this.valuationsByAccount[accountId] ?? []; },
  };
  const service = new DataExportService(
    repository, accounts, budgets, recurring, reports, transactionFilters, investments,
    new CsvSerializer(), files, { today: () => TODAY },
  );
  return { accounts, files, investments, repository, service };
}

test('transaction export covers refunds, original references, other types, notes policy, filters, and stable order', async () => {
  const { files, repository, service } = setup();
  repository.transactions = [
    transaction('voided', { transactionDate: '2026-07-11', status: 'voided' }),
    transaction('income', { type: 'income', amountCop: 500_000, categoryId: 'salary', categoryName: 'Salary' }),
    transaction('transfer', {
      transactionDate: '2026-07-12', type: 'transfer', categoryId: null, categoryName: null,
      destinationAccountId: 'card', destinationAccountName: 'Archived card', note: 'Transfer',
    }),
    transaction('archived', { sourceAccountName: 'Old cash', categoryName: 'Old category' }),
    transaction('refund', {
      transactionDate: '2026-07-12',
      type: 'refund',
      amountCop: 10_000,
      originalTransactionId: 'archived',
      originalTransactionDate: '2026-07-10',
      originalTransactionAmountCop: 25_000,
      originalTransactionNote: 'Original note',
    }),
  ];
  const filters = {
    ...createDefaultTransactionListFilters(TODAY),
    datePreset: 'custom', customDateFrom: '2026-07-10', customDateTo: '2026-07-12',
  };
  const result = await service.exportTransactions({ filters, includeNotes: false });
  assert.equal(result.rowCount, 5);
  assert.equal(result.fileName, 'money-control-transactions-2026-07-10-to-2026-07-12.csv');
  const csv = files.calls[0].contents;
  assert.ok(csv.indexOf('income,') < csv.indexOf('voided,'));
  assert.ok(csv.indexOf('voided,') < csv.indexOf('transfer,'));
  assert.match(csv, /transfer,posted,,25000,.*checking,Checking,card,Archived card/);
  // A refund inherits both classification levels from the expense it refunds.
  assert.match(csv, /refund,posted,,10000,.*food,Food,,,archived,2026-07-10,25000,/);
  assert.equal(csv.includes("'=private note"), false);

  await service.exportTransactions({
    filters: { ...filters, type: 'expense', status: 'voided' },
    includeNotes: true,
  });
  assert.deepEqual(repository.lastQuery.types, ['expense']);
  assert.deepEqual(repository.lastQuery.statuses, ['voided']);
  assert.equal(files.calls[1].contents.includes("'=private note"), true);
});

test('no matching transactions and oversized transaction exports are blocked without writing files', async () => {
  const { files, repository, service } = setup();
  const filters = createDefaultTransactionListFilters(TODAY);
  await assert.rejects(
    () => service.exportTransactions({ filters, includeNotes: false }),
    (error) => error instanceof DataExportError && error.code === 'no_data',
  );
  repository.countTransactions = async () => ({ count: 50_001, oldestDate: '2020-01-01', newestDate: TODAY });
  await assert.rejects(
    () => service.exportTransactions({ filters, includeNotes: false }),
    (error) => error instanceof DataExportError && error.code === 'row_limit_exceeded',
  );
  assert.equal(files.calls.length, 0);
});

test('accounts export preserves derived and signed balances with blank non-card fields', async () => {
  const { files, service } = setup();
  await service.exportAccounts();
  const csv = files.calls[0].contents;
  assert.match(csv, /'=Checking,checking,active,COP,100000,75000,75000,/);
  assert.match(csv, /Card,credit_card,archived,COP,-500000,-300000,.*2000000,300000,1700000,15,15,5/);
});

test('budgets and recurring exports preserve domain calculations, lifecycle, archived labels, and optional notes', async () => {
  const { files, service } = setup();
  await service.exportBudgets('2026-07');
  assert.match(files.calls[0].contents, /'\+Food,100000,125000,-25000,125,over-budget/);
  assert.equal(files.calls[0].contents.includes('NaN'), false);
  assert.equal(files.calls[0].contents.includes('Infinity'), false);

  await service.exportRecurringRules({ includeNotes: false });
  assert.match(files.calls[1].contents, /false,paused,,/);
  assert.equal(files.calls[1].contents.includes("'@monthly"), false);
  await service.exportRecurringRules({ includeNotes: true });
  assert.equal(files.calls[2].contents.includes("'@monthly"), true);
});

test('credit-card statement export reuses payment attribution for partial, paid, zero, historical, and archived-card data', async () => {
  const { files, repository, service } = setup();
  const statement = {
    id: 'statement', accountId: 'card', periodStart: '2026-06-16', periodEnd: '2026-07-15',
    closingDate: '2026-07-15', dueDate: '2026-08-05', statementBalance: 300_000,
    minimumPayment: 30_000, createdAt: NOW, updatedAt: NOW,
  };
  repository.statements = [{
    statement,
    cardName: '@Archived card',
    payments: [
      { id: 'before', amount: 500_000, transactionDate: '2026-07-15' },
      { id: 'partial', amount: 100_000, transactionDate: '2026-07-20' },
    ],
  }, {
    statement: { ...statement, id: 'zero', closingDate: '2026-06-15', dueDate: '2026-07-05', statementBalance: 0, minimumPayment: 0 },
    cardName: 'Card',
    payments: [],
  }];
  await service.exportCreditCardStatements();
  const csv = files.calls[0].contents;
  assert.match(csv, /300000,30000,100000,0,200000,minimum-covered/);
  assert.match(csv, /0,0,0,0,0,no-balance-due/);
  assert.equal(csv.includes("'@Archived card"), true);
  assert.equal(csv.includes('installment'), false);
});

test('report summary exports correct metric rows, net worth endpoints, empty-capable values, and protected names', async () => {
  const { files, service } = setup();
  const result = await service.exportReport({ preset: 'current-month' });
  assert.equal(result.fileName, 'money-control-report-2026-07.csv');
  assert.equal(result.rowCount, 15);
  const csv = files.calls[0].contents;
  assert.match(csv, /total_income_cop,500000,2026-07-01,2026-07-31/);
  assert.match(csv, /gross_expenses_cop,150000/);
  assert.match(csv, /refunds_cop,25000/);
  assert.match(csv, /net_expenses_cop,125000/);
  assert.match(csv, /net_result_cop,375000/);
  assert.match(csv, /net_worth_start_cop,1000000/);
  assert.match(csv, /net_worth_end_cop,1375000/);
  assert.equal(csv.includes("'=Utilities"), true);
});

test('export workflow uses Bogotá filenames, reports native interface opening, and performs stale cleanup', async () => {
  const { files, service } = setup();
  const result = await service.exportAccounts();
  assert.equal(result.fileName, 'money-control-accounts-2026-07-21.csv');
  assert.equal(result.nativeInterfaceOpened, true);
  assert.ok(result.fileSize > 0);
  await service.cleanupStaleFiles();
  assert.equal(files.cleanupCalls, 1);
});

test('exported schemas exclude security, notification, backup, and migration internals', async () => {
  const { files, service } = setup();
  await service.exportAccounts();
  const csv = files.calls[0].contents;
  for (const forbidden of [
    'pin', 'saltHex', 'derivedKeyHex', 'biometric', 'SecureStore',
    'scheduled_notifications', '__drizzle_migrations', 'backup_format',
  ]) assert.equal(csv.includes(forbidden), false);
});

function investmentView(id, overrides) {
  const base = {
    account: { id, name: id, currency: 'COP', isArchived: false },
    metadata: { providerName: null, investmentType: 'brokerage', trackingMode: 'balance', liquidity: 'liquid', startDate: null, maturityDate: null },
    latestValuation: null,
    netContributionsMinor: 0, totalContributionsMinor: 0, totalWithdrawalsMinor: 0,
    currentValueMinor: 0, estimatedGainLossMinor: 0, estimatedReturn: { available: false },
    estimatedValueCopMinor: null,
    ...overrides,
  };
  return base;
}

test('investment export protects names, shows estimated COP, unavailable return, and archived status', async () => {
  const { files, investments, service } = setup();
  investments.portfolio = {
    ...investments.portfolio,
    investmentAccountCount: 2,
    accounts: [
      investmentView('trii', {
        account: { id: 'trii', name: '=Trii', currency: 'COP', isArchived: false },
        metadata: { providerName: '+Bancolombia', investmentType: 'brokerage', trackingMode: 'balance', liquidity: 'liquid', startDate: null, maturityDate: '2027-01-15' },
        latestValuation: { valuationDate: '2026-07-16' },
        netContributionsMinor: 8_000_000, totalContributionsMinor: 8_000_000, totalWithdrawalsMinor: 0,
        currentValueMinor: 8_500_000, estimatedGainLossMinor: 500_000, estimatedReturn: { available: true, basisPoints: 625 },
        estimatedValueCopMinor: 8_500_000,
      }),
      investmentView('ibkr', {
        account: { id: 'ibkr', name: 'IBKR', currency: 'USD', isArchived: true },
        netContributionsMinor: 1_000_000, totalContributionsMinor: 1_000_000, totalWithdrawalsMinor: 0,
        currentValueMinor: 1_250_000, estimatedGainLossMinor: 250_000, estimatedReturn: { available: false },
        estimatedValueCopMinor: null,
      }),
    ],
  };

  const result = await service.exportInvestments();
  assert.match(result.fileName, /^money-control-investments-2026-07-21\.csv$/);
  const csv = files.calls[0].contents;
  assert.match(csv, /investment_account_id,account_name,provider_name,investment_type,tracking_mode,liquidity,currency_code,current_value_minor,current_value_display,estimated_value_cop,total_contributions_minor,total_withdrawals_minor,net_contributions_minor,estimated_gain_loss_minor,estimated_return_percentage,latest_valuation_date,start_date,maturity_date,status/);
  // Sorted by account id: ibkr (USD, archived, no rate) before trii.
  assert.match(csv, /ibkr,IBKR,,brokerage,balance,liquid,USD,1250000,/);
  // Empty estimated COP (no rate), empty return/dates, archived status.
  assert.match(csv, /,,1000000,0,1000000,250000,,,,,archived/);
  // Trii: formula-protected name and provider, estimated COP present, 6.25% return, active.
  assert.match(csv, /trii,'=Trii,'\+Bancolombia,brokerage,balance,liquid,COP,8500000,[^,]+,8500000,8000000,0,8000000,500000,6.25,2026-07-16,,2027-01-15,active/);
});

test('investment valuations export lists history with protected notes and value display', async () => {
  const { files, investments, service } = setup();
  investments.portfolio = {
    ...investments.portfolio,
    investmentAccountCount: 1,
    accounts: [investmentView('trii', { account: { id: 'trii', name: '=Trii', currency: 'COP', isArchived: false } })],
  };
  investments.valuationsByAccount = {
    trii: [
      { id: 'v1', investmentAccountId: 'trii', valueMinor: 8_500_000, basisMinor: 8_000_000, currencyCode: 'COP', valuationDate: '2026-07-16', note: '=formula note', createdAt: NOW, updatedAt: NOW },
    ],
  };

  const result = await service.exportInvestmentValuations();
  assert.match(result.fileName, /^money-control-investment-valuations-2026-07-21\.csv$/);
  const csv = files.calls[0].contents;
  assert.match(csv, /valuation_id,investment_account_id,account_name,valuation_date,currency_code,value_minor,value_display,note,created_at,updated_at/);
  assert.match(csv, /v1,trii,'=Trii,2026-07-16,COP,8500000,[^,]+,'=formula note,/);
});

test('investment exports refuse to create a file when there are no investments', async () => {
  const { files, service } = setup();
  await assert.rejects(() => service.exportInvestments(), (error) => error instanceof DataExportError && error.code === 'no_data');
  await assert.rejects(() => service.exportInvestmentValuations(), (error) => error instanceof DataExportError && error.code === 'no_data');
  assert.equal(files.calls.length, 0);
});
