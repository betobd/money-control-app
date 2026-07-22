import assert from 'node:assert/strict';
import test from 'node:test';

import { CreditCardCycleService, calendarDaysBetween, dueDateAfterClosing } from '../src/features/credit-cards/credit-card-cycle.service.ts';
import {
  CreditCardOverpaymentConfirmationRequired,
  CreditCardPaymentService,
  CreditCardPaymentValidationError,
} from '../src/features/credit-cards/credit-card-payment.service.ts';
import { CreditCardStatementService, CreditCardStatementValidationError } from '../src/features/credit-cards/credit-card-statement.service.ts';
import { calculateCreditCardUtilization } from '../src/features/credit-cards/credit-card-utilization.ts';

const NOW = '2026-07-21T12:00:00.000Z';
const card = { id: 'card', name: 'Visa', type: 'credit_card', currency: 'COP', openingBalance: -500_000, creditLimit: 2_000_000, statementClosingDay: 15, paymentDueDay: 5, isArchived: false, archivedAt: null, createdAt: NOW, updatedAt: NOW, balance: -500_000 };
const checking = { ...card, id: 'checking', name: 'Checking', type: 'checking', openingBalance: 1_000_000, creditLimit: null, statementClosingDay: null, paymentDueDay: null, balance: 1_000_000 };

test('resolves closing periods, next dates, and due dates without month-end drift', () => {
  const service = new CreditCardCycleService();
  assert.deepEqual(service.resolve(15, 5, '2026-07-21'), {
    previousClosingDate: '2026-07-15', nextClosingDate: '2026-08-15', currentPeriodStart: '2026-06-16', currentPeriodEnd: '2026-07-15', nextDueDate: '2026-08-05',
  });
  assert.deepEqual(service.resolve(15, 20, '2026-07-10'), {
    previousClosingDate: '2026-06-15', nextClosingDate: '2026-07-15', currentPeriodStart: '2026-05-16', currentPeriodEnd: '2026-06-15', nextDueDate: '2026-07-20',
  });
  assert.equal(service.resolve(31, 10, '2026-02-28').previousClosingDate, '2026-02-28');
  assert.equal(service.resolve(31, 10, '2028-02-29').previousClosingDate, '2028-02-29');
  assert.equal(dueDateAfterClosing('2026-03-31', 31), '2026-04-30');
  assert.equal(calendarDaysBetween('2026-07-21', '2026-08-05'), 15);
});

test('calculates utilization with signed debt, positive card balances, and exact boundaries', () => {
  assert.deepEqual(calculateCreditCardUtilization(100_000, 1_000_000), { currentDebt: 0, availableCredit: 1_000_000, utilizationBasisPoints: 0, visualProgressWidth: '0%', status: 'low' });
  assert.equal(calculateCreditCardUtilization(-300_000, 1_000_000).status, 'moderate');
  assert.equal(calculateCreditCardUtilization(-500_000, 1_000_000).status, 'high');
  assert.equal(calculateCreditCardUtilization(-800_000, 1_000_000).status, 'very-high');
  assert.equal(calculateCreditCardUtilization(-1_000_000, 1_000_000).status, 'over-limit');
  assert.equal(calculateCreditCardUtilization(-1_500_000, 1_000_000).visualProgressWidth, '100%');
  assert.equal(calculateCreditCardUtilization(-1, 0).status, 'unavailable');
});

class StatementRepository {
  statements = [];
  payments = [];
  async createStatement(value) { this.statements.push(value); }
  async findStatementByClosingDate(accountId, closingDate) { return this.statements.find((value) => value.accountId === accountId && value.closingDate === closingDate) ?? null; }
  async listPaymentsAfter(accountId, date) { return this.payments.filter((value) => value.accountId === accountId && value.transactionDate > date && value.status === 'posted'); }
  async listStatements(accountId) { return this.statements.filter((value) => value.accountId === accountId).sort((a, b) => b.closingDate.localeCompare(a.closingDate)); }
  async updateStatement(id, update) { Object.assign(this.statements.find((value) => value.id === id), update); }
}

function statementContext() {
  const repository = new StatementRepository();
  const accounts = { async findById(id) { return id === card.id ? card : null; } };
  const service = new CreditCardStatementService(repository, accounts, new CreditCardCycleService(), () => `statement-${repository.statements.length + 1}`, () => NOW);
  return { repository, service };
}

const validStatement = { accountId: 'card', periodStart: '2026-06-16', periodEnd: '2026-07-15', closingDate: '2026-07-15', dueDate: '2026-08-05', statementBalance: 400_000, minimumPayment: 40_000 };

test('new statement defaults contain cycle dates but do not invent monetary values', async () => {
  const { service } = statementContext();
  const defaults = await service.defaults('card', '2026-07-21');
  assert.deepEqual(defaults, {
    accountId: 'card', periodStart: '2026-06-16', periodEnd: '2026-07-15', closingDate: '2026-07-15', dueDate: '2026-08-05',
  });
  assert.equal('statementBalance' in defaults, false);
  assert.equal('minimumPayment' in defaults, false);
});

test('validates positive and intentional zero statements while preserving financial balances', async () => {
  const { repository, service } = statementContext();
  const balanceBefore = card.balance;
  const netWorthBefore = card.balance + checking.balance;
  await service.save(validStatement);
  await service.save({ ...validStatement, closingDate: '2026-08-15', periodStart: '2026-07-16', periodEnd: '2026-08-15', dueDate: '2026-09-05', statementBalance: 0, minimumPayment: 0 });
  assert.equal(repository.statements.length, 2);
  assert.equal(card.balance, balanceBefore);
  assert.equal(card.balance + checking.balance, netWorthBefore);
});

test('rejects invalid statement money and date ordering with field errors', async () => {
  const { service } = statementContext();
  for (const input of [
    { ...validStatement, statementBalance: -1 },
    { ...validStatement, statementBalance: 1.5 },
    { ...validStatement, statementBalance: Number.MAX_SAFE_INTEGER + 1 },
    { ...validStatement, minimumPayment: -1 },
    { ...validStatement, minimumPayment: 1.5 },
    { ...validStatement, minimumPayment: 500_000 },
    { ...validStatement, periodStart: '2026-07-16' },
    { ...validStatement, dueDate: '2026-07-14' },
  ]) {
    await assert.rejects(() => service.save(input), CreditCardStatementValidationError);
  }
});

test('updates the matching statement and preserves newest-first history', async () => {
  const { repository, service } = statementContext();
  await service.save(validStatement);
  await service.save({ ...validStatement, statementBalance: 350_000 });
  await service.save({ ...validStatement, closingDate: '2026-08-15', periodStart: '2026-07-16', periodEnd: '2026-08-15', dueDate: '2026-09-05' });
  assert.equal(repository.statements.length, 2);
  assert.equal(repository.statements[0].statementBalance, 350_000);
  const views = await service.listViews('card', '2026-08-16');
  assert.deepEqual(views.map((view) => view.closingDate), ['2026-08-15', '2026-07-15']);
});

test('attributes qualifying payments and calculates minimum, remaining, timing, and status', async () => {
  const { repository, service } = statementContext();
  await service.save(validStatement);
  repository.payments = [
    { id: 'before', accountId: 'card', amount: 50_000, transactionDate: '2026-07-15', status: 'posted' },
    { id: 'one', accountId: 'card', amount: 20_000, transactionDate: '2026-07-20', status: 'posted' },
    { id: 'due', accountId: 'card', amount: 180_000, transactionDate: '2026-08-05', status: 'posted' },
    { id: 'late', accountId: 'card', amount: 250_000, transactionDate: '2026-08-06', status: 'posted' },
    { id: 'future', accountId: 'card', amount: 700_000, transactionDate: '2026-08-08', status: 'posted' },
    { id: 'voided', accountId: 'card', amount: 500_000, transactionDate: '2026-07-22', status: 'voided' },
    { id: 'other-card', accountId: 'other', amount: 500_000, transactionDate: '2026-07-22', status: 'posted' },
  ];
  const [partial] = await service.listViews('card', '2026-07-20');
  assert.equal(partial.minimumPaidAmount, 20_000);
  assert.equal(partial.minimumRemaining, 20_000);
  assert.equal(partial.minimumCovered, false);
  assert.equal(partial.remainingStatement, 380_000);
  assert.equal(partial.status, 'partially-paid');

  const [paid] = await service.listViews('card', '2026-08-07');
  assert.equal(paid.amountPaidByDueDate, 200_000);
  assert.equal(paid.amountPaidAfterDueDate, 250_000);
  assert.equal(paid.minimumPaidAmount, 40_000);
  assert.equal(paid.minimumRemaining, 0);
  assert.equal(paid.remainingStatement, 0);
  assert.equal(paid.overpayment, 50_000);
  assert.equal(paid.paidOnTime, false);
  assert.equal(paid.status, 'paid');
});

test('distinguishes upcoming, balance due, minimum covered, overdue, paid, and zero-balance states', async () => {
  const { repository, service } = statementContext();
  await service.save(validStatement);
  assert.equal((await service.listViews('card', '2026-07-10'))[0].status, 'upcoming');
  assert.equal((await service.listViews('card', '2026-07-21'))[0].status, 'balance-due');
  repository.payments = [{ id: 'minimum', accountId: 'card', amount: 40_000, transactionDate: '2026-07-21', status: 'posted' }];
  assert.equal((await service.listViews('card', '2026-07-21'))[0].status, 'minimum-covered');
  assert.equal((await service.listViews('card', '2026-08-06'))[0].status, 'overdue');
  repository.payments = [{ id: 'full', accountId: 'card', amount: 400_000, transactionDate: '2026-07-21', status: 'posted' }];
  assert.equal((await service.listViews('card', '2026-07-21'))[0].status, 'paid');

  const zero = statementContext();
  await zero.service.save({ ...validStatement, statementBalance: 0, minimumPayment: 0 });
  assert.equal((await zero.service.listViews('card', '2026-07-21'))[0].status, 'no-balance-due');
});

function statementView(overrides = {}) {
  return {
    id: 'statement', accountId: 'card', periodStart: '2026-06-16', periodEnd: '2026-07-15', closingDate: '2026-07-15', dueDate: '2026-08-05',
    statementBalance: 400_000, minimumPayment: 40_000, createdAt: NOW, updatedAt: NOW,
    amountPaid: 10_000, amountPaidByDueDate: 10_000, amountPaidAfterDueDate: 0,
    remainingStatement: 390_000, overpayment: 0, minimumPaidAmount: 10_000,
    minimumRemaining: 30_000, minimumCovered: false, paidOnTime: false, status: 'partially-paid',
    ...overrides,
  };
}

function cardDetails(overrides = {}) {
  const latestStatement = overrides.latestStatement === undefined ? statementView() : overrides.latestStatement;
  return {
    account: card,
    setupComplete: true,
    cycle: null,
    utilization: calculateCreditCardUtilization(card.balance, card.creditLimit),
    statements: latestStatement ? [latestStatement] : [],
    latestStatement,
    recentPurchases: [],
    recentPayments: [],
    ...overrides,
  };
}

function paymentContext(details = cardDetails()) {
  const created = [];
  const service = new CreditCardPaymentService(
    { async getDetails() { return details; } },
    { async list() { return [card, checking]; } },
    { async create(input) { created.push(input); return { ...input, id: `tx-${created.length}`, status: 'posted', currency: 'COP', createdAt: NOW, updatedAt: NOW }; } },
  );
  return { created, service };
}

test('models no-statement and no-debt payment choices as explicitly unavailable', async () => {
  const noStatement = cardDetails({ latestStatement: null, statements: [] });
  const { service } = paymentContext(noStatement);
  const options = service.getPaymentOptions(noStatement);
  assert.deepEqual(options.slice(0, 2).map(({ isAvailable, unavailableReason }) => ({ isAvailable, unavailableReason })), [
    { isAvailable: false, unavailableReason: 'No statement recorded.' },
    { isAvailable: false, unavailableReason: 'No statement recorded.' },
  ]);
  await assert.rejects(
    () => service.preview({ cardAccountId: 'card', sourceAccountId: 'checking', option: 'minimum-payment', amount: null, transactionDate: '2026-07-21', note: null }),
    (error) => error instanceof CreditCardPaymentValidationError && error.message === 'No statement recorded.',
  );

  for (const balance of [0, 100_000]) {
    const zeroDebt = cardDetails({ account: { ...card, balance }, utilization: calculateCreditCardUtilization(balance, card.creditLimit), latestStatement: null, statements: [] });
    assert.equal(paymentContext(zeroDebt).service.getPaymentOptions(zeroDebt)[2].unavailableReason, 'No current debt to pay.');
  }
});

test('minimum and remaining options use explicit positive amounts and disable covered values', () => {
  const details = cardDetails();
  const { service } = paymentContext(details);
  const options = service.getPaymentOptions(details);
  assert.equal(options[0].amount, 30_000);
  assert.equal(options[1].amount, 390_000);
  assert.equal(options[2].amount, 500_000);

  const covered = cardDetails({ latestStatement: statementView({ minimumRemaining: 0, minimumCovered: true }) });
  assert.equal(service.getPaymentOptions(covered)[0].unavailableReason, 'Minimum payment already covered.');
  const zeroMinimum = cardDetails({ latestStatement: statementView({ minimumPayment: 0, minimumRemaining: 0, minimumCovered: true }) });
  assert.equal(service.getPaymentOptions(zeroMinimum)[0].unavailableReason, 'No minimum payment due.');
  const paid = cardDetails({ latestStatement: statementView({ remainingStatement: 0, status: 'paid' }) });
  assert.equal(service.getPaymentOptions(paid)[1].unavailableReason, 'Latest statement already paid.');
});

test('payment preview resolves amounts and projects debt, partial statement, and newer charges', async () => {
  const { service } = paymentContext();
  const common = { cardAccountId: 'card', sourceAccountId: 'checking', transactionDate: '2026-07-21', note: null };
  const minimum = await service.preview({ ...common, option: 'minimum-payment', amount: null });
  assert.equal(minimum.amount, 30_000);
  assert.equal(minimum.expectedDebt, 470_000);
  assert.equal(minimum.expectedStatementRemaining, 360_000);
  const currentDebt = await service.preview({ ...common, option: 'current-debt', amount: null });
  assert.equal(currentDebt.amount, 500_000);
  assert.equal(currentDebt.expectedDebt, 0);
  assert.equal(currentDebt.expectedStatementRemaining, 0);
  assert.equal(currentDebt.amountBeyondStatement, 110_000);
});

test('predefined and other payment options each create exactly one normal transfer', async () => {
  const { created, service } = paymentContext();
  const common = { cardAccountId: 'card', sourceAccountId: 'checking', transactionDate: '2026-07-21', note: null };
  await service.pay({ ...common, option: 'minimum-payment', amount: null });
  await service.pay({ ...common, option: 'statement-remaining', amount: null });
  await service.pay({ ...common, option: 'current-debt', amount: null });
  await service.pay({ ...common, option: 'other', amount: 100_000 });
  assert.equal(created.length, 4);
  assert.ok(created.every((input) => input.type === 'transfer' && input.destinationAccountId === 'card'));
});

test('other amount keeps strict validation and explicit overpayment confirmation', async () => {
  const { created, service } = paymentContext();
  const common = { cardAccountId: 'card', sourceAccountId: 'checking', transactionDate: '2026-07-21', note: null, option: 'other' };
  for (const amount of [0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
    await assert.rejects(() => service.pay({ ...common, amount }), CreditCardPaymentValidationError);
  }
  await assert.rejects(() => service.pay({ ...common, amount: 650_000 }), CreditCardOverpaymentConfirmationRequired);
  assert.equal(created.length, 0);
  const result = await service.pay({ ...common, amount: 650_000, confirmOverpayment: true });
  assert.equal(result.type, 'transfer');
  assert.equal(created.length, 1);
});
