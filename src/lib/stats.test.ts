import { describe, expect, it } from 'vitest';
import type { Transaction } from '../models/types';
import { budgetStatus, byCategory, dailySeries, groupByDay, periodSummary, totals } from './stats';

const NOW = new Date(2026, 9, 22, 18, 0); // Thu 22 Oct 2026
let n = 0;
function tx(partial: Partial<Transaction> & { amount: number; at: Date }): Transaction {
  n++;
  return {
    id: `t${n}`,
    type: partial.type ?? 'expense',
    amountPaise: partial.amount * 100,
    categoryId: partial.categoryId ?? 'food',
    description: partial.description ?? 'x',
    occurredAt: partial.at.getTime(),
    paymentMethod: 'upi',
    notes: '',
    source: 'manual',
    transcript: '',
    createdAt: n,
    updatedAt: n,
  };
}

const data: Transaction[] = [
  tx({ amount: 14, at: new Date(2026, 9, 22, 20, 30) }),
  tx({ amount: 14, at: new Date(2026, 9, 22, 13, 15) }),
  tx({ amount: 14, at: new Date(2026, 9, 22, 9, 45), categoryId: 'fuel' }),
  tx({ amount: 5000, at: new Date(2026, 9, 22, 7, 0), type: 'income', categoryId: 'salary' }),
  tx({ amount: 500, at: new Date(2026, 9, 20, 18, 0), categoryId: 'groceries' }),
  tx({ amount: 1000, at: new Date(2026, 9, 1, 10, 0), categoryId: 'bills' }),
  tx({ amount: 800, at: new Date(2026, 8, 10, 10, 0), categoryId: 'bills' }),
];

describe('stats', () => {
  it('totals', () => {
    expect(totals(data.slice(0, 4))).toEqual({ incomePaise: 500000, expensePaise: 4200, balancePaise: 495800, count: 4 });
  });

  it('budget status for the month', () => {
    const s = budgetStatus(data, '2026-10', 3_000_000, NOW);
    expect(s.spentPaise).toBe(4200 + 50000 + 100000);
    expect(s.remainingPaise).toBe(3_000_000 - 154200);
    expect(s.usedPct).toBe(5);
    expect(s.daysRemaining).toBe(10);
    expect(s.overBudget).toBe(false);
    expect(budgetStatus(data, '2026-10', null, NOW).usedPct).toBeNull();
    expect(budgetStatus(data, '2026-10', 100000, NOW).overBudget).toBe(true);
  });

  it('category breakdown', () => {
    const cats = byCategory(data.filter((t) => t.occurredAt >= new Date(2026, 9, 1).getTime()));
    expect(cats.map((c) => c.categoryId)).toEqual(['bills', 'groceries', 'food', 'fuel']);
    expect(cats[0].pct).toBeCloseTo(64.9, 1);
  });

  it('daily series covers N days ending today', () => {
    const s = dailySeries(data, 7, NOW);
    expect(s).toHaveLength(7);
    expect(s[6].expensePaise).toBe(4200);
    expect(s[6].incomePaise).toBe(500000);
    expect(s[4].expensePaise).toBe(50000);
  });

  it('period summary', () => {
    const p = periodSummary(data, NOW);
    expect(p.todayExpensePaise).toBe(4200);
    expect(p.weekExpensePaise).toBe(54200);
    expect(p.monthExpensePaise).toBe(154200);
    expect(p.dailyAveragePaise).toBe(Math.round(154200 / 22));
    expect(p.monthOverMonthPct).toBe(Math.round(((154200 - 80000) / 80000) * 100));
  });

  it('groups by day newest first', () => {
    const g = groupByDay(data);
    expect(g[0].income).toHaveLength(1);
    expect(g[0].expense.map((t) => t.occurredAt)).toEqual([...g[0].expense.map((t) => t.occurredAt)].sort((a, b) => b - a));
    expect(g).toHaveLength(4);
  });
});
