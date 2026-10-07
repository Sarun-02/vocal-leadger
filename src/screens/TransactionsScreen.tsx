import { useDeferredValue, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BottomNav } from '../components/BottomNav';
import { Icon } from '../components/Icon';
import { activeFilterCount, LedgerFilterSheet, type LedgerFilters } from '../components/LedgerFilterSheet';
import { EmptyState } from '../components/States';
import { TabHeader } from '../components/TabHeader';
import { LedgerTransactionRow } from '../components/TransactionRow';
import { getCategory, getPaymentMethod } from '../data/categories';
import { formatDateLong, formatMonthLong, isSameDay, monthKey, relativeDayLabel } from '../lib/dates';
import { formatINR } from '../lib/format';
import { forMonth, groupByDay, totals } from '../lib/stats';
import { useNow } from '../lib/useNow';
import type { Transaction, TransactionType } from '../models/types';
import { useAppData } from '../state/AppDataContext';

type ViewMode = 'all' | TransactionType;

// Filters survive switching tabs during a session.
let saved: { mode: ViewMode; query: string; filters: LedgerFilters | null } = { mode: 'all', query: '', filters: null };

function matches(tx: Transaction, q: string): boolean {
  if (!q) return true;
  const cat = getCategory(tx.categoryId);
  const hay = [tx.description, cat.label, cat.longLabel, tx.notes, tx.transcript, getPaymentMethod(tx.paymentMethod).label, String(tx.amountPaise / 100)]
    .join(' ')
    .toLowerCase();
  return q.split(/\s+/).every((word) => hay.includes(word));
}

/** design-reference/transactions_ledger_vocal_ledger */
export function TransactionsScreen() {
  const navigate = useNavigate();
  const { transactions } = useAppData();
  const now = useNow();
  const currentMonth = monthKey(now);

  const [mode, setModeState] = useState<ViewMode>(saved.mode);
  const [query, setQueryState] = useState(saved.query);
  const [filters, setFiltersState] = useState<LedgerFilters>(saved.filters ?? { month: currentMonth, categories: [], payments: [] });
  const [sheetOpen, setSheetOpen] = useState(false);
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());

  const setMode = (m: ViewMode) => {
    saved = { ...saved, mode: m };
    setModeState(m);
  };
  const setQuery = (q: string) => {
    saved = { ...saved, query: q };
    setQueryState(q);
  };
  const setFilters = (f: LedgerFilters) => {
    saved = { ...saved, filters: f };
    setFiltersState(f);
  };

  const scoped = useMemo(() => (filters.month ? forMonth(transactions, filters.month) : transactions), [transactions, filters.month]);
  const scopeTotals = useMemo(() => totals(scoped), [scoped]);

  const visible = useMemo(
    () =>
      scoped.filter(
        (t) =>
          (mode === 'all' || t.type === mode) &&
          (filters.categories.length === 0 || filters.categories.includes(t.categoryId)) &&
          (filters.payments.length === 0 || filters.payments.includes(t.paymentMethod)) &&
          matches(t, deferredQuery),
      ),
    [scoped, mode, filters, deferredQuery],
  );
  const groups = useMemo(() => groupByDay(visible), [visible]);
  const filterCount = activeFilterCount(filters, currentMonth);

  const pill = (m: ViewMode, label: string) => (
    <button
      type="button"
      className={`px-3 py-1.5 rounded-full font-label-md text-label-md transition-all ${mode === m ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:text-on-surface'}`}
      aria-pressed={mode === m}
      onClick={() => setMode(m)}
    >
      {label}
    </button>
  );

  const open = (t: Transaction) => navigate(`/transaction/${t.id}`);

  return (
    <div className="bg-surface text-on-surface font-body-md text-body-md flex flex-col min-h-[100dvh]">
      <TabHeader title="Transactions" />
      <main className="flex-1 flex flex-col relative w-full pt-header pb-nav bg-surface">
        <div className="flex flex-col w-full max-w-2xl mx-auto pb-10">
          <div className="px-margin flex flex-col gap-space-sm pt-2">
            <div className="flex items-center justify-between gap-2">
              <button type="button" className="text-left min-w-0" onClick={() => setSheetOpen(true)} aria-label="Change month">
                <p className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Ledger View</p>
                <h2 className="font-headline-sm text-headline-sm text-on-surface flex items-center gap-0.5 truncate">
                  {filters.month ? formatMonthLong(filters.month) : 'All Time'}
                  <Icon name="arrow_drop_down" className="text-[24px] text-on-surface-variant" />
                </h2>
              </button>
              <div className="flex items-center gap-space-xs bg-surface-container-high rounded-full p-1 shrink-0">
                {pill('all', 'All')}
                {pill('income', 'Income')}
                {pill('expense', 'Expense')}
              </div>
            </div>

            {/* Month Cashflow Micro Bar */}
            <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm flex items-center justify-between gap-2">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-full bg-secondary-container flex items-center justify-center text-on-secondary-container shrink-0">
                  <Icon name="arrow_downward" className="text-[20px]" />
                </div>
                <div className="min-w-0">
                  <span className="font-label-sm text-label-sm text-on-surface-variant block">Total In</span>
                  <span className="font-title-md text-title-md text-secondary tabular-nums truncate block">+ {formatINR(scopeTotals.incomePaise)}</span>
                </div>
              </div>
              <div className="w-[1px] h-8 bg-outline-variant/30 shrink-0" />
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-full bg-error-container flex items-center justify-center text-on-error-container shrink-0">
                  <Icon name="arrow_upward" className="text-[20px]" />
                </div>
                <div className="min-w-0">
                  <span className="font-label-sm text-label-sm text-on-surface-variant block">Total Out</span>
                  <span className="font-title-md text-title-md text-error tabular-nums truncate block">- {formatINR(scopeTotals.expensePaise)}</span>
                </div>
              </div>
            </div>

            {/* Quick Search Pill */}
            <div className="relative flex items-center mt-1">
              <Icon name="search" className="absolute left-3 text-on-surface-variant text-[20px]" />
              <input
                className="w-full bg-surface-container-low text-on-surface placeholder:text-on-surface-variant font-body-md text-body-md rounded-xl pl-10 pr-20 py-2.5 outline-none focus:bg-surface-container-lowest focus:shadow-sm transition-all"
                id="tx-search"
                placeholder="Search entries, tags, or voice notes..."
                type="search"
                enterKeyHint="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              {query && (
                <button type="button" aria-label="Clear search" className="absolute right-10 text-on-surface-variant hover:text-on-surface p-1 rounded-full" onClick={() => setQuery('')}>
                  <Icon name="close" className="text-[18px]" />
                </button>
              )}
              <button type="button" aria-label="Filters" className="absolute right-2.5 text-on-surface-variant hover:text-on-surface p-1 rounded-full" onClick={() => setSheetOpen(true)}>
                <Icon name="tune" className={`text-[18px] ${filterCount ? 'text-primary' : ''}`} />
                {filterCount > 0 && <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-[14px] rounded-full bg-primary text-on-primary text-[9px] leading-[14px] text-center font-semibold">{filterCount}</span>}
              </button>
            </div>
          </div>

          {/* Grouped Date Feed */}
          <div className="mt-space-lg flex flex-col gap-space-lg px-margin" id="ledger-entries">
            {groups.length === 0 &&
              (transactions.length === 0 ? (
                <div className="bg-surface-container-lowest rounded-2xl shadow-sm">
                  <EmptyState
                    icon="receipt_long"
                    title="No transactions yet"
                    message="Log your first expense by voice or add it manually."
                    action={
                      <button type="button" className="h-11 px-space-lg rounded-full bg-surface-container-high text-primary font-label-lg text-label-lg flex items-center gap-2" onClick={() => navigate('/add')}>
                        <Icon name="add_circle" className="text-[20px]" /> Add manually
                      </button>
                    }
                  />
                </div>
              ) : (
                <div className="bg-surface-container-lowest rounded-2xl shadow-sm">
                  <EmptyState
                    icon="search_off"
                    title="No matching entries"
                    message={query ? `Nothing matches “${query}” with the current filters.` : 'Nothing recorded for this view.'}
                    action={
                      <button
                        type="button"
                        className="h-10 px-space-md rounded-full bg-surface-container text-primary font-label-lg text-label-lg"
                        onClick={() => {
                          setQuery('');
                          setMode('all');
                          setFilters({ month: filters.month, categories: [], payments: [] });
                        }}
                      >
                        Clear search & filters
                      </button>
                    }
                  />
                </div>
              ))}

            {groups.map((g) => {
              const today = isSameDay(g.day, now);
              return (
                <section key={g.day} className="flex flex-col gap-space-sm ledger-date-group">
                  <div className="flex items-center justify-between sticky top-header bg-surface/90 backdrop-blur-md py-1 z-10">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${today ? 'bg-primary' : 'bg-outline-variant'}`} />
                      <h3 className="font-title-md text-title-md text-on-surface">{formatDateLong(g.day)}</h3>
                    </div>
                    <span className="font-label-md text-label-md text-on-surface-variant bg-surface-container px-2.5 py-0.5 rounded-full">{relativeDayLabel(g.day, now)}</span>
                  </div>
                  {g.income.length > 0 && (
                    <div className="flex flex-col gap-1.5 transaction-subgroup subgroup-income">
                      <div className="flex items-center justify-between px-1">
                        <span className="font-label-sm text-label-sm text-secondary uppercase font-semibold flex items-center gap-1">
                          <Icon name="arrow_circle_down" className="text-[14px]" /> Income
                        </span>
                        <span className="font-label-sm text-label-sm text-secondary font-medium tabular-nums">+ {formatINR(g.incomePaise)}</span>
                      </div>
                      {g.income.map((t) => (
                        <LedgerTransactionRow key={t.id} tx={t} onOpen={open} />
                      ))}
                    </div>
                  )}
                  {g.expense.length > 0 && (
                    <div className={`flex flex-col gap-2 transaction-subgroup subgroup-expense ${g.income.length ? 'mt-1' : ''}`}>
                      <div className="flex items-center justify-between px-1">
                        <span className="font-label-sm text-label-sm text-error uppercase font-semibold flex items-center gap-1">
                          <Icon name="arrow_circle_up" className="text-[14px]" /> Expenses
                        </span>
                        <span className="font-label-sm text-label-sm text-error font-medium tabular-nums">- {formatINR(g.expensePaise)}</span>
                      </div>
                      {g.expense.map((t) => (
                        <LedgerTransactionRow key={t.id} tx={t} onOpen={open} />
                      ))}
                    </div>
                  )}
                </section>
              );
            })}
          </div>

          {/* Floating Voice Quick-Log Pill Bar */}
          <div className="hide-on-keyboard fixed bottom-nav-offset left-0 w-full px-margin flex items-center justify-center pointer-events-none z-40">
            <button
              type="button"
              className="pointer-events-auto flex items-center gap-2 bg-primary text-on-primary py-3 px-5 rounded-full shadow-[0_10px_20px_rgba(44,78,207,0.3)] hover:scale-105 active:scale-95 transition-all"
              onClick={() => navigate('/voice')}
            >
              <Icon name="mic" className="text-[22px]" />
              <span className="font-label-lg text-label-lg font-medium">Log via Voice</span>
            </button>
          </div>
        </div>
      </main>
      <BottomNav />
      <LedgerFilterSheet open={sheetOpen} value={filters} onApply={setFilters} onClose={() => setSheetOpen(false)} />
    </div>
  );
}
