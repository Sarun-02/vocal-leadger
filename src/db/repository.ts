import type { Budget, Transaction } from '../models/types';

/**
 * Persistence boundary. The UI never talks to SQLite directly — it goes through this
 * interface so storage can be swapped (SQLite on device, localStorage in a browser).
 */
export interface Repository {
  readonly kind: 'sqlite' | 'web';
  init(): Promise<void>;

  listTransactions(): Promise<Transaction[]>;
  /** Inserts all rows atomically. */
  insertTransactions(txs: Transaction[]): Promise<void>;
  updateTransaction(tx: Transaction): Promise<void>;
  deleteTransaction(id: string): Promise<void>;

  listBudgets(): Promise<Budget[]>;
  upsertBudget(budget: Budget): Promise<void>;

  getValue(key: string): Promise<string | null>;
  setValue(key: string, value: string): Promise<void>;
  deleteValue(key: string): Promise<void>;

  /** Removes every transaction, budget and setting. */
  clearAll(): Promise<void>;
}

export class StorageError extends Error {
  constructor(message: string, readonly cause?: unknown) {
    super(message);
    this.name = 'StorageError';
  }
}
