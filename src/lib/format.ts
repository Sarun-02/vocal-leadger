const INR = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 0 });

/** 2040000 paise → "₹20,400"; keeps paise only when non-zero ("₹14.50"). */
export function formatINR(paise: number): string {
  const rupees = Math.abs(paise) / 100;
  const hasFraction = Math.round(Math.abs(paise)) % 100 !== 0;
  const text = hasFraction
    ? rupees.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : INR.format(Math.round(rupees));
  return `${paise < 0 ? '-' : ''}₹${text}`;
}

/** Plain grouped number without the symbol, for inputs ("35,000"). */
export function formatGrouped(rupees: number): string {
  return INR.format(rupees);
}

export function rupeesToPaise(rupees: number): number {
  return Math.round(rupees * 100);
}

export function paiseToRupees(paise: number): number {
  return paise / 100;
}

/**
 * Parses a user-typed amount ("1,250.50", "₹ 300") into rupees.
 * Returns null for anything that is not a positive, finite number with ≤ 2 decimals.
 */
export function parseAmountInput(raw: string): number | null {
  const cleaned = raw.replace(/[₹,\s]/g, '').replace(/^rs\.?/i, '');
  if (!/^\d+(\.\d{0,2})?$/.test(cleaned)) return null;
  const value = Number(cleaned);
  if (!Number.isFinite(value) || value <= 0) return null;
  return value;
}

/** Upper bound for a single entry — guards against mis-heard voice amounts. */
export const MAX_AMOUNT_RUPEES = 10_000_000;
