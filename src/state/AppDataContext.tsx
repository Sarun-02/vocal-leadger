import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { getRepository, StorageError } from '../db';
import { monthKey } from '../lib/dates';
import type { AppSettings, MonthKey, Transaction, TransactionInput, UserAccount } from '../models/types';
import { DEFAULT_SETTINGS } from '../models/types';
import { AuthService } from '../services/auth/authService';
import { setHapticsEnabled } from '../services/haptics';

const SETTINGS_KEY = 'settings';
const NOTIFICATIONS_SEEN_KEY = 'notifications_seen_at';

type Status = 'loading' | 'ready' | 'error';

export interface BudgetLookup {
  amountPaise: number;
  /** True when carried forward from an earlier month. */
  inherited: boolean;
}

interface AppDataValue {
  status: Status;
  loadError: string | null;
  retryLoad(): void;

  transactions: Transaction[];
  addTransactions(inputs: TransactionInput[]): Promise<Transaction[]>;
  updateTransaction(id: string, input: TransactionInput): Promise<Transaction>;
  deleteTransaction(id: string): Promise<Transaction>;
  restoreTransaction(tx: Transaction): Promise<void>;
  getTransaction(id: string): Transaction | undefined;

  getBudget(month: MonthKey): BudgetLookup | null;
  setBudget(month: MonthKey, amountPaise: number): Promise<void>;

  settings: AppSettings;
  updateSettings(patch: Partial<AppSettings>): Promise<void>;

  account: UserAccount | null;
  signedIn: boolean;
  createAccount(username: string, password: string): Promise<void>;
  signIn(username: string, password: string): Promise<boolean>;
  signOut(): Promise<void>;
  changePassword(current: string, next: string): Promise<boolean>;

  notificationsSeenAt: number;
  markNotificationsSeen(): Promise<void>;

  eraseAllData(): Promise<void>;
}

const AppDataContext = createContext<AppDataValue | null>(null);

function newId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  }
}

function message(e: unknown): string {
  if (e instanceof StorageError) return e.message;
  return 'Something went wrong while accessing your data.';
}

export function AppDataProvider({ children }: { children: ReactNode }) {
  const repo = useMemo(() => getRepository(), []);
  const auth = useMemo(() => new AuthService(repo), [repo]);

  const [status, setStatus] = useState<Status>('loading');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Record<MonthKey, number>>({});
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [account, setAccount] = useState<UserAccount | null>(null);
  const [sessionUser, setSessionUser] = useState<string | null>(null);
  const [notificationsSeenAt, setNotificationsSeenAt] = useState(0);
  const [loadToken, setLoadToken] = useState(0);
  const initialised = useRef(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setStatus('loading');
      setLoadError(null);
      try {
        if (!initialised.current) {
          await repo.init();
          initialised.current = true;
        }
        const [txs, bs, rawSettings, acc, session, seen] = await Promise.all([
          repo.listTransactions(),
          repo.listBudgets(),
          repo.getValue(SETTINGS_KEY),
          auth.getAccount(),
          auth.getSession(),
          repo.getValue(NOTIFICATIONS_SEEN_KEY),
        ]);
        if (cancelled) return;
        let parsedSettings = DEFAULT_SETTINGS;
        try {
          parsedSettings = rawSettings ? { ...DEFAULT_SETTINGS, ...(JSON.parse(rawSettings) as Partial<AppSettings>) } : DEFAULT_SETTINGS;
        } catch {
          /* corrupt settings → defaults */
        }
        setTransactions(txs);
        setBudgets(Object.fromEntries(bs.map((b) => [b.month, b.amountPaise])));
        setSettings(parsedSettings);
        setHapticsEnabled(parsedSettings.haptics);
        setAccount(acc);
        setSessionUser(acc && session === acc.username ? session : null);
        setNotificationsSeenAt(Number(seen ?? 0) || 0);
        setStatus('ready');
      } catch (e) {
        if (cancelled) return;
        setLoadError(message(e));
        setStatus('error');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [repo, auth, loadToken]);

  const retryLoad = useCallback(() => setLoadToken((n) => n + 1), []);

  const addTransactions = useCallback(
    async (inputs: TransactionInput[]) => {
      const now = Date.now();
      const rows: Transaction[] = inputs.map((input, i) => ({ ...input, id: newId(), createdAt: now + i, updatedAt: now + i }));
      await repo.insertTransactions(rows);
      setTransactions((prev) => [...rows, ...prev]);
      return rows;
    },
    [repo],
  );

  const updateTransaction = useCallback(
    async (id: string, input: TransactionInput) => {
      const existing = transactions.find((t) => t.id === id);
      if (!existing) throw new StorageError('This transaction no longer exists.');
      const updated: Transaction = { ...existing, ...input, id, updatedAt: Date.now() };
      await repo.updateTransaction(updated);
      setTransactions((prev) => prev.map((t) => (t.id === id ? updated : t)));
      return updated;
    },
    [repo, transactions],
  );

  const deleteTransaction = useCallback(
    async (id: string) => {
      const existing = transactions.find((t) => t.id === id);
      if (!existing) throw new StorageError('This transaction no longer exists.');
      await repo.deleteTransaction(id);
      setTransactions((prev) => prev.filter((t) => t.id !== id));
      return existing;
    },
    [repo, transactions],
  );

  const restoreTransaction = useCallback(
    async (tx: Transaction) => {
      await repo.insertTransactions([tx]);
      setTransactions((prev) => (prev.some((t) => t.id === tx.id) ? prev : [tx, ...prev]));
    },
    [repo],
  );

  const getTransaction = useCallback((id: string) => transactions.find((t) => t.id === id), [transactions]);

  const getBudget = useCallback(
    (month: MonthKey): BudgetLookup | null => {
      if (budgets[month] !== undefined) return { amountPaise: budgets[month], inherited: false };
      // Carry the most recent earlier budget forward so it only has to be set once.
      const earlier = Object.keys(budgets).filter((m) => m < month).sort();
      const last = earlier[earlier.length - 1];
      return last ? { amountPaise: budgets[last], inherited: true } : null;
    },
    [budgets],
  );

  const setBudget = useCallback(
    async (month: MonthKey, amountPaise: number) => {
      await repo.upsertBudget({ month, amountPaise });
      setBudgets((prev) => ({ ...prev, [month]: amountPaise }));
    },
    [repo],
  );

  const updateSettings = useCallback(
    async (patch: Partial<AppSettings>) => {
      const next = { ...settings, ...patch };
      await repo.setValue(SETTINGS_KEY, JSON.stringify(next));
      setSettings(next);
      setHapticsEnabled(next.haptics);
    },
    [repo, settings],
  );

  const createAccount = useCallback(
    async (username: string, password: string) => {
      const acc = await auth.createAccount(username, password);
      setAccount(acc);
      setSessionUser(acc.username);
    },
    [auth],
  );

  const signIn = useCallback(
    async (username: string, password: string) => {
      const ok = await auth.signIn(username, password);
      if (ok) setSessionUser(account?.username ?? null);
      return ok;
    },
    [auth, account],
  );

  const signOut = useCallback(async () => {
    await auth.signOut();
    setSessionUser(null);
  }, [auth]);

  const changePassword = useCallback(
    async (current: string, next: string) => {
      const ok = await auth.changePassword(current, next);
      if (ok) setAccount(await auth.getAccount());
      return ok;
    },
    [auth],
  );

  const markNotificationsSeen = useCallback(async () => {
    const now = Date.now();
    setNotificationsSeenAt(now);
    await repo.setValue(NOTIFICATIONS_SEEN_KEY, String(now)).catch(() => undefined);
  }, [repo]);

  const eraseAllData = useCallback(async () => {
    await repo.clearAll();
    setTransactions([]);
    setBudgets({});
    setSettings(DEFAULT_SETTINGS);
    setAccount(null);
    setSessionUser(null);
    setNotificationsSeenAt(0);
  }, [repo]);

  const value = useMemo<AppDataValue>(
    () => ({
      status,
      loadError,
      retryLoad,
      transactions,
      addTransactions,
      updateTransaction,
      deleteTransaction,
      restoreTransaction,
      getTransaction,
      getBudget,
      setBudget,
      settings,
      updateSettings,
      account,
      signedIn: !!account && sessionUser === account.username,
      createAccount,
      signIn,
      signOut,
      changePassword,
      notificationsSeenAt,
      markNotificationsSeen,
      eraseAllData,
    }),
    [status, loadError, retryLoad, transactions, addTransactions, updateTransaction, deleteTransaction, restoreTransaction, getTransaction, getBudget, setBudget, settings, updateSettings, account, sessionUser, createAccount, signIn, signOut, changePassword, notificationsSeenAt, markNotificationsSeen, eraseAllData],
  );

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData(): AppDataValue {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error('useAppData must be used inside AppDataProvider');
  return ctx;
}

export function useCurrentMonth(): MonthKey {
  const [key, setKey] = useState(() => monthKey(new Date()));
  useEffect(() => {
    // Roll over at midnight on month change while the app stays open.
    const id = window.setInterval(() => setKey(monthKey(new Date())), 60_000);
    return () => window.clearInterval(id);
  }, []);
  return key;
}
