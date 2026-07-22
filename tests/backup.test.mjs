import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';

import { backupLimits, utf8ByteLength } from '../src/features/backup/backup-limits.ts';
import { BackupChecksumService, canonicalizeJson, checksumInput } from '../src/features/backup/backup-checksum.service.ts';
import { BackupFormatMigrator, UnsupportedBackupVersionError } from '../src/features/backup/backup-format-migrator.ts';
import { createBackupFileName, BackupSerializer } from '../src/features/backup/backup-serializer.ts';
import { BackupService } from '../src/features/backup/backup.service.ts';
import { BackupValidationError, BackupValidator } from '../src/features/backup/backup-validator.ts';

const NOW = '2026-07-17T00:30:00.000Z';
const checksum = new BackupChecksumService(async (value) => createHash('sha256').update(value).digest('hex'));
const serializer = new BackupSerializer(checksum);
const validator = new BackupValidator();
const migrator = new BackupFormatMigrator();

const account = (id, overrides = {}) => ({
  id,
  name: id,
  type: 'checking',
  currency: 'COP',
  openingBalance: 1_000_000,
  creditLimit: null,
  statementClosingDay: null,
  paymentDueDay: null,
  isArchived: false,
  archivedAt: null,
  createdAt: NOW,
  updatedAt: NOW,
  ...overrides,
});

const category = (id, type, overrides = {}) => ({
  id,
  name: id,
  type,
  icon: 'other',
  isArchived: false,
  archivedAt: null,
  createdAt: NOW,
  updatedAt: NOW,
  ...overrides,
});

const transaction = (id, overrides = {}) => ({
  id,
  type: 'expense',
  status: 'posted',
  amount: 50_000,
  currency: 'COP',
  accountId: 'checking',
  destinationAccountId: null,
  categoryId: 'food',
  note: 'Preserved note',
  transactionDate: '2026-07-16',
  createdAt: NOW,
  updatedAt: NOW,
  ...overrides,
});

function representativeData() {
  return {
    accounts: [
      account('savings', { name: 'Savings', type: 'savings', openingBalance: 500_000 }),
      account('checking', { name: 'Checking' }),
      account('card', { name: 'Card', type: 'credit_card', openingBalance: -200_000, creditLimit: 2_000_000, statementClosingDay: 15, paymentDueDay: 5 }),
      account('archived-account', { name: 'Old cash', type: 'cash', isArchived: true, archivedAt: NOW }),
    ],
    categories: [
      category('salary', 'income', { name: 'Salary' }),
      category('food', 'expense', { name: 'Food' }),
      category('archived-category', 'expense', { name: 'Old bills', isArchived: true, archivedAt: NOW }),
    ],
    transactions: [
      transaction('transfer', { type: 'transfer', accountId: 'checking', destinationAccountId: 'savings', categoryId: null }),
      transaction('income', { type: 'income', amount: 300_000, categoryId: 'salary' }),
      transaction('expense', { categoryId: 'archived-category' }),
      transaction('voided', { status: 'voided', amount: 20_000 }),
    ],
    transactionSplits: [
      { id: 'split', transactionId: 'expense', accountId: 'checking', amount: -50_000, position: 0 },
    ],
    budgets: [
      { id: 'budget', categoryId: 'food', month: '2026-07', limitAmount: 500_000, createdAt: NOW, updatedAt: NOW },
    ],
    recurringTransactions: [
      {
        id: 'rule', type: 'expense', amount: 50_000, currency: 'COP', accountId: 'checking',
        destinationAccountId: null, categoryId: 'food', note: 'Monthly', frequency: 'monthly', interval: 1,
        startDate: '2026-07-16', nextOccurrenceDate: '2026-09-16', endDate: null,
        isActive: true, endedAt: null, createdAt: NOW, updatedAt: NOW,
      },
    ],
    recurringOccurrences: [
      {
        id: 'occurrence-posted', recurringTransactionId: 'rule', scheduledDate: '2026-07-16', status: 'posted',
        type: 'expense', amount: 50_000, currency: 'COP', accountId: 'checking', destinationAccountId: null,
        categoryId: 'food', note: 'Monthly', transactionId: 'expense', createdAt: NOW, updatedAt: NOW,
      },
      {
        id: 'occurrence-pending', recurringTransactionId: 'rule', scheduledDate: '2026-08-16', status: 'pending',
        type: 'expense', amount: 50_000, currency: 'COP', accountId: 'checking', destinationAccountId: null,
        categoryId: 'food', note: 'Monthly', transactionId: null, createdAt: NOW, updatedAt: NOW,
      },
    ],
    creditCardStatements: [
      { id: 'statement', accountId: 'card', periodStart: '2026-06-16', periodEnd: '2026-07-15', closingDate: '2026-07-15', dueDate: '2026-08-05', statementBalance: 200_000, minimumPayment: 20_000, createdAt: NOW, updatedAt: NOW },
    ],
  };
}

const emptyData = () => ({
  accounts: [], categories: [], transactions: [], transactionSplits: [], budgets: [],
  recurringTransactions: [], recurringOccurrences: [],
  creditCardStatements: [],
});

async function createFile(data = representativeData()) {
  return serializer.create(data, { appVersion: '1.0.0', schemaVersion: '0005', createdAt: NOW });
}

async function resign(file) {
  file.integrity.checksum = await checksum.calculate(file);
  return file;
}

async function validate(file, declaredSize = 0) {
  const text = serializer.stringify(file);
  const envelope = validator.parseEnvelope(text, declaredSize);
  migrator.assertSupported(envelope.formatVersion);
  const typed = envelope.formatVersion === 1 ? validator.validateV1(envelope.raw) : validator.validateV2(envelope.raw);
  validator.validateRelationships(typed);
  if (!(await checksum.verify(typed))) throw validator.checksumMismatch();
  return migrator.migrate(typed);
}

async function invalid(mutator, expectedCode) {
  const file = structuredClone(await createFile());
  mutator(file);
  await resign(file);
  await assert.rejects(
    () => validate(file),
    (error) => error instanceof BackupValidationError
      && error.issues.some((item) => item.code === expectedCode),
  );
}

test('generates the versioned format, UTC/Bogotá/COP metadata, all collections, counts, and archived rows', async () => {
  const file = await createFile();
  assert.equal(file.format, 'money-control-backup');
  assert.equal(file.formatVersion, 2);
  assert.equal(file.createdAt, NOW);
  assert.equal(file.timezone, 'America/Bogota');
  assert.equal(file.currency, 'COP');
  assert.equal(file.schemaVersion, '0005');
  assert.deepEqual(file.summary, {
    accounts: 4, categories: 3, transactions: 4, transactionSplits: 1,
    budgets: 1, recurringRules: 1, recurringOccurrences: 2, creditCardStatements: 1,
  });
  assert.equal(file.data.accounts.some((row) => row.id === 'archived-account' && row.isArchived), true);
  assert.equal(file.data.categories.some((row) => row.id === 'archived-category' && row.isArchived), true);
  assert.equal(file.data.transactionSplits.length, 1);
  assert.match(file.integrity.checksum, /^[a-f0-9]{64}$/);
  assert.equal(await checksum.verify(file), true);
  const serialized = serializer.stringify(file);
  for (const forbidden of [
    'money_control_app_lock_config_v1',
    'money_control_pin_verifier_v1',
    'money_control_pin_verifier_pending_v1',
    'money_control_app_lock_attempts_v1',
    'saltHex',
    'derivedKeyHex',
    'biometricUnlockEnabled',
    'failedAttempts',
    'lockoutUntilEpochMs',
  ]) assert.equal(serialized.includes(forbidden), false);
});

test('orders every collection by ID and produces the same checksum for the same canonical data', async () => {
  const data = representativeData();
  const first = await createFile(data);
  const reversed = Object.fromEntries(Object.entries(data).map(([key, rows]) => [key, [...rows].reverse()]));
  const second = await createFile(reversed);
  assert.deepEqual(first.data, second.data);
  assert.equal(first.integrity.checksum, second.integrity.checksum);
  assert.equal(canonicalizeJson(checksumInput(first)), canonicalizeJson(checksumInput(second)));
});

test('checksum excludes only its own value and detects changed content or checksum', async () => {
  const file = await createFile();
  const originalCanonical = canonicalizeJson(checksumInput(file));
  file.integrity.checksum = '0'.repeat(64);
  assert.equal(canonicalizeJson(checksumInput(file)), originalCanonical);
  assert.equal(await checksum.verify(file), false);
  await assert.rejects(() => validate(file), (error) => error instanceof BackupValidationError && error.issues[0].code === 'checksum_mismatch');

  const changed = await createFile();
  changed.data.transactions[0].amount += 1;
  assert.equal(await checksum.verify(changed), false);
});

test('handles an empty database and a realistic 10,000-transaction dataset', async () => {
  const empty = await createFile(emptyData());
  assert.equal(empty.summary.transactions, 0);
  assert.deepEqual(empty.transactionDateRange, { oldest: null, newest: null });
  await validate(empty);

  const data = emptyData();
  data.accounts.push(account('checking', { name: 'Checking' }));
  data.categories.push(category('food', 'expense', { name: 'Food' }));
  data.transactions = Array.from({ length: 10_000 }, (_, index) => transaction(`tx-${String(index).padStart(5, '0')}`, { note: null }));
  const large = await createFile(data);
  assert.equal(large.summary.transactions, 10_000);
  assert.equal(await checksum.verify(large), true);
  await validate(large);
});

test('creates a filesystem-safe Bogotá-local filename while keeping internal UTC time', () => {
  assert.equal(createBackupFileName(NOW), 'money-control-backup-2026-07-16-193000.json');
});

test('rejects invalid JSON, wrong format, unsupported future format, and oversized/deep input', async () => {
  assert.throws(() => validator.parseEnvelope('{not json', 9), (error) => error instanceof BackupValidationError && error.issues[0].code === 'invalid_json');
  const file = await createFile();
  file.format = 'other-format';
  assert.throws(() => validator.parseEnvelope(JSON.stringify(file), 0), (error) => error instanceof BackupValidationError && error.issues[0].code === 'wrong_format');
  const future = await createFile();
  future.formatVersion = 3;
  const envelope = validator.parseEnvelope(JSON.stringify(future), 0);
  assert.throws(() => migrator.assertSupported(envelope.formatVersion), UnsupportedBackupVersionError);
  assert.throws(() => validator.parseEnvelope('{}', backupLimits.maxFileBytes + 1), (error) => error instanceof BackupValidationError && error.issues[0].code === 'file_too_large');
  const deep = `${'['.repeat(9)}0${']'.repeat(9)}`;
  assert.throws(() => validator.parseEnvelope(deep, utf8ByteLength(deep)), (error) => error instanceof BackupValidationError && error.issues[0].code === 'nesting_too_deep');
});

test('rejects missing collections, duplicate IDs, invalid dates, fractional and unsafe money', async () => {
  await invalid((file) => { delete file.data.budgets; }, 'invalid_structure');
  await invalid((file) => { file.data.accounts.push({ ...file.data.accounts[0] }); }, 'duplicate_id');
  await invalid((file) => { file.data.transactions[0].transactionDate = '2026-02-30'; }, 'invalid_value');
  await invalid((file) => { file.data.accounts[0].createdAt = '2026-02-30T00:00:00.000Z'; }, 'invalid_value');
  await invalid((file) => { file.data.transactions[0].amount = 1.5; }, 'invalid_value');
  await invalid((file) => { file.data.transactions[0].amount = Number.MAX_SAFE_INTEGER + 1; }, 'invalid_value');
});

test('rejects missing account, destination, category, budget-category, recurring-rule, and posted-transaction references', async () => {
  await invalid((file) => { file.data.transactions[0].accountId = 'missing'; }, 'missing_reference');
  await invalid((file) => { file.data.transactions.find((row) => row.type === 'transfer').destinationAccountId = 'missing'; }, 'missing_reference');
  await invalid((file) => { file.data.transactions.find((row) => row.type === 'expense').categoryId = 'missing'; }, 'missing_reference');
  await invalid((file) => { file.data.budgets[0].categoryId = 'missing'; }, 'missing_reference');
  await invalid((file) => { file.data.recurringOccurrences[0].recurringTransactionId = 'missing'; }, 'missing_reference');
  await invalid((file) => {
    file.data.recurringOccurrences.find((row) => row.status === 'posted').transactionId = 'missing';
  }, 'missing_reference');
});

test('rejects category mismatches, duplicate budget pairs, duplicate occurrences, and duplicate posted links', async () => {
  await invalid((file) => { file.data.budgets[0].categoryId = 'salary'; }, 'domain_mismatch');
  await invalid((file) => { file.data.budgets.push({ ...file.data.budgets[0], id: 'budget-2' }); }, 'duplicate_constraint');
  await invalid((file) => { file.data.recurringOccurrences.push({ ...file.data.recurringOccurrences[0], id: 'occurrence-2' }); }, 'duplicate_constraint');
  await invalid((file) => {
    const pending = file.data.recurringOccurrences.find((row) => row.status === 'pending');
    pending.status = 'posted';
    pending.transactionId = 'expense';
  }, 'duplicate_constraint');
});

class MemoryRepository {
  constructor(data) { this.data = data; this.replacements = 0; }
  async readOverview() {
    const file = await createFile(this.data);
    return { summary: file.summary, transactionDateRange: file.transactionDateRange };
  }
  async readSnapshot() { return structuredClone(this.data); }
  async replaceAll(data) { this.data = structuredClone(data); this.replacements += 1; const file = await createFile(data); return { summary: file.summary, transactionDateRange: file.transactionDateRange }; }
}

class MemoryFiles {
  constructor() { this.pickResult = { status: 'cancelled' }; this.shared = []; }
  async pickBackupFile() { return this.pickResult; }
  async writeAndShare(fileName, contents) { this.shared.push({ fileName, contents }); return { fileSize: utf8ByteLength(contents) }; }
}

function serviceContext(data = representativeData()) {
  const repository = new MemoryRepository(data);
  const files = new MemoryFiles();
  let refreshes = 0;
  const service = new BackupService(repository, serializer, validator, checksum, migrator, files, {
    appVersion: '1.0.0', schemaVersion: '0005', now: () => NOW, notifyRestored: () => { refreshes += 1; },
  });
  return { repository, files, service, refreshes: () => refreshes };
}

test('coordinates export, content-based import, picker cancellation, restore, and one global refresh', async () => {
  const context = serviceContext();
  const exported = await context.service.createBackup();
  assert.equal(exported.nativeShareOpened, true);
  assert.equal(context.files.shared.length, 1);
  assert.equal(context.files.shared[0].contents.includes('Preserved note'), true);
  assert.deepEqual(await context.service.selectBackup(), { status: 'cancelled' });

  context.files.pickResult = {
    status: 'selected',
    file: { fileName: 'renamed.bin', fileSize: utf8ByteLength(context.files.shared[0].contents), text: context.files.shared[0].contents },
  };
  const selected = await context.service.selectBackup();
  assert.equal(selected.status, 'ready');
  assert.equal(selected.candidate.preview.compatible, true);
  await context.service.restore(selected.candidate);
  assert.equal(context.repository.replacements, 1);
  assert.equal(context.refreshes(), 1);
});

test('does not replace or publish refresh for a tampered selected backup', async () => {
  const context = serviceContext();
  const file = await createFile();
  file.data.transactions[0].note = 'tampered';
  const text = serializer.stringify(file);
  context.files.pickResult = { status: 'selected', file: { fileName: 'backup.json', fileSize: utf8ByteLength(text), text } };
  await assert.rejects(() => context.service.selectBackup(), BackupValidationError);
  assert.equal(context.repository.replacements, 0);
  assert.equal(context.refreshes(), 0);
});

test('migrates format v1 in memory with setup-incomplete cards and no invented statements', async () => {
  const current = await createFile();
  const legacy = structuredClone(current);
  legacy.formatVersion = 1;
  delete legacy.summary.creditCardStatements;
  delete legacy.data.creditCardStatements;
  legacy.data.accounts = legacy.data.accounts.map(({ statementClosingDay: _closing, paymentDueDay: _due, ...account }) => account);
  legacy.integrity.checksum = await checksum.calculate(legacy);
  const envelope = validator.parseEnvelope(JSON.stringify(legacy), 0);
  migrator.assertSupported(envelope.formatVersion);
  const validated = validator.validateV1(envelope.raw);
  validator.validateRelationships(validated);
  assert.equal(await checksum.verify(validated), true);
  const migrated = migrator.migrate(validated);
  assert.deepEqual(migrated.creditCardStatements, []);
  assert.equal(migrated.accounts.find((account) => account.id === 'card').statementClosingDay, null);
  assert.equal(migrated.accounts.find((account) => account.id === 'card').paymentDueDay, null);
});
