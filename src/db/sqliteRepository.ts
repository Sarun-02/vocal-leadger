import { CapacitorSQLite, SQLiteConnection, type SQLiteDBConnection } from '@capacitor-community/sqlite';
import type { Budget, PaymentMethodId, Transaction, TransactionSource, TransactionType } from '../models/types';
import { type Repository, StorageError } from './repository';

const DB_NAME = 'vocal_ledger';
const SCHEMA_VERSION = 1;

/** Ordered migrations; index i migrates user_version i → i+1. Never edit a shipped entry. */
const MIGRATIONS: string[] = [
  `
  CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('expense','income')),
    amount_paise INTEGER NOT NULL CHECK (amount_paise > 0),
    category_id TEXT NOT NULL,
    description TEXT NOT NULL,
    occurred_at INTEGER NOT NULL,
    payment_method TEXT NOT NULL,
    notes TEXT NOT NULL DEFAULT '',
    source TEXT NOT NULL DEFAULT 'manual',
    transcript TEXT NOT NULL DEFAULT '',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_transactions_occurred_at ON transactions (occurred_at);
  CREATE TABLE IF NOT EXISTS budgets (
    month TEXT PRIMARY KEY NOT NULL,
    amount_paise INTEGER NOT NULL CHECK (amount_paise >= 0),
    updated_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS kv (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL
  );
  `,
];

interface TxRow {
  id: string;
  type: string;
  amount_paise: number;
  category_id: string;
  description: string;
  occurred_at: number;
  payment_method: string;
  notes: string;
  source: string;
  transcript: string;
  created_at: number;
  updated_at: number;
}

function fromRow(r: TxRow): Transaction {
  return {
    id: r.id,
    type: r.type as TransactionType,
    amountPaise: Number(r.amount_paise),
    categoryId: r.category_id,
    description: r.description,
    occurredAt: Number(r.occurred_at),
    paymentMethod: r.payment_method as PaymentMethodId,
    notes: r.notes ?? '',
    source: (r.source as TransactionSource) ?? 'manual',
    transcript: r.transcript ?? '',
    createdAt: Number(r.created_at),
    updatedAt: Number(r.updated_at),
  };
}

const INSERT_SQL = `INSERT INTO transactions
  (id, type, amount_paise, category_id, description, occurred_at, payment_method, notes, source, transcript, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

function insertValues(t: Transaction): unknown[] {
  return [t.id, t.type, t.amountPaise, t.categoryId, t.description, t.occurredAt, t.paymentMethod, t.notes, t.source, t.transcript, t.createdAt, t.updatedAt];
}

export class SqliteRepository implements Repository {
  readonly kind = 'sqlite' as const;
  private readonly sqlite = new SQLiteConnection(CapacitorSQLite);
  private db: SQLiteDBConnection | null = null;

  async init(): Promise<void> {
    try {
      const consistent = (await this.sqlite.checkConnectionsConsistency()).result;
      const exists = (await this.sqlite.isConnection(DB_NAME, false)).result;
      this.db = consistent && exists
        ? await this.sqlite.retrieveConnection(DB_NAME, false)
        : await this.sqlite.createConnection(DB_NAME, false, 'no-encryption', SCHEMA_VERSION, false);
      await this.db.open();
      await this.migrate();
    } catch (e) {
      throw new StorageError('Could not open the local database.', e);
    }
  }

  private async migrate(): Promise<void> {
    const db = this.conn();
    const res = await db.query('PRAGMA user_version;');
    const current = Number(res.values?.[0]?.user_version ?? 0);
    for (let v = current; v < MIGRATIONS.length; v++) {
      await db.execute(MIGRATIONS[v], true);
      await db.execute(`PRAGMA user_version = ${v + 1};`, false);
    }
  }

  private conn(): SQLiteDBConnection {
    if (!this.db) throw new StorageError('Database is not initialised.');
    return this.db;
  }

  private async guard<T>(what: string, fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (e) {
      if (e instanceof StorageError) throw e;
      throw new StorageError(`Could not ${what}.`, e);
    }
  }

  listTransactions(): Promise<Transaction[]> {
    return this.guard('load transactions', async () => {
      const res = await this.conn().query('SELECT * FROM transactions ORDER BY occurred_at DESC, created_at DESC;');
      return (res.values ?? []).map((r) => fromRow(r as TxRow));
    });
  }

  insertTransactions(txs: Transaction[]): Promise<void> {
    return this.guard('save the transaction', async () => {
      if (txs.length === 0) return;
      await this.conn().executeSet(txs.map((t) => ({ statement: INSERT_SQL, values: insertValues(t) })), true);
    });
  }

  updateTransaction(t: Transaction): Promise<void> {
    return this.guard('update the transaction', async () => {
      await this.conn().run(
        `UPDATE transactions SET type = ?, amount_paise = ?, category_id = ?, description = ?, occurred_at = ?,
          payment_method = ?, notes = ?, updated_at = ? WHERE id = ?;`,
        [t.type, t.amountPaise, t.categoryId, t.description, t.occurredAt, t.paymentMethod, t.notes, t.updatedAt, t.id],
      );
    });
  }

  deleteTransaction(id: string): Promise<void> {
    return this.guard('delete the transaction', async () => {
      await this.conn().run('DELETE FROM transactions WHERE id = ?;', [id]);
    });
  }

  listBudgets(): Promise<Budget[]> {
    return this.guard('load budgets', async () => {
      const res = await this.conn().query('SELECT month, amount_paise FROM budgets;');
      return (res.values ?? []).map((r) => ({ month: String(r.month), amountPaise: Number(r.amount_paise) }));
    });
  }

  upsertBudget(b: Budget): Promise<void> {
    return this.guard('save the budget', async () => {
      await this.conn().run(
        `INSERT INTO budgets (month, amount_paise, updated_at) VALUES (?, ?, ?)
         ON CONFLICT(month) DO UPDATE SET amount_paise = excluded.amount_paise, updated_at = excluded.updated_at;`,
        [b.month, b.amountPaise, Date.now()],
      );
    });
  }

  getValue(key: string): Promise<string | null> {
    return this.guard('read settings', async () => {
      const res = await this.conn().query('SELECT value FROM kv WHERE key = ?;', [key]);
      const row = res.values?.[0];
      return row ? String(row.value) : null;
    });
  }

  setValue(key: string, value: string): Promise<void> {
    return this.guard('save settings', async () => {
      await this.conn().run(
        'INSERT INTO kv (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value;',
        [key, value],
      );
    });
  }

  deleteValue(key: string): Promise<void> {
    return this.guard('save settings', async () => {
      await this.conn().run('DELETE FROM kv WHERE key = ?;', [key]);
    });
  }

  clearAll(): Promise<void> {
    return this.guard('erase data', async () => {
      await this.conn().executeSet(
        [{ statement: 'DELETE FROM transactions;' }, { statement: 'DELETE FROM budgets;' }, { statement: 'DELETE FROM kv;' }],
        true,
      );
    });
  }
}
