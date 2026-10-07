export type TransactionType = 'expense' | 'income';

export type PaymentMethodId = 'cash' | 'upi' | 'debit_card' | 'credit_card' | 'net_banking' | 'other';

export type TransactionSource = 'manual' | 'voice';

/** A stored ledger entry. Amounts are integer paise to avoid floating point drift. */
export interface Transaction {
  id: string;
  type: TransactionType;
  amountPaise: number;
  categoryId: string;
  description: string;
  /** Epoch milliseconds of when the transaction happened. */
  occurredAt: number;
  paymentMethod: PaymentMethodId;
  notes: string;
  source: TransactionSource;
  /** Original speech transcript for voice-captured entries. */
  transcript: string;
  createdAt: number;
  updatedAt: number;
}

/** Fields the user supplies when creating or editing a transaction. */
export type TransactionInput = Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>;

/** A transaction detected from speech, still editable before saving. */
export interface DraftTransaction {
  /** Local key for list rendering; not persisted. */
  key: string;
  type: TransactionType;
  /** Rupees as entered/parsed; null when the parser could not find an amount. */
  amount: number | null;
  categoryId: string;
  description: string;
  occurredAt: number;
  paymentMethod: PaymentMethodId;
  notes: string;
  /** True when the parser guessed with low confidence and the user should check it. */
  needsReview: boolean;
}

/** Month key in the form `YYYY-MM`. */
export type MonthKey = string;

export interface Budget {
  month: MonthKey;
  amountPaise: number;
}

export interface AppSettings {
  voiceLanguage: string;
  defaultPaymentMethod: PaymentMethodId;
  budgetAlerts: boolean;
  haptics: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  voiceLanguage: 'en-IN',
  defaultPaymentMethod: 'upi',
  budgetAlerts: true,
  haptics: true,
};

export interface UserAccount {
  username: string;
  /** PBKDF2-SHA256 hash, base64. */
  passwordHash: string;
  /** Random salt, base64. */
  salt: string;
  iterations: number;
}
