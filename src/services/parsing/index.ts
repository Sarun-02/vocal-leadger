import { config } from '../../config/env';
import { CATEGORIES, coerceCategory, isPaymentMethodId } from '../../data/categories';
import { MAX_AMOUNT_RUPEES } from '../../lib/format';
import type { DraftTransaction, PaymentMethodId } from '../../models/types';
import { isOnline } from '../network';
import { parseTranscript } from './expenseParser';

export interface SpeechParseResult {
  drafts: DraftTransaction[];
  engine: 'offline' | 'ai';
  /** Non-fatal notice, e.g. the AI parser failed and the offline parser was used. */
  notice?: string;
}

interface ParseContext {
  defaultPaymentMethod: PaymentMethodId;
  now?: Date;
}

/** Fast, synchronous offline parse — used for live previews while the user speaks. */
export function parseOffline(transcript: string, ctx: ParseContext): DraftTransaction[] {
  return parseTranscript(transcript, { now: ctx.now, defaultPaymentMethod: ctx.defaultPaymentMethod }).drafts;
}

/**
 * Final parse. Uses the optional remote parser when configured and online,
 * and always falls back to the offline parser.
 */
export async function parseSpeech(transcript: string, ctx: ParseContext): Promise<SpeechParseResult> {
  const offline = parseOffline(transcript, ctx);
  if (!config.aiParserUrl) return { drafts: offline, engine: 'offline' };
  if (!(await isOnline())) return { drafts: offline, engine: 'offline' };

  try {
    const drafts = await parseRemote(config.aiParserUrl, transcript, ctx);
    return drafts.length > 0 ? { drafts, engine: 'ai' } : { drafts: offline, engine: 'offline' };
  } catch {
    return { drafts: offline, engine: 'offline', notice: 'Smart parsing is unavailable; used the offline parser.' };
  }
}

interface RemoteItem {
  type?: unknown;
  amount?: unknown;
  category?: unknown;
  description?: unknown;
  date?: unknown;
  paymentMethod?: unknown;
}

async function parseRemote(url: string, transcript: string, ctx: ParseContext): Promise<DraftTransaction[]> {
  const now = ctx.now ?? new Date();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.aiParserTimeoutMs);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        transcript,
        today: now.toISOString().slice(0, 10),
        categories: CATEGORIES.map((c) => ({ id: c.id, type: c.type, label: c.longLabel })),
      }),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const body = (await res.json()) as { transactions?: RemoteItem[] };
    if (!Array.isArray(body.transactions)) throw new Error('Malformed response');
    return body.transactions.slice(0, 20).map((item, i) => toDraft(item, i, ctx, now)).filter((d): d is DraftTransaction => d !== null);
  } finally {
    clearTimeout(timer);
  }
}

/** Validates every field from the remote parser — never trust its output blindly. */
function toDraft(item: RemoteItem, i: number, ctx: ParseContext, now: Date): DraftTransaction | null {
  const type = item.type === 'income' ? 'income' : 'expense';
  const amount = typeof item.amount === 'number' && item.amount > 0 && item.amount <= MAX_AMOUNT_RUPEES ? Math.round(item.amount * 100) / 100 : null;
  const description = typeof item.description === 'string' ? item.description.trim().slice(0, 60) : '';
  const categoryId = coerceCategory(typeof item.category === 'string' ? item.category : '', type);
  let occurredAt = now.getTime();
  if (typeof item.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(item.date)) {
    const [y, m, d] = item.date.split('-').map(Number);
    const dt = new Date(y, m - 1, d, now.getHours(), now.getMinutes());
    if (!Number.isNaN(dt.getTime()) && dt.getTime() <= now.getTime() + 86_400_000) occurredAt = dt.getTime();
  }
  if (amount === null && !description) return null;
  return {
    key: `ai${now.getTime()}${i}`,
    type,
    amount,
    categoryId,
    description: description || (type === 'income' ? 'Income' : 'Expense'),
    occurredAt,
    paymentMethod: isPaymentMethodId(item.paymentMethod) ? item.paymentMethod : ctx.defaultPaymentMethod,
    notes: '',
    needsReview: amount === null || !description,
  };
}
