/**
 * Offline, rule-based parser that turns a spoken sentence into draft transactions.
 *
 *   "I spent 250 rupees on lunch"                     → [Lunch ₹250 Food]
 *   "Bought groceries for 1200"                       → [Groceries ₹1,200 Groceries]
 *   "Yesterday I spent 300 for dinner"                → [Dinner ₹300 Food, dated yesterday]
 *   "14 rupees for dinner 14 for lunch and 14 for petrol" → three drafts
 *
 * Speech recognisers rarely emit punctuation, so segmentation is driven by the position
 * of amounts rather than by commas.
 */
import type { DraftTransaction, PaymentMethodId, TransactionType } from '../../models/types';
import { MAX_AMOUNT_RUPEES } from '../../lib/format';

export interface ParseOptions {
  now?: Date;
  defaultPaymentMethod?: PaymentMethodId;
}

export interface ParseResult {
  drafts: DraftTransaction[];
  /** Date offset in days that was detected in the sentence (0 = today), if any. */
  dayOffset: number | null;
}

type TokenKind = 'word' | 'number' | 'sep';

interface Token {
  text: string;
  kind: TokenKind;
  value?: number;
  ordinal?: boolean;
  /** Number had an explicit currency marker (₹, rs, rupees, bucks…). */
  currency?: boolean;
  /** Consumed by date/time/payment detection; never part of a description. */
  consumed?: boolean;
}

// ───────────────────────── vocabulary ─────────────────────────

const ONES: Record<string, number> = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9,
  ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16,
  seventeen: 17, eighteen: 18, nineteen: 19,
};
const TENS: Record<string, number> = {
  twenty: 20, thirty: 30, forty: 40, fourty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90,
};
const SCALES: Record<string, number> = {
  thousand: 1_000, thousands: 1_000, k: 1_000,
  lakh: 100_000, lakhs: 100_000, lac: 100_000, lacs: 100_000,
  crore: 10_000_000, crores: 10_000_000,
};

const CURRENCY_WORDS = new Set(['rupees', 'rupee', 'rs', 'inr', 'bucks', 'rupaye', 'rupaiya', 'rupiya']);
const PAISE_WORDS = new Set(['paise', 'paisa']);

/** Words after a number that mean it is not money. */
const NON_AMOUNT_UNITS = new Set([
  'am', 'pm', 'oclock', "o'clock", 'day', 'days', 'week', 'weeks', 'month', 'months', 'year', 'years',
  'hour', 'hours', 'hr', 'hrs', 'minute', 'minutes', 'min', 'mins', 'kg', 'kgs', 'kilo', 'kilos', 'kilogram',
  'kilograms', 'gram', 'grams', 'gm', 'gms', 'litre', 'litres', 'liter', 'liters', 'ltr', 'ml', 'piece',
  'pieces', 'pcs', 'packet', 'packets', 'unit', 'units', 'item', 'items', 'dozen', 'people', 'persons',
  'plates', 'plate', 'cups', 'glasses', 'bottles', 'times', 'percent', '%', 'km', 'kms', 'x',
]);

const MONTHS: Record<string, number> = {
  january: 0, jan: 0, february: 1, feb: 1, march: 2, mar: 2, april: 3, apr: 3, may: 4, june: 5, jun: 5,
  july: 6, jul: 6, august: 7, aug: 7, september: 8, sep: 8, sept: 8, october: 9, oct: 9,
  november: 10, nov: 10, december: 11, dec: 11,
};
const WEEKDAYS: Record<string, number> = {
  sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6,
};

const PREPOSITIONS = new Set(['for', 'on', 'at', 'towards', 'toward', 'in', 'of', 'to', 'from', 'into']);
const CONJUNCTIONS = new Set(['and', 'also', 'then', 'plus', 'but', 'another', 'additionally']);

const VERBS = new Set([
  'spent', 'spend', 'spending', 'spends', 'paid', 'pay', 'paying', 'pays', 'bought', 'buy', 'buying',
  'purchased', 'purchase', 'gave', 'give', 'given', 'got', 'get', 'received', 'receive', 'receiving',
  'earned', 'earn', 'used', 'use', 'cost', 'costs', 'costed', 'credited', 'debited', 'added', 'add',
  'log', 'logged', 'record', 'recorded', 'put', 'made', 'make', 'transferred', 'sent', 'send', 'took',
  'had', 'have', 'has', 'ordered', 'order', 'booked', 'book', 'charged', 'withdrew', 'sold',
]);

const FILLERS = new Set([
  'i', "i've", 'ive', "i'm", 'im', 'we', 'me', 'my', 'our', 'a', 'an', 'the', 'just', 'was', 'were', 'is',
  'are', 'am', 'it', 'its', 'some', 'about', 'around', 'approximately', 'roughly', 'total', 'totally',
  'worth', 'amount', 'money', 'expense', 'expenses', 'an', 'um', 'uh', 'okay', 'ok', 'so', 'like',
  'please', 'hey', 'there', 'this', 'that', 'these', 'those', 'only', 'again', 'already', 'today',
  'yesterday', 'tonight', 'rupees', 'rupee', 'rs', 'inr', 'bucks', 'paise', 'paisa', 'of', 'with',
  'by', 'via', 'using', 'through', 'all', 'together', 'each',
]);

const INCOME_WORDS = new Set([
  'salary', 'received', 'receive', 'earned', 'earn', 'credited', 'income', 'refund', 'refunded',
  'cashback', 'bonus', 'stipend', 'freelance', 'dividend', 'sold', 'payout', 'reimbursement',
  'reimbursed', 'commission', 'allowance', 'pocket',
]);

/** Category keywords, checked in order (first match wins). */
const CATEGORY_KEYWORDS: Array<[string, string[]]> = [
  ['fuel', ['petrol', 'diesel', 'fuel', 'cng', 'gasoline']],
  ['groceries', ['grocery', 'groceries', 'vegetable', 'vegetables', 'veggies', 'fruit', 'fruits', 'milk',
    'rice', 'dal', 'atta', 'flour', 'supermarket', 'kirana', 'bigbasket', 'blinkit', 'zepto', 'eggs',
    'bread', 'onions', 'tomatoes', 'potatoes', 'sugar', 'oil', 'provisions']],
  ['food', ['food', 'lunch', 'dinner', 'breakfast', 'brunch', 'snack', 'snacks', 'coffee', 'tea', 'chai',
    'restaurant', 'meal', 'meals', 'pizza', 'burger', 'biryani', 'swiggy', 'zomato', 'juice', 'icecream',
    'dosa', 'idli', 'sweets', 'cafe', 'tiffin', 'dining', 'samosa', 'pani', 'puri', 'thali', 'noodles',
    'sandwich', 'cake', 'dessert', 'drinks', 'beer', 'canteen', 'mess', 'hotel', 'eat', 'eating']],
  ['transport', ['uber', 'ola', 'taxi', 'cab', 'auto', 'rickshaw', 'bus', 'train', 'metro', 'flight',
    'parking', 'toll', 'rapido', 'fare', 'travel', 'ticket', 'tickets', 'commute', 'bike', 'service']],
  ['bills', ['bill', 'bills', 'electricity', 'water', 'rent', 'internet', 'wifi', 'broadband', 'recharge',
    'mobile', 'phone', 'dth', 'emi', 'insurance', 'cylinder', 'gas', 'maintenance', 'subscription',
    'utility', 'utilities', 'postpaid', 'prepaid', 'loan']],
  ['health', ['medicine', 'medicines', 'doctor', 'hospital', 'pharmacy', 'clinic', 'medical', 'gym',
    'tablets', 'checkup', 'dentist', 'health', 'chemist', 'lab', 'test']],
  ['entertainment', ['movie', 'movies', 'cinema', 'netflix', 'spotify', 'prime', 'hotstar', 'game',
    'games', 'concert', 'party', 'outing', 'show', 'trip', 'vacation', 'holiday']],
  ['education', ['book', 'books', 'course', 'tuition', 'fees', 'fee', 'school', 'college', 'stationery',
    'exam', 'class', 'classes', 'udemy', 'coaching']],
  ['shopping', ['shopping', 'clothes', 'shirt', 'shirts', 'shoes', 'amazon', 'flipkart', 'myntra', 'dress',
    'jeans', 'electronics', 'gift', 'gifts', 'gadget', 'watch', 'bag', 'saree', 'kurta', 'headphones',
    'mall', 'cosmetics', 'furniture']],
];

const INCOME_CATEGORY_KEYWORDS: Array<[string, string[]]> = [
  ['salary', ['salary', 'payroll', 'wages', 'paycheck', 'stipend']],
  ['work', ['freelance', 'project', 'client', 'consulting', 'commission', 'business', 'invoice', 'work']],
  ['refund', ['refund', 'refunded', 'cashback', 'reimbursement', 'reimbursed']],
  ['gift', ['gift', 'gifted', 'birthday', 'pocket']],
];

const PAYMENT_PATTERNS: Array<[RegExp, PaymentMethodId]> = [
  [/\bcredit card\b/, 'credit_card'],
  [/\bdebit card\b/, 'debit_card'],
  [/\b(upi|gpay|google pay|phonepe|phone pe|paytm|bhim)\b/, 'upi'],
  [/\b(net ?banking|bank transfer|neft|imps|rtgs)\b/, 'net_banking'],
  [/\b(in cash|by cash|cash)\b/, 'cash'],
  [/\b(card|swiped)\b/, 'debit_card'],
];

// ───────────────────────── tokenisation ─────────────────────────

function normalise(input: string): string {
  let s = ` ${input.toLowerCase()} `;
  s = s.replace(/[“”"]/g, ' ').replace(/[’‘]/g, "'");
  // 1,200 / 1,20,000 → 1200 / 120000
  while (/\d,\d{2,3}\b/.test(s)) s = s.replace(/(\d),(\d{2,3})\b/g, '$1$2');
  // ₹250 / rs.250 / rs 250 / inr 250 → " 250 rupees "
  s = s.replace(/₹\s*(\d+(?:\.\d+)?)/g, ' $1 rupees ');
  s = s.replace(/\b(?:rs|inr)\.?\s*(\d+(?:\.\d+)?)/g, ' $1 rupees ');
  s = s.replace(/₹/g, ' rupees ');
  // 250/- → 250 rupees
  s = s.replace(/(\d+(?:\.\d+)?)\s*\/-/g, ' $1 rupees ');
  // 1.5k / 2k → 1500 / 2000
  s = s.replace(/\b(\d+(?:\.\d+)?)\s?k\b/g, (_, n: string) => ` ${Math.round(Number(n) * 1000)} `);
  // 250rupees / 5pm / 5th → split number from glued suffix
  s = s.replace(/(\d)(rupees?|rs|bucks|am|pm|kg|kgs|ml|km|st|nd|rd|th)\b/g, '$1 $2');
  // 5:30 → keep as time token
  s = s.replace(/\b(\d{1,2}):(\d{2})\b/g, ' $1:$2 ');
  // o'clock
  s = s.replace(/o'?\s?clock/g, ' oclock ');
  // separators become standalone tokens
  s = s.replace(/[,;!?]/g, ' , ');
  s = s.replace(/(\D)\.(\s|$)/g, '$1 , $2');
  s = s.replace(/(\d)\.(\s|$)/g, '$1 , $2');
  s = s.replace(/&/g, ' and ');
  s = s.replace(/[^a-z0-9.,:'%\s-]/g, ' ');
  s = s.replace(/-/g, ' ');
  return s.replace(/\s+/g, ' ').trim();
}

function tokenize(normalised: string): Token[] {
  const raw = normalised.split(' ').filter(Boolean);
  const out: Token[] = [];
  for (let i = 0; i < raw.length; i++) {
    const w = raw[i];
    if (w === ',') {
      out.push({ text: ',', kind: 'sep' });
      continue;
    }
    if (/^\d{1,2}:\d{2}$/.test(w)) {
      out.push({ text: w, kind: 'word' });
      continue;
    }
    // Numeric or spelled-out number sequence, possibly with scale words.
    const parsed = readNumber(raw, i);
    if (parsed) {
      const next = raw[i + parsed.length];
      const ordinal = next === 'st' || next === 'nd' || next === 'rd' || next === 'th';
      out.push({ text: raw.slice(i, i + parsed.length).join(' '), kind: 'number', value: parsed.value, ordinal });
      i += parsed.length - 1 + (ordinal ? 1 : 0);
      continue;
    }
    if (/^(first|second|third|\d+(st|nd|rd|th))$/.test(w)) {
      const value = w === 'first' ? 1 : w === 'second' ? 2 : w === 'third' ? 3 : parseInt(w, 10);
      out.push({ text: w, kind: 'number', value, ordinal: true });
      continue;
    }
    out.push({ text: w, kind: 'word' });
  }
  return out;
}

/** Reads a number starting at raw[i]: "250", "2.5 lakh", "two hundred and fifty", "a thousand". */
function readNumber(raw: string[], i: number): { value: number; length: number } | null {
  let total = 0;
  let current = 0;
  let j = i;
  let any = false;
  let last: 'digit' | 'unit' | 'teen' | 'tens' | 'hundred' | 'scale' | null = null;

  const first = raw[i];
  if (first === 'a' || first === 'an') {
    const nx = raw[i + 1];
    if (nx === 'hundred' || (nx && SCALES[nx] && nx !== 'k')) {
      current = 1;
      j++;
      last = 'unit';
      any = true;
    } else {
      return null;
    }
  }

  for (; j < raw.length; j++) {
    const w = raw[j];
    if (/^\d+(\.\d+)?$/.test(w)) {
      if (any) break;
      current = Number(w);
      last = 'digit';
      any = true;
      continue;
    }
    if (w in ONES) {
      if (last === 'unit' || last === 'teen' || last === 'digit') break;
      if (last === 'tens' && ONES[w] >= 10) break;
      current += ONES[w];
      last = ONES[w] >= 10 ? 'teen' : 'unit';
      any = true;
      continue;
    }
    if (w in TENS) {
      if (last === 'unit' || last === 'teen' || last === 'tens' || last === 'digit') break;
      current += TENS[w];
      last = 'tens';
      any = true;
      continue;
    }
    if (w === 'hundred' || w === 'hundreds') {
      if (!any) break;
      current = (current || 1) * 100;
      last = 'hundred';
      continue;
    }
    if (w in SCALES) {
      if (!any) break;
      // "k" is only a scale directly after digits ("2 k").
      if (w === 'k' && last !== 'digit') break;
      total += (current || 1) * SCALES[w];
      current = 0;
      last = 'scale';
      continue;
    }
    if (w === 'and' && (last === 'hundred' || last === 'scale')) {
      const nx = raw[j + 1];
      if (nx && (nx in ONES || nx in TENS)) continue;
      break;
    }
    break;
  }
  if (!any) return null;
  const value = total + current;
  return { value: Math.round(value * 100) / 100, length: j - i };
}

// ───────────────────────── detection passes ─────────────────────────

interface DateHit {
  offsetDays: number | null;
  absolute: Date | null;
  hour: number | null;
  minute: number;
}

function detectDate(tokens: Token[], now: Date): DateHit {
  const hit: DateHit = { offsetDays: null, absolute: null, hour: null, minute: 0 };
  const t = (k: number) => tokens[k]?.text;
  const consume = (...idx: number[]) => idx.forEach((k) => tokens[k] && (tokens[k].consumed = true));

  for (let i = 0; i < tokens.length; i++) {
    const w = t(i);
    if (tokens[i].consumed) continue;

    if (w === 'day' && t(i + 1) === 'before' && t(i + 2) === 'yesterday') {
      hit.offsetDays = -2; consume(i, i + 1, i + 2); continue;
    }
    if (w === 'yesterday') { hit.offsetDays ??= -1; consume(i); continue; }
    if (w === 'last' && t(i + 1) === 'night') { hit.offsetDays ??= -1; hit.hour ??= 21; consume(i, i + 1); continue; }
    if (w === 'today' || w === 'tonight') { hit.offsetDays ??= 0; if (w === 'tonight') hit.hour ??= 20; consume(i); continue; }
    if (w === 'this' && ['morning', 'afternoon', 'evening'].includes(t(i + 1) ?? '')) {
      hit.offsetDays ??= 0; consume(i, i + 1); continue;
    }
    if ((w === 'last' || w === 'past') && t(i + 1) === 'week') { hit.offsetDays ??= -7; consume(i, i + 1); continue; }
    if (w === 'a' && t(i + 1) === 'week' && t(i + 2) === 'ago') { hit.offsetDays ??= -7; consume(i, i + 1, i + 2); continue; }

    // "3 days ago"
    if (tokens[i].kind === 'number' && (t(i + 1) === 'days' || t(i + 1) === 'day') && t(i + 2) === 'ago') {
      hit.offsetDays ??= -Math.round(tokens[i].value!);
      consume(i, i + 1, i + 2);
      continue;
    }

    // weekdays: "on monday", "last friday", "monday"
    if (w && w in WEEKDAYS) {
      const target = WEEKDAYS[w];
      let diff = (now.getDay() - target + 7) % 7;
      const prev = t(i - 1);
      if (prev === 'last' && diff === 0) diff = 7;
      hit.offsetDays ??= -diff;
      consume(i);
      if (prev === 'last' || prev === 'on' || prev === 'this' || prev === 'past') consume(i - 1);
      continue;
    }

    // "5th october", "5 oct", "october 5", "on the 5th"
    if (w && w in MONTHS) {
      const month = MONTHS[w];
      const before = tokens[i - 1];
      const after = tokens[i + 1];
      let day: number | null = null;
      if (before?.kind === 'number' && before.value! >= 1 && before.value! <= 31 && Number.isInteger(before.value)) {
        day = before.value!; consume(i - 1);
        if (t(i - 2) === 'the') consume(i - 2);
        if (t(i - 2) === 'on' || t(i - 3) === 'on') consume(t(i - 2) === 'on' ? i - 2 : i - 3);
      } else if (after?.kind === 'number' && after.value! >= 1 && after.value! <= 31 && Number.isInteger(after.value)) {
        day = after.value!; consume(i + 1);
      }
      if (day !== null || w !== 'may') {
        if (day === null) continue; // bare month name without a day — ignore
        let d = new Date(now.getFullYear(), month, day);
        if (d.getTime() > now.getTime()) d = new Date(now.getFullYear() - 1, month, day);
        hit.absolute ??= d;
        consume(i);
        if (t(i - 1) === 'of') consume(i - 1);
      }
      continue;
    }
    if (tokens[i].kind === 'number' && tokens[i].ordinal && (t(i - 1) === 'the' || t(i - 1) === 'on')) {
      const day = tokens[i].value!;
      if (day >= 1 && day <= 31) {
        let d = new Date(now.getFullYear(), now.getMonth(), day);
        if (d.getTime() > now.getTime()) d = new Date(now.getFullYear(), now.getMonth() - 1, day);
        hit.absolute ??= d;
        consume(i, i - 1);
        if (t(i - 2) === 'on') consume(i - 2);
      }
      continue;
    }

    // time: "at 5 pm", "5:30 pm", "at 9 oclock"
    const timeMatch = /^(\d{1,2}):(\d{2})$/.exec(w ?? '');
    if (timeMatch || (tokens[i].kind === 'number' && ['am', 'pm', 'oclock'].includes(t(i + 1) ?? ''))) {
      let h = timeMatch ? Number(timeMatch[1]) : tokens[i].value!;
      const m = timeMatch ? Number(timeMatch[2]) : 0;
      const suffix = t(i + 1);
      if (h >= 0 && h <= 23 && m < 60 && Number.isInteger(h)) {
        if (suffix === 'pm' && h < 12) h += 12;
        if (suffix === 'am' && h === 12) h = 0;
        hit.hour = h;
        hit.minute = m;
        consume(i);
        if (suffix === 'am' || suffix === 'pm' || suffix === 'oclock') consume(i + 1);
        if (t(i - 1) === 'at' || t(i - 1) === 'around') consume(i - 1);
      }
      continue;
    }
    if (['morning', 'afternoon', 'evening', 'night'].includes(w ?? '') && (t(i - 1) === 'in' || t(i - 1) === 'at')) {
      consume(i - 1, i);
      if (t(i - 2) === 'the' || t(i - 1) === 'the') consume(i - 2);
    }
  }
  return hit;
}

function detectPayment(text: string): PaymentMethodId | null {
  for (const [re, id] of PAYMENT_PATTERNS) if (re.test(text)) return id;
  return null;
}

const PAYMENT_WORDS = new Set([
  'upi', 'gpay', 'google', 'pay', 'phonepe', 'phone', 'pe', 'paytm', 'bhim', 'cash', 'card', 'credit',
  'debit', 'netbanking', 'net', 'banking', 'bank', 'transfer', 'neft', 'imps', 'rtgs', 'swiped',
]);

/** Marks "via upi", "using credit card", "by cash", "in cash" phrases as consumed. */
function consumePaymentPhrases(tokens: Token[]): void {
  for (let i = 0; i < tokens.length; i++) {
    const w = tokens[i].text;
    if (['via', 'using', 'through', 'by', 'with', 'in', 'from'].includes(w)) {
      let j = i + 1;
      if (tokens[j]?.text === 'my') j++;
      const start = j;
      while (tokens[j] && PAYMENT_WORDS.has(tokens[j].text)) j++;
      // "phone" alone is not a payment phrase ("phone bill"); require a strong word.
      const span = tokens.slice(start, j).map((x) => x.text);
      const strong = span.some((x) => ['upi', 'gpay', 'phonepe', 'paytm', 'bhim', 'cash', 'card', 'netbanking', 'banking', 'neft', 'imps', 'rtgs', 'transfer'].includes(x));
      if (j > start && strong) for (let k = i; k < j; k++) tokens[k].consumed = true;
    } else if (w === 'upi' || w === 'gpay' || w === 'phonepe' || w === 'paytm') {
      tokens[i].consumed = true;
    } else if (w === 'cash' && (tokens[i + 1]?.kind !== 'word' || !tokens[i + 1] || tokens[i + 1].text === ',')) {
      tokens[i].consumed = true;
    }
  }
}

// ───────────────────────── segmentation ─────────────────────────

interface AmountSpan {
  /** First token index belonging to the amount (prefix currency word included). */
  start: number;
  /** Last token index belonging to the amount (suffix currency/paise words included). */
  end: number;
  value: number;
  strong: boolean;
}

function findAmounts(tokens: Token[]): AmountSpan[] {
  const spans: AmountSpan[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i];
    if (tok.kind !== 'number' || tok.consumed || tok.ordinal) continue;
    const next = tokens[i + 1]?.text;
    const prev = tokens[i - 1]?.text;
    if (next && NON_AMOUNT_UNITS.has(next)) continue;

    let start = i;
    let end = i;
    let strong = false;
    let value = tok.value!;
    if (next && CURRENCY_WORDS.has(next)) {
      strong = true;
      end = i + 1;
      // "250 rupees 50 paise"
      const p = tokens[i + 2];
      if (p?.kind === 'number' && PAISE_WORDS.has(tokens[i + 3]?.text ?? '') && p.value! < 100) {
        value += p.value! / 100;
        end = i + 3;
      }
    } else if (prev && CURRENCY_WORDS.has(prev)) {
      strong = true;
      start = i - 1;
    } else if (next && PAISE_WORDS.has(next)) {
      value = value / 100;
      strong = true;
      end = i + 1;
    }
    spans.push({ start, end, value, strong });
    i = end;
  }

  // Drop "weak" small numbers that read as quantities ("2 coffees for 80", "one samosa for 20")
  // when other amounts exist.
  if (spans.length > 1) {
    const filtered = spans.filter((s) => {
      if (s.strong || s.value >= 10) return true;
      const after = tokens[s.end + 1];
      const isQty = after && after.kind === 'word' && !PREPOSITIONS.has(after.text) && !CONJUNCTIONS.has(after.text) && !VERBS.has(after.text);
      return !isQty;
    });
    if (filtered.length > 0) return filtered;
  }
  return spans;
}

function isContent(tok: Token): boolean {
  if (tok.consumed || tok.kind === 'sep') return false;
  if (tok.kind === 'number') return true; // quantities stay in descriptions ("2 coffees")
  return !FILLERS.has(tok.text) && !VERBS.has(tok.text) && !CURRENCY_WORDS.has(tok.text);
}

function hasContent(tokens: Token[]): boolean {
  return tokens.some((t) => isContent(t) && !PREPOSITIONS.has(t.text) && !CONJUNCTIONS.has(t.text));
}

/** Trims fillers/verbs/prepositions at both ends, then joins words. */
function describe(tokens: Token[]): string {
  const words = tokens.filter((t) => !t.consumed && t.kind !== 'sep' && !CURRENCY_WORDS.has(t.text) && !VERBS.has(t.text) && !FILLERS.has(t.text));
  const edge = (t: Token) => PREPOSITIONS.has(t.text) || CONJUNCTIONS.has(t.text);
  while (words.length && edge(words[0])) words.shift();
  while (words.length && edge(words[words.length - 1])) words.pop();
  return titleCase(words.map((t) => (t.kind === 'number' ? String(t.value) : t.text)).join(' '));
}

const LOWER_WORDS = new Set(['for', 'of', 'with', 'to', 'at', 'on', 'in', 'from']);

function titleCase(s: string): string {
  return s
    .split(' ')
    .filter(Boolean)
    .map((w, idx) => {
      if (w === 'and') return '&';
      if (idx > 0 && LOWER_WORDS.has(w)) return w;
      if (w === 'upi' || w === 'emi' || w === 'dth') return w.toUpperCase();
      return w.charAt(0).toUpperCase() + w.slice(1);
    })
    .join(' ')
    .slice(0, 60);
}

/** Collects description tokens after an amount, stopping where the next item begins. */
function forwardWindow(tokens: Token[], from: number, to: number, isLast: boolean): { words: Token[]; stop: number } {
  const words: Token[] = [];
  let k = from;
  for (; k < to; k++) {
    const tok = tokens[k];
    if (tok.kind === 'sep') {
      if (words.some(isContent)) break;
      continue;
    }
    if (!isLast && CONJUNCTIONS.has(tok.text) && words.some(isContent)) break;
    if (VERBS.has(tok.text) && words.some(isContent)) break;
    words.push(tok);
  }
  return { words, stop: k };
}

function classifyType(words: string[]): TransactionType {
  const set = new Set(words);
  if ([...set].some((w) => INCOME_WORDS.has(w))) return 'income';
  if (set.has('got') && (set.has('from') || set.has('paid'))) return 'income';
  return 'expense';
}

function classifyCategory(words: string[], type: TransactionType): { id: string; matched: boolean } {
  const table = type === 'income' ? INCOME_CATEGORY_KEYWORDS : CATEGORY_KEYWORDS;
  for (const [id, keys] of table) {
    if (words.some((w) => keys.includes(w) || keys.includes(w.replace(/s$/, '')))) return { id, matched: true };
  }
  return { id: type === 'income' ? 'other_income' : 'other', matched: false };
}

/** Typical times for meals when the user logs a past day without a time. */
function defaultHourFor(words: string[]): number | null {
  if (words.includes('breakfast')) return 9;
  if (words.includes('lunch')) return 13;
  if (words.includes('dinner')) return 20;
  if (words.some((w) => ['coffee', 'chai', 'tea', 'snacks', 'snack'].includes(w))) return 16;
  return null;
}

let keySeq = 0;
function nextKey(): string {
  keySeq = (keySeq + 1) % 1_000_000;
  return `d${Date.now().toString(36)}${keySeq}`;
}

// ───────────────────────── public API ─────────────────────────

export function parseTranscript(transcript: string, options: ParseOptions = {}): ParseResult {
  const now = options.now ?? new Date();
  const fallbackPayment = options.defaultPaymentMethod ?? 'upi';
  const normalised = normalise(transcript);
  if (!normalised) return { drafts: [], dayOffset: null };

  const tokens = tokenize(normalised);
  const date = detectDate(tokens, now);
  const globalPayment = detectPayment(normalised);
  consumePaymentPhrases(tokens);
  const amounts = findAmounts(tokens);

  const baseDay = date.absolute
    ? new Date(date.absolute)
    : new Date(now.getFullYear(), now.getMonth(), now.getDate() + (date.offsetDays ?? 0));
  const isToday = baseDay.toDateString() === now.toDateString();

  const drafts: DraftTransaction[] = [];
  let boundary = 0;

  amounts.forEach((amt, idx) => {
    const isLast = idx === amounts.length - 1;
    const nextStart = isLast ? tokens.length : amounts[idx + 1].start;

    const back = tokens.slice(boundary, amt.start);
    const fwd = forwardWindow(tokens, amt.end + 1, nextStart, isLast);
    const fwdHead = fwd.words.find((t) => !t.consumed && t.kind !== 'sep' && !FILLERS.has(t.text));
    const fwdHasPrep = !!fwdHead && PREPOSITIONS.has(fwdHead.text);

    let descTokens: Token[];
    if (fwdHasPrep && hasContent(fwd.words)) {
      descTokens = fwd.words;
      boundary = fwd.stop;
    } else if (hasContent(back)) {
      descTokens = back;
      boundary = amt.end + 1;
    } else if (hasContent(fwd.words)) {
      descTokens = fwd.words;
      boundary = fwd.stop;
    } else {
      descTokens = [];
      boundary = amt.end + 1;
    }

    // Words that describe this item: chosen description plus the verb context around the amount.
    const contextTokens = [...back, ...fwd.words];
    const contextWords = (amounts.length === 1 ? tokens : contextTokens).map((t) => t.text);
    const descWords = descTokens.map((t) => t.text);

    const type = classifyType(contextWords);
    const cat = classifyCategory(descWords.length ? [...descWords, ...contextWords] : contextWords, type);
    let description = describe(descTokens);
    if (!description) description = type === 'income' ? 'Income' : 'Expense';

    const segmentText = contextTokens.map((t) => t.text).join(' ');
    const payment = detectPayment(segmentText) ?? globalPayment ?? fallbackPayment;

    const when = new Date(baseDay);
    if (date.hour !== null) {
      when.setHours(date.hour, date.minute, 0, 0);
    } else if (isToday) {
      when.setHours(now.getHours(), now.getMinutes(), 0, 0);
    } else {
      when.setHours(defaultHourFor(descWords) ?? 12, 0, 0, 0);
    }

    const amountOk = amt.value > 0 && amt.value <= MAX_AMOUNT_RUPEES;
    drafts.push({
      key: nextKey(),
      type,
      amount: amountOk ? amt.value : null,
      categoryId: cat.id,
      description,
      occurredAt: when.getTime(),
      paymentMethod: payment,
      notes: '',
      needsReview: !amountOk || descTokens.length === 0 || !cat.matched,
    });
  });

  return {
    drafts,
    dayOffset: date.absolute
      ? Math.round((new Date(baseDay).setHours(0, 0, 0, 0) - new Date(now).setHours(0, 0, 0, 0)) / 86_400_000)
      : date.offsetDays,
  };
}
