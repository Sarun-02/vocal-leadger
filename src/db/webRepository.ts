import type { Budget, Transaction } from '../models/types';
import { type Repository, StorageError } from './repository';

/**
 * Browser-only fallback used during `npm run dev`. The Android app always uses SQLite.
 * Each collection lives under its own localStorage key.
 */
const PREFIX = 'vocal-ledger:';

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch (e) {
    throw new StorageError('Browser storage is full or unavailable.', e);
  }
}

export class WebRepository implements Repository {
  readonly kind = 'web' as const;

  async init(): Promise<void> {
    try {
      localStorage.getItem(PREFIX + 'probe');
    } catch (e) {
      throw new StorageError('Browser storage is unavailable.', e);
    }
  }

  async listTransactions(): Promise<Transaction[]> {
    return read<Transaction[]>('transactions', []).sort((a, b) => b.occurredAt - a.occurredAt || b.createdAt - a.createdAt);
  }

  async insertTransactions(txs: Transaction[]): Promise<void> {
    write('transactions', [...read<Transaction[]>('transactions', []), ...txs]);
  }

  async updateTransaction(tx: Transaction): Promise<void> {
    write('transactions', read<Transaction[]>('transactions', []).map((t) => (t.id === tx.id ? tx : t)));
  }

  async deleteTransaction(id: string): Promise<void> {
    write('transactions', read<Transaction[]>('transactions', []).filter((t) => t.id !== id));
  }

  async listBudgets(): Promise<Budget[]> {
    return read<Budget[]>('budgets', []);
  }

  async upsertBudget(b: Budget): Promise<void> {
    write('budgets', [...read<Budget[]>('budgets', []).filter((x) => x.month !== b.month), b]);
  }

  async getValue(key: string): Promise<string | null> {
    return read<Record<string, string>>('kv', {})[key] ?? null;
  }

  async setValue(key: string, value: string): Promise<void> {
    write('kv', { ...read<Record<string, string>>('kv', {}), [key]: value });
  }

  async deleteValue(key: string): Promise<void> {
    const kv = read<Record<string, string>>('kv', {});
    delete kv[key];
    write('kv', kv);
  }

  async clearAll(): Promise<void> {
    ['transactions', 'budgets', 'kv'].forEach((k) => localStorage.removeItem(PREFIX + k));
  }
}
