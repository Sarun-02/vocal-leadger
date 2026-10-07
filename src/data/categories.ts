import type { PaymentMethodId, TransactionType } from '../models/types';

export interface Category {
  id: string;
  type: TransactionType;
  /** Short label used on chips and tags (e.g. "Food"). */
  label: string;
  /** Longer label used in voice/review screens (e.g. "Food & Dining"). */
  longLabel: string;
  /** Material Symbols icon name. */
  icon: string;
}

/** Category ids are persisted — never rename an id, only labels. */
export const CATEGORIES: readonly Category[] = [
  { id: 'food', type: 'expense', label: 'Food', longLabel: 'Food & Dining', icon: 'restaurant' },
  { id: 'transport', type: 'expense', label: 'Transport', longLabel: 'Transportation', icon: 'directions_car' },
  { id: 'groceries', type: 'expense', label: 'Groceries', longLabel: 'Groceries', icon: 'shopping_cart' },
  { id: 'shopping', type: 'expense', label: 'Shopping', longLabel: 'Shopping', icon: 'shopping_bag' },
  { id: 'bills', type: 'expense', label: 'Bills', longLabel: 'Bills & Utilities', icon: 'receipt_long' },
  { id: 'fuel', type: 'expense', label: 'Fuel', longLabel: 'Automobile & Fuel', icon: 'local_gas_station' },
  { id: 'health', type: 'expense', label: 'Health', longLabel: 'Health & Medical', icon: 'medical_services' },
  { id: 'entertainment', type: 'expense', label: 'Fun', longLabel: 'Entertainment', icon: 'movie' },
  { id: 'education', type: 'expense', label: 'Education', longLabel: 'Education', icon: 'school' },
  { id: 'other', type: 'expense', label: 'Other', longLabel: 'Other Expense', icon: 'more_horiz' },
  { id: 'salary', type: 'income', label: 'Salary', longLabel: 'Salary', icon: 'account_balance_wallet' },
  { id: 'work', type: 'income', label: 'Work', longLabel: 'Freelance & Work', icon: 'laptop_mac' },
  { id: 'gift', type: 'income', label: 'Gift', longLabel: 'Gifts', icon: 'redeem' },
  { id: 'refund', type: 'income', label: 'Refund', longLabel: 'Refunds & Cashback', icon: 'currency_exchange' },
  { id: 'other_income', type: 'income', label: 'Other', longLabel: 'Other Income', icon: 'more_horiz' },
];

const BY_ID = new Map(CATEGORIES.map((c) => [c.id, c]));

export function getCategory(id: string): Category {
  return BY_ID.get(id) ?? BY_ID.get('other')!;
}

export function categoriesFor(type: TransactionType): Category[] {
  return CATEGORIES.filter((c) => c.type === type);
}

export function defaultCategoryFor(type: TransactionType): string {
  return type === 'expense' ? 'food' : 'salary';
}

/** Keeps a category valid for the given type (e.g. after toggling Expense → Income). */
export function coerceCategory(categoryId: string, type: TransactionType): string {
  const cat = BY_ID.get(categoryId);
  return cat && cat.type === type ? categoryId : type === 'expense' ? 'other' : 'other_income';
}

/**
 * Item-specific icons, matching the design (lunch → lunch_dining, chai → local_cafe …).
 * Falls back to the category icon.
 */
const DESCRIPTION_ICONS: Array<[RegExp, string]> = [
  [/\b(lunch|burger|sandwich)\b/i, 'lunch_dining'],
  [/\b(coffee|chai|tea|cafe|snacks?)\b/i, 'local_cafe'],
  [/\b(dinner|restaurant|meal|food)\b/i, 'restaurant'],
  [/\b(breakfast)\b/i, 'bakery_dining'],
  [/\b(pizza)\b/i, 'local_pizza'],
  [/\b(petrol|diesel|fuel|cng)\b/i, 'local_gas_station'],
  [/\b(electricity|power)\b/i, 'bolt'],
  [/\b(water)\b/i, 'water_drop'],
  [/\b(internet|wifi|broadband)\b/i, 'wifi'],
  [/\b(mobile|phone|recharge)\b/i, 'smartphone'],
  [/\b(rent)\b/i, 'home'],
  [/\b(grocer(y|ies)|vegetables?|veggies|fruits?)\b/i, 'shopping_basket'],
  [/\b(milk)\b/i, 'water_full'],
  [/\b(uber|ola|cab|taxi|auto|rickshaw|rapido)\b/i, 'local_taxi'],
  [/\b(bus)\b/i, 'directions_bus'],
  [/\b(train|metro)\b/i, 'train'],
  [/\b(flight)\b/i, 'flight'],
  [/\b(movie|cinema)\b/i, 'movie'],
  [/\b(medicines?|pharmacy|tablets?)\b/i, 'medication'],
  [/\b(gym)\b/i, 'fitness_center'],
  [/\b(salary|payroll)\b/i, 'payments'],
  [/\b(freelance|project|client)\b/i, 'laptop_mac'],
  [/\b(books?)\b/i, 'menu_book'],
  [/\b(clothes|shirt|shoes|dress)\b/i, 'checkroom'],
];

export function iconForTransaction(description: string, categoryId: string): string {
  for (const [re, icon] of DESCRIPTION_ICONS) {
    if (re.test(description)) return icon;
  }
  const cat = getCategory(categoryId);
  return cat.id === 'salary' ? 'payments' : cat.icon;
}

export interface PaymentMethod {
  id: PaymentMethodId;
  label: string;
  icon: string;
}

export const PAYMENT_METHODS: readonly PaymentMethod[] = [
  { id: 'upi', label: 'UPI', icon: 'qr_code_scanner' },
  { id: 'cash', label: 'Cash', icon: 'payments' },
  { id: 'debit_card', label: 'Debit Card', icon: 'credit_card' },
  { id: 'credit_card', label: 'Credit Card', icon: 'credit_score' },
  { id: 'net_banking', label: 'Net Banking', icon: 'account_balance' },
  { id: 'other', label: 'Other', icon: 'more_horiz' },
];

export function getPaymentMethod(id: string): PaymentMethod {
  return PAYMENT_METHODS.find((p) => p.id === id) ?? PAYMENT_METHODS[PAYMENT_METHODS.length - 1];
}

export function isPaymentMethodId(v: unknown): v is PaymentMethodId {
  return typeof v === 'string' && PAYMENT_METHODS.some((p) => p.id === v);
}
