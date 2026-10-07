import { categoriesFor, PAYMENT_METHODS } from '../data/categories';
import type { PaymentMethodId, TransactionType } from '../models/types';
import { Icon } from './Icon';

const CHIP = 'shrink-0 flex items-center gap-space-xs px-space-md py-2 rounded-full transition-all';
const CHIP_ON = 'bg-primary-container text-on-primary shadow-sm';
const CHIP_OFF = 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high';

/** Horizontally scrolling category chips (design: manual_entry_vocal_ledger). */
export function CategoryChips({ type, value, onChange }: { type: TransactionType; value: string; onChange: (id: string) => void }) {
  return (
    <div className="overflow-x-auto no-scrollbar -mx-margin px-margin py-1 flex items-center gap-space-sm" role="radiogroup" aria-label="Category">
      {categoriesFor(type).map((c) => (
        <button key={c.id} type="button" role="radio" aria-checked={value === c.id} className={`${CHIP} ${value === c.id ? CHIP_ON : CHIP_OFF}`} onClick={() => onChange(c.id)}>
          <Icon name={c.icon} className="text-[18px]" />
          <span className="font-label-lg text-label-lg">{c.label}</span>
        </button>
      ))}
    </div>
  );
}

/** Payment method chips, same chip style as categories. */
export function PaymentChips({ value, onChange }: { value: PaymentMethodId; onChange: (id: PaymentMethodId) => void }) {
  return (
    <div className="overflow-x-auto no-scrollbar -mx-margin px-margin py-1 flex items-center gap-space-sm" role="radiogroup" aria-label="Payment method">
      {PAYMENT_METHODS.map((p) => (
        <button key={p.id} type="button" role="radio" aria-checked={value === p.id} className={`${CHIP} ${value === p.id ? CHIP_ON : CHIP_OFF}`} onClick={() => onChange(p.id)}>
          <Icon name={p.icon} className="text-[18px]" />
          <span className="font-label-lg text-label-lg">{p.label}</span>
        </button>
      ))}
    </div>
  );
}

/** Expense / Income segmented toggle (design: manual entry header). */
export function TypeToggle({ value, onChange }: { value: TransactionType; onChange: (t: TransactionType) => void }) {
  const base = 'flex-1 flex items-center justify-center gap-space-xs py-2 rounded-full font-label-lg text-label-lg transition-all duration-200';
  const off = 'text-on-surface-variant hover:text-on-surface';
  return (
    <div className="p-1 bg-surface-container rounded-full flex items-center w-full max-w-xs shadow-sm" role="radiogroup" aria-label="Type">
      <button type="button" role="radio" aria-checked={value === 'expense'} className={`${base} ${value === 'expense' ? 'bg-tertiary-container text-on-tertiary shadow-sm' : off}`} onClick={() => onChange('expense')}>
        <Icon name="remove_circle" className="text-[18px]" />
        <span>Expense</span>
      </button>
      <button type="button" role="radio" aria-checked={value === 'income'} className={`${base} ${value === 'income' ? 'bg-secondary text-on-secondary shadow-sm' : off}`} onClick={() => onChange('income')}>
        <Icon name="add_circle" className="text-[18px]" />
        <span>Income</span>
      </button>
    </div>
  );
}
