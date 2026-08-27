import type { SQLiteDatabase } from 'expo-sqlite';

import { sqlite } from '@/database/client';
import { isSupportedCurrency, type CurrencyCode } from '@/features/currency/currency';
import type { ExchangeRateSnapshotSource, TransactionRecord } from '@/features/transactions/transaction.types';
import { RefundActionError } from './refund.service';
import type { RefundCreateRecord, RefundRepository } from './refund.types';

type OriginalRow = {
  id: string;
  type: string;
  status: string;
  amount: number;
  account_id: string | null;
  transaction_date: string;
  refunded_amount: number;
};

type RefundRow = {
  id: string;
  type: string;
  status: string;
  amount: number;
  currency: string;
  account_id: string | null;
  destination_account_id: string | null;
  category_id: string | null;
  original_transaction_id: string | null;
  base_amount_minor: number | null;
  base_currency_code: string | null;
  exchange_rate_base_code: string | null;
  exchange_rate_quote_code: string | null;
  exchange_rate_scaled: number | null;
  exchange_rate_scale: number | null;
  exchange_rate_date: string | null;
  exchange_rate_source: string | null;
  note: string | null;
  transaction_date: string;
  created_at: string;
  updated_at: string;
};

function mapRefund(row: RefundRow): TransactionRecord {
  if (
    row.type !== 'refund'
    || (row.status !== 'posted' && row.status !== 'voided')
    || !isSupportedCurrency(row.currency)
    || !row.account_id
    || !row.original_transaction_id
  ) {
    throw new Error('Stored refund is invalid.');
  }
  return {
    id: row.id,
    type: 'refund',
    status: row.status,
    amount: row.amount,
    currency: row.currency,
    accountId: row.account_id,
    destinationAccountId: null,
    categoryId: null,
    subcategoryId: null,
    originalTransactionId: row.original_transaction_id,
    baseAmountMinor: row.base_amount_minor,
    baseCurrencyCode: row.base_currency_code as CurrencyCode | null,
    exchangeRateScaled: row.exchange_rate_scaled,
    exchangeRateScale: row.exchange_rate_scale,
    exchangeRateBaseCode: row.exchange_rate_base_code as CurrencyCode | null,
    exchangeRateQuoteCode: row.exchange_rate_quote_code as CurrencyCode | null,
    exchangeRateDate: row.exchange_rate_date,
    exchangeRateSource: row.exchange_rate_source as ExchangeRateSnapshotSource | null,
    destinationAmountMinor: null,
    destinationCurrencyCode: null,
    note: row.note,
    transactionDate: row.transaction_date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function findRefund(database: SQLiteDatabase, id: string): Promise<RefundRow | null> {
  return database.getFirstAsync<RefundRow>(
    `SELECT id, type, status, amount, currency, account_id, destination_account_id,
            category_id, original_transaction_id, base_amount_minor, base_currency_code,
            exchange_rate_scaled, exchange_rate_scale, exchange_rate_base_code,
            exchange_rate_quote_code, exchange_rate_date, exchange_rate_source,
            note, transaction_date, created_at, updated_at
       FROM transactions
      WHERE id = ?`,
    id,
  );
}

export class SQLiteRefundRepository implements RefundRepository {
  constructor(private readonly database: SQLiteDatabase = sqlite) {}

  async createAtomic(record: RefundCreateRecord, today: string): Promise<TransactionRecord> {
    let created: TransactionRecord | null = null;
    await this.database.withExclusiveTransactionAsync(async (transaction) => {
      const original = await transaction.getFirstAsync<OriginalRow>(
        `SELECT original.id, original.type, original.status, original.amount,
                original.account_id, original.transaction_date,
                coalesce(sum(CASE WHEN refunds.status = 'posted' THEN refunds.amount ELSE 0 END), 0)
                  AS refunded_amount
           FROM transactions original
           LEFT JOIN transactions refunds
             ON refunds.original_transaction_id = original.id
            AND refunds.type = 'refund'
          WHERE original.id = ?
          GROUP BY original.id`,
        record.originalTransactionId,
      );
      if (!original) {
        throw new RefundActionError('original_not_found', 'The original expense no longer exists.');
      }
      if (original.type !== 'expense' || original.status !== 'posted' || !original.account_id) {
        throw new RefundActionError(
          'original_not_posted_expense',
          'Refunds can only be added to a posted expense.',
        );
      }
      if (record.transactionDate < original.transaction_date) {
        throw new RefundActionError(
          'refund_date_before_expense',
          'Refund date cannot be earlier than the original expense.',
        );
      }
      if (record.transactionDate > today) {
        throw new RefundActionError('refund_date_in_future', 'Refund date cannot be in the future.');
      }
      const remaining = original.amount - Number(original.refunded_amount);
      if (record.amount > remaining) {
        throw new RefundActionError(
          'refund_exceeds_remaining',
          remaining > 0
            ? 'Refund cannot exceed the remaining refundable amount.'
            : 'This expense has already been fully refunded.',
        );
      }

      await transaction.runAsync(
        `INSERT INTO transactions (
          id, type, status, amount, currency, account_id, destination_account_id,
          category_id, original_transaction_id, base_amount_minor, base_currency_code,
          exchange_rate_scaled, exchange_rate_scale, exchange_rate_base_code,
          exchange_rate_quote_code, exchange_rate_date, exchange_rate_source,
          note, transaction_date, created_at, updated_at
        ) VALUES (?, 'refund', 'posted', ?, ?, ?, NULL, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        record.id,
        record.amount,
        record.currency,
        original.account_id,
        original.id,
        record.baseAmountMinor,
        record.baseCurrencyCode,
        record.exchangeRate?.rateScaled ?? null,
        record.exchangeRate?.rateScale ?? null,
        record.exchangeRate?.baseCurrencyCode ?? null,
        record.exchangeRate?.quoteCurrencyCode ?? null,
        record.exchangeRate?.effectiveDate ?? null,
        record.exchangeRate?.source ?? null,
        record.note,
        record.transactionDate,
        record.createdAt,
        record.updatedAt,
      );
      const row = await findRefund(transaction, record.id);
      if (!row) throw new RefundActionError('refund_write_conflict', 'Unable to save the refund.');
      created = mapRefund(row);
    });
    if (!created) throw new RefundActionError('refund_write_conflict', 'Unable to save the refund.');
    return created;
  }

  async voidAtomic(id: string, updatedAt: string): Promise<TransactionRecord> {
    let voided: TransactionRecord | null = null;
    await this.database.withExclusiveTransactionAsync(async (transaction) => {
      const current = await findRefund(transaction, id);
      if (!current || current.type !== 'refund') {
        throw new RefundActionError('refund_not_found', 'Refund not found.');
      }
      if (current.status === 'voided') {
        throw new RefundActionError('refund_already_voided', 'Refund is already voided.');
      }
      const result = await transaction.runAsync(
        `UPDATE transactions
            SET status = 'voided', updated_at = ?
          WHERE id = ? AND type = 'refund' AND status = 'posted'`,
        updatedAt,
        id,
      );
      if (result.changes !== 1) {
        throw new RefundActionError('refund_write_conflict', 'Refund changed before it could be voided.');
      }
      const row = await findRefund(transaction, id);
      if (!row) throw new RefundActionError('refund_write_conflict', 'Unable to load the voided refund.');
      voided = mapRefund(row);
    });
    if (!voided) throw new RefundActionError('refund_write_conflict', 'Unable to void the refund.');
    return voided;
  }
}
