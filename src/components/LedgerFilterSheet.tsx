import { useEffect, useState } from 'react';
import { CATEGORIES, PAYMENT_METHODS } from '../data/categories';
import { formatMonthLong, monthKey, shiftMonth } from '../lib/dates';
import type { MonthKey, PaymentMethodId } from '../models/types';
import { BottomSheet } from './BottomSheet';
import { Icon } from './Icon';

export interface LedgerFilters {
  /** null = all months */
  month: MonthKey | null;
  categories: string[];
  payments: PaymentMethodId[];
}

export function activeFilterCount(f: LedgerFilters, currentMonth: MonthKey): number {
  return (f.month !== currentMonth ? 1 : 0) + (f.categories.length ? 1 : 0) + (f.payments.length ? 1 : 0);
}

const CHIP = 'px-3.5 py-1.5 rounded-full font-label-md text-label-md transition-all active:scale-95 flex items-center gap-1';
const ON = 'bg-primary text-on-primary';
const OFF = 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high';

export function LedgerFilterSheet({ open, value, onApply, onClose }: { open: boolean; value: LedgerFilters; onApply: (f: LedgerFilters) => void; onClose: () => void }) {
  const [draft, setDraft] = useState(value);
  useEffect(() => {
    if (open) setDraft(value);
  }, [open, value]);

  const current = monthKey(new Date());
  const month = draft.month ?? current;
  const toggle = <T,>(list: T[], item: T) => (list.includes(item) ? list.filter((x) => x !== item) : [...list, item]);

  return (
    <BottomSheet open={open} onClose={onClose} label="Filter transactions">
      <div className="flex items-center justify-between mb-space-md">
        <h4 className="font-title-lg text-title-lg text-on-surface font-semibold">Filters</h4>
        <button type="button" className="font-label-lg text-label-lg text-primary px-3 py-1.5 rounded-full hover:bg-surface-container" onClick={() => setDraft({ month: current, categories: [], payments: [] })}>
          Reset
        </button>
      </div>

      <span className="font-label-sm text-label-sm text-on-surface-variant mb-2">Month</span>
      <div className="flex items-center justify-between bg-surface-container-low rounded-xl p-1 mb-2">
        <button type="button" aria-label="Previous month" className="w-10 h-10 rounded-full flex items-center justify-center text-on-surface active:bg-surface-container disabled:opacity-40" disabled={draft.month === null} onClick={() => setDraft({ ...draft, month: shiftMonth(month, -1) })}>
          <Icon name="chevron_left" />
        </button>
        <span className="font-title-sm text-title-sm text-on-surface">{draft.month === null ? 'All time' : formatMonthLong(month)}</span>
        <button type="button" aria-label="Next month" className="w-10 h-10 rounded-full flex items-center justify-center text-on-surface active:bg-surface-container disabled:opacity-40" disabled={draft.month === null || month >= current} onClick={() => setDraft({ ...draft, month: shiftMonth(month, 1) })}>
          <Icon name="chevron_right" />
        </button>
      </div>
      <div className="flex gap-2 mb-space-md">
        <button type="button" className={`${CHIP} ${draft.month === current ? ON : OFF}`} onClick={() => setDraft({ ...draft, month: current })}>
          This month
        </button>
        <button type="button" className={`${CHIP} ${draft.month === null ? ON : OFF}`} onClick={() => setDraft({ ...draft, month: null })}>
          All time
        </button>
      </div>

      <span className="font-label-sm text-label-sm text-on-surface-variant mb-2">Categories</span>
      <div className="flex flex-wrap gap-2 mb-space-md">
        {CATEGORIES.map((c) => (
          <button key={c.id} type="button" className={`${CHIP} ${draft.categories.includes(c.id) ? ON : OFF}`} onClick={() => setDraft({ ...draft, categories: toggle(draft.categories, c.id) })}>
            <Icon name={c.icon} className="text-[16px]" />
            {c.type === 'income' && c.id === 'other_income' ? 'Other income' : c.label}
          </button>
        ))}
      </div>

      <span className="font-label-sm text-label-sm text-on-surface-variant mb-2">Payment method</span>
      <div className="flex flex-wrap gap-2 mb-space-lg">
        {PAYMENT_METHODS.map((p) => (
          <button key={p.id} type="button" className={`${CHIP} ${draft.payments.includes(p.id) ? ON : OFF}`} onClick={() => setDraft({ ...draft, payments: toggle(draft.payments, p.id) })}>
            <Icon name={p.icon} className="text-[16px]" />
            {p.label}
          </button>
        ))}
      </div>

      <div className="flex w-full gap-space-sm">
        <button type="button" className="flex-1 h-11 rounded-full bg-surface-container text-on-surface font-label-lg text-label-lg" onClick={onClose}>
          Cancel
        </button>
        <button
          type="button"
          className="flex-1 h-11 rounded-full bg-primary text-on-primary font-label-lg text-label-lg"
          onClick={() => {
            onApply(draft);
            onClose();
          }}
        >
          Apply
        </button>
      </div>
    </BottomSheet>
  );
}
