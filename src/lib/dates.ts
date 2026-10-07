import type { MonthKey } from '../models/types';

export const DAY_MS = 86_400_000;

export function startOfDay(d: Date | number): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function endOfDay(d: Date | number): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

export function addDays(d: Date | number, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export function isSameDay(a: Date | number, b: Date | number): boolean {
  const x = new Date(a);
  const y = new Date(b);
  return x.getFullYear() === y.getFullYear() && x.getMonth() === y.getMonth() && x.getDate() === y.getDate();
}

export function monthKey(d: Date | number): MonthKey {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}`;
}

export function parseMonthKey(key: MonthKey): { year: number; month: number } {
  const [y, m] = key.split('-').map(Number);
  return { year: y, month: m - 1 };
}

export function shiftMonth(key: MonthKey, delta: number): MonthKey {
  const { year, month } = parseMonthKey(key);
  return monthKey(new Date(year, month + delta, 1));
}

export function monthRange(key: MonthKey): { start: number; end: number } {
  const { year, month } = parseMonthKey(key);
  return {
    start: new Date(year, month, 1).getTime(),
    end: new Date(year, month + 1, 1).getTime() - 1,
  };
}

export function daysInMonth(key: MonthKey): number {
  const { year, month } = parseMonthKey(key);
  return new Date(year, month + 1, 0).getDate();
}

/** Days left in the month including today; 0 for past months, full length for future ones. */
export function daysRemainingInMonth(key: MonthKey, now = new Date()): number {
  const current = monthKey(now);
  if (key < current) return 0;
  if (key > current) return daysInMonth(key);
  return daysInMonth(key) - now.getDate() + 1;
}

/** "October 2026" */
export function formatMonthLong(key: MonthKey): string {
  const { year, month } = parseMonthKey(key);
  return new Date(year, month, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

/** "October" */
export function formatMonthName(key: MonthKey): string {
  const { year, month } = parseMonthKey(key);
  return new Date(year, month, 1).toLocaleDateString('en-US', { month: 'long' });
}

/** "8:30 PM" */
export function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

/** "Oct 5, 2026" */
export function formatDateShort(ts: number): string {
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/** "October 5, 2026" */
export function formatDateLong(ts: number): string {
  return new Date(ts).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

/** "Thursday, 22 Oct" */
export function formatWeekdayDayMonth(ts: number): string {
  const d = new Date(ts);
  const weekday = d.toLocaleDateString('en-US', { weekday: 'long' });
  const month = d.toLocaleDateString('en-US', { month: 'short' });
  return `${weekday}, ${d.getDate()} ${month}`;
}

/** Relative chip text used by the ledger: Today / Yesterday / weekday / short date. */
export function relativeDayLabel(ts: number, now = new Date()): string {
  const diff = Math.round((startOfDay(now).getTime() - startOfDay(ts).getTime()) / DAY_MS);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  if (diff > 1 && diff < 7) return new Date(ts).toLocaleDateString('en-US', { weekday: 'long' });
  if (diff === -1) return 'Tomorrow';
  return new Date(ts).toLocaleDateString('en-US', { weekday: 'short' });
}

/** "Today, Oct 5, 2026" or "Oct 4, 2026" */
export function formatEntryDate(ts: number, now = new Date()): string {
  return (isSameDay(ts, now) ? 'Today, ' : '') + formatDateShort(ts);
}

/** "Today (Oct 5, 2026)" / "Yesterday (Oct 4, 2026)" / "Oct 3, 2026" */
export function formatReviewDate(ts: number, now = new Date()): string {
  if (isSameDay(ts, now)) return `Today (${formatDateShort(ts)})`;
  if (isSameDay(ts, addDays(now, -1))) return `Yesterday (${formatDateShort(ts)})`;
  return formatDateShort(ts);
}

/** Value for <input type="date">. */
export function toDateInputValue(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Value for <input type="time">. */
export function toTimeInputValue(ts: number): string {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** Combines date + time input values into epoch ms (local time). Returns null when invalid. */
export function fromDateTimeInputs(date: string, time: string): number | null {
  const dm = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  const tm = /^(\d{2}):(\d{2})$/.exec(time || '12:00');
  if (!dm || !tm) return null;
  const d = new Date(Number(dm[1]), Number(dm[2]) - 1, Number(dm[3]), Number(tm[1]), Number(tm[2]));
  return Number.isNaN(d.getTime()) ? null : d.getTime();
}

/** Keeps the date of `dayTs` but the clock time of `timeTs`. */
export function withTimeOf(dayTs: number, timeTs: number): number {
  const d = new Date(dayTs);
  const t = new Date(timeTs);
  d.setHours(t.getHours(), t.getMinutes(), 0, 0);
  return d.getTime();
}
