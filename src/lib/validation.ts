import { getCategory } from '../data/categories';
import type { TransactionInput } from '../models/types';
import { MAX_AMOUNT_RUPEES } from './format';

export interface FieldErrors {
  amount?: string;
  description?: string;
  date?: string;
  notes?: string;
  category?: string;
}

export const DESCRIPTION_MAX = 60;
export const NOTES_MAX = 500;

/** Validates a transaction about to be saved. Returns an empty object when valid. */
export function validateTransaction(input: Omit<TransactionInput, 'amountPaise'> & { amount: number | null }, now = Date.now()): FieldErrors {
  const errors: FieldErrors = {};
  if (input.amount === null || !Number.isFinite(input.amount)) errors.amount = 'Enter an amount.';
  else if (input.amount <= 0) errors.amount = 'Amount must be greater than zero.';
  else if (input.amount > MAX_AMOUNT_RUPEES) errors.amount = 'That amount looks too large.';
  else if (Math.round(input.amount * 100) !== input.amount * 100 && Math.abs(Math.round(input.amount * 100) - input.amount * 100) > 1e-6)
    errors.amount = 'Use at most two decimal places.';

  if (input.description.trim().length > DESCRIPTION_MAX) errors.description = `Keep it under ${DESCRIPTION_MAX} characters.`;
  if (input.notes.length > NOTES_MAX) errors.notes = `Notes can be up to ${NOTES_MAX} characters.`;

  if (!Number.isFinite(input.occurredAt)) errors.date = 'Pick a valid date.';
  else if (input.occurredAt > now + 60 * 60 * 1000) errors.date = "Date can't be in the future.";

  const cat = getCategory(input.categoryId);
  if (cat.type !== input.type) errors.category = 'Pick a category for this type.';
  return errors;
}

export function hasErrors(e: FieldErrors): boolean {
  return Object.values(e).some(Boolean);
}

/** Empty descriptions fall back to the category name so lists never show blank rows. */
export function finalDescription(description: string, categoryId: string): string {
  const d = description.trim().replace(/\s+/g, ' ');
  return d || getCategory(categoryId).label;
}
