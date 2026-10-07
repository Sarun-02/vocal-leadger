import { useState } from 'react';
import { getCategory } from '../data/categories';
import { formatINR } from '../lib/format';
import type { CategorySlice, DayPoint, PeriodSummary } from '../lib/stats';
import { Icon } from './Icon';
import { EmptyState } from './States';

const CARD = 'bg-surface-container-lowest rounded-2xl p-space-lg shadow-sm flex flex-col gap-space-md';

/** Stat tiles: week / daily average / month-over-month. */
export function SpendingInsights({ summary }: { summary: PeriodSummary }) {
  const mom = summary.monthOverMonthPct;
  return (
    <section className={CARD}>
      <div className="flex flex-col gap-0.5">
        <h2 className="font-title-md text-title-md text-on-surface">Spending Insights</h2>
        <p className="font-body-sm text-body-sm text-on-surface-variant">Calculated from your recorded expenses.</p>
      </div>
      <div className="grid grid-cols-2 gap-space-sm">
        <Tile label="Today" value={formatINR(summary.todayExpensePaise)} icon="today" />
        <Tile label="Last 7 days" value={formatINR(summary.weekExpensePaise)} icon="date_range" />
        <Tile label="Daily average" value={formatINR(summary.dailyAveragePaise)} icon="avg_pace" note="this month" />
        <Tile
          label="vs last month"
          value={mom === null ? '—' : `${mom > 0 ? '+' : ''}${mom}%`}
          icon={mom !== null && mom > 0 ? 'trending_up' : 'trending_down'}
          note={mom === null ? 'no data yet' : mom > 0 ? 'spending more' : 'spending less'}
          tone={mom === null ? undefined : mom > 0 ? 'bad' : 'good'}
        />
      </div>
    </section>
  );
}

function Tile({ label, value, icon, note, tone }: { label: string; value: string; icon: string; note?: string; tone?: 'good' | 'bad' }) {
  return (
    <div className="bg-surface-container-low rounded-xl p-3.5 flex flex-col gap-1 min-w-0">
      <div className="flex items-center justify-between">
        <span className="font-label-sm text-label-sm text-on-surface-variant">{label}</span>
        <Icon name={icon} className={`text-[18px] ${tone === 'bad' ? 'text-tertiary' : tone === 'good' ? 'text-secondary' : 'text-primary'}`} />
      </div>
      <span className="font-title-md text-title-md text-on-surface tabular-nums truncate">{value}</span>
      {note && <span className={`font-label-sm text-label-sm font-medium ${tone === 'bad' ? 'text-tertiary' : tone === 'good' ? 'text-secondary' : 'text-on-surface-variant'}`}>{note}</span>}
    </div>
  );
}

/** Ranked category bars — one hue (magnitude), values as text so it also reads as a table. */
export function CategoryBreakdown({ slices, monthLabel }: { slices: CategorySlice[]; monthLabel: string }) {
  const max = slices[0]?.amountPaise ?? 0;
  return (
    <section className={CARD}>
      <div className="flex flex-col gap-0.5">
        <h2 className="font-title-md text-title-md text-on-surface">Category Breakdown</h2>
        <p className="font-body-sm text-body-sm text-on-surface-variant">Where your money went in {monthLabel}.</p>
      </div>
      {slices.length === 0 ? (
        <EmptyState compact icon="donut_small" title="No expenses this month" message="Category totals appear once you log spending." />
      ) : (
        <ul className="flex flex-col gap-space-md" aria-label="Spending by category">
          {slices.map((s) => {
            const cat = getCategory(s.categoryId);
            return (
              <li key={s.categoryId} className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-surface-container-high text-primary flex items-center justify-center shrink-0">
                  <Icon name={cat.icon} className="text-[18px]" />
                </div>
                <div className="flex-1 min-w-0 flex flex-col gap-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-title-sm text-title-sm text-on-surface truncate">{cat.longLabel}</span>
                    <span className="font-title-sm text-title-sm text-on-surface tabular-nums shrink-0">{formatINR(s.amountPaise)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-surface-container rounded-full overflow-hidden">
                      <div className="h-full bg-primary-container rounded-full transition-all duration-500" style={{ width: `${max ? Math.max(2, (s.amountPaise / max) * 100) : 0}%` }} />
                    </div>
                    <span className="font-label-sm text-label-sm text-on-surface-variant tabular-nums w-11 text-right">{s.pct}%</span>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

/** 7-day spending columns. Tap a column to see its value. */
export function DailyTrend({ points }: { points: DayPoint[] }) {
  const [selected, setSelected] = useState<number>(points.length - 1);
  const max = Math.max(...points.map((p) => p.expensePaise), 0);
  const sel = points[selected];
  const total = points.reduce((s, p) => s + p.expensePaise, 0);
  return (
    <section className={CARD}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-0.5">
          <h2 className="font-title-md text-title-md text-on-surface">Last 7 Days</h2>
          <p className="font-body-sm text-body-sm text-on-surface-variant">Daily spending · {formatINR(total)} total</p>
        </div>
        {sel && (
          <div className="flex flex-col items-end shrink-0" aria-live="polite">
            <span className="font-label-sm text-label-sm text-on-surface-variant">
              {new Date(sel.day).toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' })}
            </span>
            <span className="font-title-md text-title-md text-on-surface tabular-nums">{formatINR(sel.expensePaise)}</span>
          </div>
        )}
      </div>
      <div className="flex items-end justify-between h-36 border-b border-surface-container-high gap-[2px]" role="list" aria-label="Daily spending, last 7 days">
        {points.map((p, i) => {
          const h = max ? (p.expensePaise / max) * 100 : 0;
          const label = new Date(p.day).toLocaleDateString('en-US', { weekday: 'short' });
          return (
            <button
              key={p.day}
              type="button"
              role="listitem"
              aria-label={`${label}: ${formatINR(p.expensePaise)}`}
              className="flex-1 h-full flex items-end justify-center px-1"
              onClick={() => setSelected(i)}
            >
              <div
                className={`w-full max-w-[28px] rounded-t-[4px] transition-all duration-500 ${i === selected ? 'bg-primary-container' : 'bg-primary-fixed-dim'}`}
                style={{ height: p.expensePaise ? `${Math.max(3, h)}%` : '2px' }}
              />
            </button>
          );
        })}
      </div>
      <div className="flex justify-between -mt-2">
        {points.map((p, i) => (
          <span key={p.day} className={`flex-1 text-center font-label-sm text-label-sm ${i === selected ? 'text-on-surface' : 'text-on-surface-variant'}`}>
            {i === points.length - 1 ? 'Today' : new Date(p.day).toLocaleDateString('en-US', { weekday: 'narrow' })}
          </span>
        ))}
      </div>
    </section>
  );
}
