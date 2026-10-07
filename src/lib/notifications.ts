import type { BudgetLookup } from '../state/AppDataContext';
import type { MonthKey, Transaction } from '../models/types';
import { formatINR } from './format';
import { formatMonthName, monthRange } from './dates';
import { forDay, forMonth, sortNewestFirst, totals } from './stats';

export interface AppNotification {
  id: string;
  ts: number;
  icon: string;
  tone: 'warning' | 'danger' | 'info' | 'success';
  title: string;
  body: string;
  /** Route to open when tapped. */
  to?: string;
}

/** In-app alerts derived from the ledger (no push notifications, no extra permissions). */
export function buildNotifications(
  txs: readonly Transaction[],
  month: MonthKey,
  budget: BudgetLookup | null,
  budgetAlerts: boolean,
  now = new Date(),
): AppNotification[] {
  const list: AppNotification[] = [];
  const monthTxs = sortNewestFirst(forMonth(txs, month)).reverse(); // oldest first

  if (budgetAlerts && budget && budget.amountPaise > 0) {
    let running = 0;
    let crossed80: number | null = null;
    let crossed100: number | null = null;
    for (const t of monthTxs) {
      if (t.type !== 'expense') continue;
      running += t.amountPaise;
      if (crossed80 === null && running >= budget.amountPaise * 0.8) crossed80 = t.createdAt;
      if (crossed100 === null && running > budget.amountPaise) crossed100 = t.createdAt;
    }
    if (crossed100 !== null) {
      list.push({
        id: `over-${month}`,
        ts: crossed100,
        icon: 'warning',
        tone: 'danger',
        title: 'Monthly budget exceeded',
        body: `You've spent ${formatINR(running)} of your ${formatINR(budget.amountPaise)} budget for ${formatMonthName(month)}.`,
        to: '/budget',
      });
    } else if (crossed80 !== null) {
      list.push({
        id: `80-${month}`,
        ts: crossed80,
        icon: 'notifications_active',
        tone: 'warning',
        title: '80% of budget used',
        body: `${formatINR(Math.max(0, budget.amountPaise - running))} left for the rest of ${formatMonthName(month)}.`,
        to: '/budget',
      });
    }
  }

  if (!budget) {
    list.push({
      id: `nobudget-${month}`,
      ts: monthRange(month).start,
      icon: 'account_balance_wallet',
      tone: 'info',
      title: 'Set a monthly budget',
      body: 'Add a spending cap to track how much you have left this month.',
      to: '/budget',
    });
  }

  const today = forDay(txs, now);
  if (today.length > 0) {
    const t = totals(today);
    list.push({
      id: `today-${now.toDateString()}-${t.count}`,
      ts: Math.max(...today.map((x) => x.createdAt)),
      icon: 'today',
      tone: 'success',
      title: "Today's activity",
      body: `${t.count} ${t.count === 1 ? 'entry' : 'entries'} recorded · ${formatINR(t.expensePaise)} spent${t.incomePaise ? ` · ${formatINR(t.incomePaise)} received` : ''}.`,
      to: '/transactions',
    });
  }

  return list.sort((a, b) => b.ts - a.ts);
}
