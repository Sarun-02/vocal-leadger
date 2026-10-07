import { useMemo, useRef, useState } from 'react';
import { BottomNav } from '../components/BottomNav';
import { BottomSheet } from '../components/BottomSheet';
import { Icon } from '../components/Icon';
import { CategoryBreakdown, DailyTrend, SpendingInsights } from '../components/Insights';
import { FieldError, Spinner } from '../components/States';
import { TabHeader } from '../components/TabHeader';
import { formatMonthLong, formatMonthName, monthKey, shiftMonth } from '../lib/dates';
import { formatGrouped, formatINR, rupeesToPaise } from '../lib/format';
import { budgetStatus, byCategory, dailySeries, forMonth, periodSummary } from '../lib/stats';
import { useNow } from '../lib/useNow';
import type { MonthKey } from '../models/types';
import { haptics } from '../services/haptics';
import { useAppData } from '../state/AppDataContext';
import { useToast } from '../state/ToastContext';

const PRESETS = [25000, 30000, 35000, 40000];
const MAX_BUDGET = 10_000_000;

/** design-reference/monthly_budget_vocal_ledger (+ insights computed from real data). */
export function BudgetScreen() {
  const toast = useToast();
  const { transactions, getBudget, setBudget } = useAppData();
  const now = useNow();
  const current = monthKey(now);
  const [month, setMonth] = useState<MonthKey>(current);
  const [monthSheet, setMonthSheet] = useState(false);
  const [input, setInput] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const feedbackTimer = useRef<number | undefined>(undefined);

  const budget = getBudget(month);
  const status = useMemo(() => budgetStatus(transactions, month, budget?.amountPaise ?? null, now), [transactions, month, budget, now]);
  const slices = useMemo(() => byCategory(forMonth(transactions, month)), [transactions, month]);
  const summary = useMemo(() => periodSummary(transactions, now), [transactions, now]);
  const series = useMemo(() => dailySeries(transactions, 7, now), [transactions, now]);

  const used = status.usedPct ?? 0;
  const remainingPct = budget ? Math.max(0, 100 - used) : 0;
  const selectedPreset = PRESETS.find((p) => formatGrouped(p) === input);

  async function save() {
    const raw = input.replace(/[^0-9]/g, '');
    const value = raw ? parseInt(raw, 10) : NaN;
    if (!raw) {
      setError('Enter a budget amount.');
      inputRef.current?.focus();
      haptics.warning();
      return;
    }
    if (!Number.isFinite(value) || value <= 0) {
      setError('Budget must be greater than zero.');
      haptics.warning();
      return;
    }
    if (value > MAX_BUDGET) {
      setError('That budget looks too large.');
      haptics.warning();
      return;
    }
    setError(undefined);
    setSaving(true);
    try {
      await setBudget(month, rupeesToPaise(value));
      haptics.success();
      setInput('');
      const over = rupeesToPaise(value) < status.spentPaise;
      setFeedback(over ? `Budget updated — you've already spent ${formatINR(status.spentPaise)} this month.` : 'Budget updated successfully!');
      window.clearTimeout(feedbackTimer.current);
      feedbackTimer.current = window.setTimeout(() => setFeedback(null), 3000);
      inputRef.current?.blur();
    } catch (e) {
      toast({ tone: 'error', message: e instanceof Error ? e.message : 'Could not save the budget.' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-surface text-on-surface font-body-md text-body-md flex flex-col min-h-[100dvh]">
      <TabHeader title="Budget" />
      <main className="flex-1 flex flex-col relative w-full pt-header pb-nav bg-surface">
        <div className="flex flex-col w-full max-w-2xl mx-auto px-margin pb-6 gap-space-lg">
          {/* Month Selector & Status */}
          <div className="flex items-center justify-between pt-1 gap-2">
            <button type="button" className="flex items-center gap-space-sm bg-surface-container-low px-3 py-1.5 rounded-full shadow-sm active:scale-95 transition-transform" onClick={() => setMonthSheet(true)} aria-label="Change month">
              <Icon name="calendar_today" className="text-primary text-[20px]" />
              <span className="font-title-sm text-title-sm text-on-surface">{formatMonthLong(month)}</span>
              <Icon name="arrow_drop_down" className="text-on-surface-variant text-[20px] -ml-1" />
            </button>
            <div className="flex items-center gap-1.5 px-3 py-1 bg-surface-container-high rounded-full shrink-0">
              <span className={`w-2 h-2 rounded-full ${status.overBudget ? 'bg-tertiary-container' : 'bg-secondary'}`} />
              <span className="font-label-sm text-label-sm text-on-surface-variant font-medium">
                {month < current ? 'Month closed' : `${status.daysRemaining} ${status.daysRemaining === 1 ? 'Day' : 'Days'} Left`}
              </span>
            </div>
          </div>

          {/* Main Budget Overview Card */}
          <section className="bg-surface-container-lowest rounded-2xl p-space-lg shadow-sm flex flex-col gap-space-md relative overflow-hidden">
            <div className="flex items-start justify-between gap-2">
              <div className="flex flex-col gap-0.5 min-w-0">
                <span className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Current Budget</span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className={`font-display-lg-mobile text-display-lg-mobile font-semibold tracking-tight tabular-nums truncate ${budget ? 'text-on-surface' : 'text-outline-variant'}`} id="display-budget">
                    {budget ? formatINR(budget.amountPaise) : 'Not set'}
                  </span>
                </div>
                {budget?.inherited && <span className="font-label-sm text-label-sm text-on-surface-variant">Carried over from an earlier month</span>}
              </div>
              <button
                type="button"
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-surface-container text-primary rounded-full hover:bg-primary-fixed transition-colors active:scale-95 duration-150 shrink-0"
                id="quick-edit-trigger"
                onClick={() => {
                  inputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  inputRef.current?.focus();
                }}
              >
                <Icon name={budget ? 'edit' : 'add'} className="text-[18px]" />
                <span className="font-label-md text-label-md">{budget ? 'Edit Budget' : 'Set Budget'}</span>
              </button>
            </div>

            <div className="flex flex-col gap-2 pt-1">
              <div className="flex items-center justify-between">
                <span className="font-label-sm text-label-sm text-on-surface-variant">Overall Utilization</span>
                <span className="font-label-sm text-label-sm text-tertiary-container font-semibold" id="percentage-badge">
                  {budget ? `${used}% Used` : '—'}
                </span>
              </div>
              <div className="w-full h-3 bg-surface-container-high rounded-full overflow-hidden p-0.5">
                <div className={`h-full rounded-full transition-all duration-500 ease-out ${status.overBudget ? 'bg-tertiary-container' : 'bg-primary'}`} id="progress-fill" style={{ width: `${Math.min(100, used)}%` }} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-space-sm pt-2">
              <div className="bg-surface-container-low rounded-xl p-3.5 flex flex-col gap-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="font-label-sm text-label-sm text-on-surface-variant">Spent</span>
                  <Icon name="arrow_outward" className="text-tertiary text-[18px]" />
                </div>
                <span className="font-title-md text-title-md text-on-surface tabular-nums truncate">{formatINR(status.spentPaise)}</span>
                <span className="font-label-sm text-label-sm text-tertiary font-medium">{budget ? `${used}% of limit` : 'no limit set'}</span>
              </div>
              <div className="bg-surface-container-low rounded-xl p-3.5 flex flex-col gap-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="font-label-sm text-label-sm text-on-surface-variant">{status.overBudget ? 'Over budget' : 'Remaining'}</span>
                  <Icon name="savings" className="text-secondary text-[18px]" />
                </div>
                <span className="font-title-md text-title-md text-on-surface tabular-nums truncate" id="display-remaining">
                  {status.overBudget && budget ? formatINR(status.spentPaise - budget.amountPaise) : formatINR(status.remainingPaise)}
                </span>
                <span className={`font-label-sm text-label-sm font-medium ${status.overBudget ? 'text-tertiary' : 'text-secondary'}`} id="display-remaining-pct">
                  {budget ? (status.overBudget ? 'limit exceeded' : `${remainingPct}% left`) : '—'}
                </span>
              </div>
            </div>
          </section>

          {/* Set New Monthly Budget Card */}
          <section className="bg-surface-container-lowest rounded-2xl p-space-lg shadow-sm flex flex-col gap-space-md">
            <div className="flex flex-col gap-0.5">
              <h2 className="font-title-md text-title-md text-on-surface">Set New Monthly Budget</h2>
              <p className="font-body-sm text-body-sm text-on-surface-variant">Adjust your spending threshold for the month of {formatMonthName(month)}.</p>
            </div>
            <div className="flex flex-col gap-2">
              <span className="font-label-sm text-label-sm text-on-surface-variant">Quick Presets</span>
              <div className="flex flex-wrap gap-2">
                {PRESETS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    className={`preset-chip px-3.5 py-1.5 rounded-full font-label-md text-label-md transition-all active:scale-95 ${selectedPreset === p ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'}`}
                    onClick={() => {
                      setInput(formatGrouped(p));
                      setError(undefined);
                    }}
                  >
                    ₹{formatGrouped(p)}
                  </button>
                ))}
              </div>
            </div>
            <form
              className="flex flex-col gap-space-md"
              onSubmit={(e) => {
                e.preventDefault();
                void save();
              }}
            >
              <div className="flex flex-col gap-1.5 pt-1">
                <label className="font-label-md text-label-md text-on-surface" htmlFor="budget-input">
                  Enter new monthly budget (₹)
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-4 font-title-md text-title-md text-on-surface-variant pointer-events-none">₹</span>
                  <input
                    ref={inputRef}
                    className="w-full bg-surface-container-low text-on-surface font-title-md text-title-md pl-9 pr-4 py-3 rounded-xl focus:bg-surface-container focus:outline-none transition-colors tabular-nums"
                    id="budget-input"
                    inputMode="numeric"
                    placeholder="e.g., 35,000"
                    type="text"
                    enterKeyHint="done"
                    value={input}
                    aria-invalid={!!error}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/[^0-9]/g, '').slice(0, 9);
                      setInput(raw ? formatGrouped(Number(raw)) : '');
                      setError(undefined);
                    }}
                  />
                </div>
                <FieldError message={error} />
              </div>
              <div className="pt-2 flex flex-col gap-2">
                <button
                  className="w-full h-11 bg-primary text-on-primary rounded-full font-label-lg text-label-lg flex items-center justify-center gap-2 hover:bg-primary-container shadow-sm active:scale-[0.98] transition-all disabled:opacity-70"
                  id="save-budget-btn"
                  type="submit"
                  disabled={saving}
                >
                  {saving ? <Spinner className="w-4 h-4 border-white/30 border-t-white" /> : <Icon name="check" className="text-[18px]" />}
                  <span>Save Budget</span>
                </button>
                <p className={`font-label-sm text-label-sm text-secondary text-center transition-opacity duration-300 ${feedback ? 'opacity-100' : 'opacity-0'}`} id="feedback-msg" aria-live="polite">
                  {feedback ?? 'Budget updated successfully!'}
                </p>
              </div>
            </form>
          </section>

          <SpendingInsights summary={summary} />
          <CategoryBreakdown slices={slices} monthLabel={formatMonthName(month)} />
          <DailyTrend points={series} />
        </div>
      </main>
      <BottomNav />

      <BottomSheet open={monthSheet} onClose={() => setMonthSheet(false)} label="Choose month">
        <h4 className="font-title-lg text-title-lg text-on-surface font-semibold mb-space-sm">Choose month</h4>
        <div className="flex flex-col">
          {Array.from({ length: 12 }, (_, i) => shiftMonth(current, -i)).map((m) => {
            const b = getBudget(m);
            return (
              <button
                key={m}
                type="button"
                className={`flex items-center justify-between px-space-md py-3 rounded-xl text-left ${m === month ? 'bg-surface-container-high text-primary' : 'text-on-surface active:bg-surface-container-low'}`}
                onClick={() => {
                  setMonth(m);
                  setMonthSheet(false);
                  setFeedback(null);
                }}
              >
                <span className="font-title-sm text-title-sm">{formatMonthLong(m)}</span>
                <span className="font-label-md text-label-md text-on-surface-variant tabular-nums">{b ? formatINR(b.amountPaise) : 'No budget'}</span>
              </button>
            );
          })}
        </div>
      </BottomSheet>
    </div>
  );
}
