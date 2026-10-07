import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { BottomNav } from '../components/BottomNav';
import { Icon } from '../components/Icon';
import { EmptyState } from '../components/States';
import { TabHeader } from '../components/TabHeader';
import { HomeTransactionRow } from '../components/TransactionRow';
import { formatMonthLong, formatWeekdayDayMonth, monthKey } from '../lib/dates';
import { formatINR } from '../lib/format';
import { budgetStatus, forDay, sortNewestFirst, totals } from '../lib/stats';
import { useNow } from '../lib/useNow';
import { haptics } from '../services/haptics';
import { useAppData } from '../state/AppDataContext';

const CARD_SHADOW = 'shadow-[0_1px_3px_rgba(15,23,42,0.06),0_1px_2px_rgba(15,23,42,0.04)]';

/** design-reference/home_vocal_ledger */
export function HomeScreen() {
  const navigate = useNavigate();
  const { transactions, getBudget } = useAppData();
  const now = useNow();
  const month = monthKey(now);
  const budget = getBudget(month);

  const status = useMemo(() => budgetStatus(transactions, month, budget?.amountPaise ?? null, now), [transactions, month, budget, now]);
  const today = useMemo(() => sortNewestFirst(forDay(transactions, now)), [transactions, now]);
  const todayTotals = totals(today);
  const pct = status.usedPct ?? 0;
  const days = status.daysRemaining;

  const openTx = (id: string) => navigate(`/transaction/${id}`);

  return (
    <div className="bg-surface text-on-surface font-body-md text-body-md flex flex-col min-h-[100dvh]">
      <TabHeader title="Home" />
      <main className="flex-1 flex flex-col relative w-full pt-header pb-nav bg-surface">
        <div className="flex flex-col w-full max-w-2xl mx-auto px-margin space-y-space-md">
          {/* 1. Monthly Budget Card */}
          <section
            className={`w-full bg-surface-container-lowest rounded-2xl p-space-lg ${CARD_SHADOW} relative overflow-hidden cursor-pointer active:scale-[0.995] transition-transform`}
            onClick={() => navigate('/budget')}
            role="link"
            aria-label="Open monthly budget"
          >
            <div className="flex items-center justify-between mb-space-sm">
              <div className="flex items-center gap-space-xs text-on-surface-variant">
                <Icon name="calendar_month" className="text-[18px]" />
                <span className="font-title-sm text-title-sm text-on-surface">Monthly Budget</span>
              </div>
              <span className="font-label-sm text-label-sm bg-surface-container text-on-surface-variant px-2.5 py-1 rounded-full">{formatMonthLong(month)}</span>
            </div>
            <div className="mt-space-xs">
              <span className="font-label-md text-label-md text-on-surface-variant">Allocated Cap</span>
              <div className={`font-display-lg-mobile text-display-lg-mobile tracking-tight leading-none mt-1 tabular-nums ${budget ? 'text-on-surface' : 'text-outline-variant'}`}>
                {budget ? formatINR(budget.amountPaise) : '₹0'}
              </div>
            </div>
            <div className="w-full mt-space-md">
              <div className="w-full h-3 bg-surface-container rounded-full overflow-hidden flex">
                <div
                  className={`h-full rounded-full transition-all duration-700 ease-out ${status.overBudget ? 'bg-tertiary-container' : 'bg-primary-container'}`}
                  style={{ width: `${Math.min(100, pct)}%` }}
                />
              </div>
              <div className="flex justify-between items-center mt-1.5 gap-2">
                <span className={`font-label-sm text-label-sm ${status.overBudget ? 'text-tertiary' : 'text-on-surface-variant'}`}>
                  {budget ? (status.overBudget ? `${pct}% used — over budget` : `${pct}% of budget utilized`) : 'No budget set — tap to add one'}
                </span>
                <span className="font-label-sm text-label-sm text-primary font-medium shrink-0">
                  {days} {days === 1 ? 'day' : 'days'} remaining
                </span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-space-sm mt-space-md pt-space-sm">
              <div className="bg-surface-container-low rounded-xl p-3 flex flex-col min-w-0">
                <div className="flex items-center gap-1 text-on-surface-variant">
                  <Icon name="trending_down" className="text-[16px] text-tertiary" />
                  <span className="font-label-sm text-label-sm">Spent</span>
                </div>
                <span className="font-headline-sm text-headline-sm text-tertiary mt-0.5 truncate tabular-nums">{formatINR(status.spentPaise)}</span>
              </div>
              <div className="bg-surface-container-low rounded-xl p-3 flex flex-col min-w-0">
                <div className="flex items-center gap-1 text-on-surface-variant">
                  <Icon name="account_balance" className="text-[16px] text-secondary" />
                  <span className="font-label-sm text-label-sm">{status.overBudget ? 'Over by' : 'Remaining'}</span>
                </div>
                <span className={`font-headline-sm text-headline-sm mt-0.5 truncate tabular-nums ${status.overBudget ? 'text-tertiary' : 'text-secondary'}`}>
                  {!budget ? '—' : status.overBudget ? formatINR(status.spentPaise - budget.amountPaise) : formatINR(status.remainingPaise)}
                </span>
              </div>
            </div>
          </section>

          {/* 2. Today's Summary Card */}
          <section className={`w-full bg-surface-container-lowest rounded-2xl p-space-md ${CARD_SHADOW}`}>
            <div className="flex items-center justify-between mb-3 px-1">
              <div className="flex items-center gap-1.5">
                <Icon name="today" className="text-[18px] text-on-surface-variant" />
                <h2 className="font-title-md text-title-md text-on-surface">Today's Summary</h2>
              </div>
              <span className="font-label-sm text-label-sm text-on-surface-variant">{formatWeekdayDayMonth(now.getTime())}</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-surface-container-low rounded-xl p-2.5 flex flex-col items-start min-w-0">
                <span className="font-label-sm text-label-sm text-on-surface-variant">Income</span>
                <span className="font-title-md text-title-md text-secondary mt-1 truncate w-full tabular-nums">+{formatINR(todayTotals.incomePaise)}</span>
              </div>
              <div className="bg-surface-container-low rounded-xl p-2.5 flex flex-col items-start min-w-0">
                <span className="font-label-sm text-label-sm text-on-surface-variant">Expenses</span>
                <span className="font-title-md text-title-md text-tertiary mt-1 truncate w-full tabular-nums">-{formatINR(todayTotals.expensePaise)}</span>
              </div>
              <div className="bg-surface-container-high rounded-xl p-2.5 flex flex-col items-start min-w-0">
                <span className="font-label-sm text-label-sm text-on-surface-variant">Balance</span>
                <span className="font-title-md text-title-md text-on-surface mt-1 truncate w-full font-semibold tabular-nums">{formatINR(todayTotals.balancePaise)}</span>
              </div>
            </div>
          </section>

          {/* 3. Primary Voice Action Hub */}
          <section className="w-full flex flex-col space-y-2.5 pt-1">
            <button
              type="button"
              className="group w-full relative overflow-hidden bg-primary-container hover:bg-primary active:scale-[0.98] transition-all duration-200 text-on-primary rounded-2xl p-space-md shadow-[0_10px_15px_-3px_rgba(44,78,207,0.28),0_4px_6px_-4px_rgba(44,78,207,0.18)] flex items-center justify-between text-left"
              id="voiceLedgerBtn"
              onClick={() => {
                haptics.tap();
                navigate('/voice');
              }}
            >
              <div className="absolute -right-6 -bottom-6 w-28 h-28 bg-white/10 rounded-full blur-xl group-hover:scale-125 transition-transform duration-500" />
              <div className="flex items-center gap-space-md min-w-0 pr-2">
                <div className="w-14 h-14 rounded-full bg-surface-container-lowest text-primary-container flex items-center justify-center shrink-0 shadow-md">
                  <Icon name="mic" className="text-[28px] animate-pulse" />
                </div>
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-title-md text-title-md text-on-primary font-semibold">Add by speaking</span>
                    <Icon name="auto_awesome" className="text-[16px] text-on-primary-container" />
                  </div>
                  <span className="font-body-sm text-body-sm text-on-primary-container truncate mt-0.5">e.g. “Spent 14 rupees for dinner...”</span>
                </div>
              </div>
              <div className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center shrink-0 text-on-primary">
                <Icon name="chevron_right" className="text-[20px]" />
              </div>
            </button>
            <button
              type="button"
              className="w-full h-11 rounded-full bg-surface-container-high hover:bg-surface-variant active:scale-[0.99] text-primary transition-colors flex items-center justify-center gap-2 px-space-lg"
              id="manualAddBtn"
              onClick={() => navigate('/add')}
            >
              <Icon name="add_circle" className="text-[20px]" />
              <span className="font-label-lg text-label-lg font-medium">Add manually</span>
            </button>
          </section>

          {/* 4. Today's Transactions List */}
          <section className="w-full flex flex-col space-y-2.5 pb-2">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-1.5">
                <Icon name="receipt_long" className="text-[18px] text-on-surface-variant" />
                <h3 className="font-title-md text-title-md text-on-surface">Today's Transactions</h3>
              </div>
              <span className="font-label-sm text-label-sm text-on-surface-variant bg-surface-container px-2 py-0.5 rounded-full">{today.length} recorded</span>
            </div>
            <div className={`w-full bg-surface-container-lowest rounded-2xl p-space-xs ${CARD_SHADOW} divide-y divide-surface-container-low`}>
              {today.length === 0 ? (
                <EmptyState compact icon="receipt_long" title="Nothing recorded today" message="Tap “Add by speaking” and say something like “Spent 250 on lunch”." />
              ) : (
                today.map((tx) => <HomeTransactionRow key={tx.id} tx={tx} onOpen={(t) => openTx(t.id)} />)
              )}
            </div>
            {transactions.length > today.length && (
              <button type="button" className="self-center font-label-md text-label-md text-primary py-2 px-space-md rounded-full hover:bg-surface-container" onClick={() => navigate('/transactions', { replace: true })}>
                View all transactions
              </button>
            )}
          </section>
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
