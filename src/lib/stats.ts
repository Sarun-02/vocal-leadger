import type { MonthKey, Transaction, TransactionType } from '../models/types';
import { addDays, daysInMonth, daysRemainingInMonth, isSameDay, monthKey, monthRange, startOfDay } from './dates';

export interface Totals {
  incomePaise: number;
  expensePaise: number;
  balancePaise: number;
  count: number;
}

export function totals(txs: readonly Transaction[]): Totals {
  let income = 0;
  let expense = 0;
  for (const t of txs) {
    if (t.type === 'income') income += t.amountPaise;
    else expense += t.amountPaise;
  }
  return { incomePaise: income, expensePaise: expense, balancePaise: income - expense, count: txs.length };
}

export function inRange(txs: readonly Transaction[], start: number, end: number): Transaction[] {
  return txs.filter((t) => t.occurredAt >= start && t.occurredAt <= end);
}

export function forDay(txs: readonly Transaction[], day: Date | number): Transaction[] {
  return txs.filter((t) => isSameDay(t.occurredAt, day));
}

export function forMonth(txs: readonly Transaction[], key: MonthKey): Transaction[] {
  const { start, end } = monthRange(key);
  return inRange(txs, start, end);
}

/** Newest first, ties broken by creation time so new entries appear on top. */
export function sortNewestFirst(txs: readonly Transaction[]): Transaction[] {
  return [...txs].sort((a, b) => b.occurredAt - a.occurredAt || b.createdAt - a.createdAt);
}

export interface BudgetStatus {
  budgetPaise: number | null;
  spentPaise: number;
  remainingPaise: number;
  /** 0–100+, rounded. Null when no budget is set. */
  usedPct: number | null;
  daysRemaining: number;
  overBudget: boolean;
}

export function budgetStatus(txs: readonly Transaction[], key: MonthKey, budgetPaise: number | null, now = new Date()): BudgetStatus {
  const spent = totals(forMonth(txs, key)).expensePaise;
  const remaining = budgetPaise === null ? 0 : Math.max(0, budgetPaise - spent);
  const usedPct = budgetPaise ? Math.round((spent / budgetPaise) * 100) : budgetPaise === 0 ? 100 : null;
  return {
    budgetPaise,
    spentPaise: spent,
    remainingPaise: remaining,
    usedPct,
    daysRemaining: daysRemainingInMonth(key, now),
    overBudget: budgetPaise !== null && spent > budgetPaise,
  };
}

export interface CategorySlice {
  categoryId: string;
  amountPaise: number;
  /** Share of the total, 0–100. */
  pct: number;
  count: number;
}

export function byCategory(txs: readonly Transaction[], type: TransactionType = 'expense'): CategorySlice[] {
  const map = new Map<string, { amount: number; count: number }>();
  let total = 0;
  for (const t of txs) {
    if (t.type !== type) continue;
    const cur = map.get(t.categoryId) ?? { amount: 0, count: 0 };
    cur.amount += t.amountPaise;
    cur.count += 1;
    map.set(t.categoryId, cur);
    total += t.amountPaise;
  }
  return [...map.entries()]
    .map(([categoryId, v]) => ({
      categoryId,
      amountPaise: v.amount,
      count: v.count,
      pct: total ? Math.round((v.amount / total) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.amountPaise - a.amountPaise);
}

export interface DayPoint {
  day: number; // start-of-day epoch ms
  expensePaise: number;
  incomePaise: number;
}

/** Daily expense/income totals for the `days` days ending today (oldest first). */
export function dailySeries(txs: readonly Transaction[], days: number, now = new Date()): DayPoint[] {
  const first = startOfDay(addDays(now, -(days - 1))).getTime();
  const points: DayPoint[] = Array.from({ length: days }, (_, i) => ({
    day: startOfDay(addDays(first, i)).getTime(),
    expensePaise: 0,
    incomePaise: 0,
  }));
  for (const t of txs) {
    if (t.occurredAt < first) continue;
    const idx = points.findIndex((p, i) => t.occurredAt >= p.day && (i === points.length - 1 || t.occurredAt < points[i + 1].day));
    if (idx < 0 || t.occurredAt > now.getTime() + 86_400_000) continue;
    if (t.type === 'expense') points[idx].expensePaise += t.amountPaise;
    else points[idx].incomePaise += t.amountPaise;
  }
  return points;
}

export interface PeriodSummary {
  todayExpensePaise: number;
  weekExpensePaise: number;
  monthExpensePaise: number;
  /** Average daily spend over elapsed days of the current month. */
  dailyAveragePaise: number;
  /** Change of this month's spend vs. the same number of days last month, in %. Null if no data. */
  monthOverMonthPct: number | null;
  allTimeExpensePaise: number;
  allTimeIncomePaise: number;
}

export function periodSummary(txs: readonly Transaction[], now = new Date()): PeriodSummary {
  const today = startOfDay(now).getTime();
  const weekStart = startOfDay(addDays(now, -6)).getTime();
  const key = monthKey(now);
  const { start: monthStart } = monthRange(key);
  const end = now.getTime() + 86_400_000;

  const exp = (from: number, to: number) => totals(inRange(txs, from, to)).expensePaise;
  const monthExpense = exp(monthStart, end);
  const elapsed = Math.min(now.getDate(), daysInMonth(key));

  const prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime();
  const prevSameDay = new Date(now.getFullYear(), now.getMonth() - 1, Math.min(now.getDate(), new Date(now.getFullYear(), now.getMonth(), 0).getDate()), 23, 59, 59).getTime();
  const prevExpense = exp(prevStart, prevSameDay);
  const all = totals(txs);

  return {
    todayExpensePaise: exp(today, end),
    weekExpensePaise: exp(weekStart, end),
    monthExpensePaise: monthExpense,
    dailyAveragePaise: elapsed ? Math.round(monthExpense / elapsed) : 0,
    monthOverMonthPct: prevExpense > 0 ? Math.round(((monthExpense - prevExpense) / prevExpense) * 100) : null,
    allTimeExpensePaise: all.expensePaise,
    allTimeIncomePaise: all.incomePaise,
  };
}

export interface DayGroup {
  day: number;
  income: Transaction[];
  expense: Transaction[];
  incomePaise: number;
  expensePaise: number;
}

/** Groups (already filtered) transactions by calendar day, newest day first. */
export function groupByDay(txs: readonly Transaction[]): DayGroup[] {
  const groups = new Map<number, DayGroup>();
  for (const t of sortNewestFirst(txs)) {
    const day = startOfDay(t.occurredAt).getTime();
    let g = groups.get(day);
    if (!g) {
      g = { day, income: [], expense: [], incomePaise: 0, expensePaise: 0 };
      groups.set(day, g);
    }
    if (t.type === 'income') {
      g.income.push(t);
      g.incomePaise += t.amountPaise;
    } else {
      g.expense.push(t);
      g.expensePaise += t.amountPaise;
    }
  }
  return [...groups.values()].sort((a, b) => b.day - a.day);
}
