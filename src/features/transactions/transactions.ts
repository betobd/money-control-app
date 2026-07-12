import { randomUUID } from 'expo-crypto';
import { SQLiteAccountRepository } from '@/features/accounts/sqlite-account.repository';
import { SQLiteCategoryRepository } from '@/features/categories/sqlite-category.repository';
import { SQLiteTransactionRepository } from './sqlite-transaction.repository';
import { TransactionService } from './transaction.service';
export const transactionService = new TransactionService(new SQLiteTransactionRepository(), new SQLiteAccountRepository(), new SQLiteCategoryRepository(), randomUUID);
