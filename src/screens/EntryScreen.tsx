import { useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { AppHeader } from '../components/AppHeader';
import { CategoryChips, PaymentChips, TypeToggle } from '../components/ChipPickers';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Icon } from '../components/Icon';
import { EmptyState, FieldError, Spinner } from '../components/States';
import { coerceCategory, defaultCategoryFor, getCategory } from '../data/categories';
import { formatEntryDate, fromDateTimeInputs, toDateInputValue, toTimeInputValue } from '../lib/dates';
import { paiseToRupees, parseAmountInput, rupeesToPaise } from '../lib/format';
import { finalDescription, hasErrors, NOTES_MAX, validateTransaction, type FieldErrors } from '../lib/validation';
import type { PaymentMethodId, Transaction, TransactionType } from '../models/types';
import { haptics } from '../services/haptics';
import { useAppData } from '../state/AppDataContext';
import { useBackHandler } from '../state/BackHandlerContext';
import { useToast } from '../state/ToastContext';

/** design-reference/manual_entry_vocal_ledger — used for both "Add" (/add) and "Edit" (/edit/:id). */
export function EntryScreen() {
  const { id } = useParams();
  const { getTransaction, status } = useAppData();
  const existing = id ? getTransaction(id) : undefined;

  if (id && !existing) {
    return (
      <div className="bg-surface flex flex-col min-h-[100dvh]">
        <AppHeader variant="stack" title="Edit Transaction" />
        <main className="pt-header px-margin">
          {status === 'ready' && <EmptyState icon="search_off" title="Transaction not found" message="It may have been deleted." />}
        </main>
      </div>
    );
  }
  return <EntryForm key={existing?.id ?? 'new'} existing={existing} />;
}

function EntryForm({ existing }: { existing?: Transaction }) {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const toast = useToast();
  const { addTransactions, updateTransaction, settings } = useAppData();
  const editing = !!existing;

  const initialType: TransactionType = existing?.type ?? (params.get('type') === 'income' ? 'income' : 'expense');
  const initial = useMemo(
    () => ({
      type: initialType,
      amount: existing ? String(paiseToRupees(existing.amountPaise)) : '',
      categoryId: existing?.categoryId ?? defaultCategoryFor(initialType),
      description: existing?.description ?? '',
      date: toDateInputValue(existing?.occurredAt ?? Date.now()),
      time: toTimeInputValue(existing?.occurredAt ?? Date.now()),
      payment: (existing?.paymentMethod ?? settings.defaultPaymentMethod) as PaymentMethodId,
      notes: existing?.notes ?? '',
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const [type, setType] = useState<TransactionType>(initial.type);
  const [amount, setAmount] = useState(initial.amount);
  const [categoryId, setCategoryId] = useState(initial.categoryId);
  const [description, setDescription] = useState(initial.description);
  const [date, setDate] = useState(initial.date);
  const [time, setTime] = useState(initial.time);
  const [payment, setPayment] = useState<PaymentMethodId>(initial.payment);
  const [notes, setNotes] = useState(initial.notes);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);

  const dirty =
    type !== initial.type || amount !== initial.amount || categoryId !== initial.categoryId || description !== initial.description ||
    date !== initial.date || time !== initial.time || payment !== initial.payment || notes !== initial.notes;

  const occurredAt = fromDateTimeInputs(date, time);
  const amountColor = type === 'expense' ? 'text-tertiary-container' : 'text-secondary';

  const requestLeave = () => (dirty && !saving ? setDiscardOpen(true) : navigate(-1));
  useBackHandler(dirty && !discardOpen && !saving, () => setDiscardOpen(true));

  function changeType(t: TransactionType) {
    setType(t);
    setCategoryId((c) => (getCategory(c).type === t ? c : coerceCategory(defaultCategoryFor(t), t)));
  }

  async function save() {
    if (saving) return;
    const value = parseAmountInput(amount);
    const input = {
      type,
      amount: value,
      categoryId,
      description,
      occurredAt: occurredAt ?? NaN,
      paymentMethod: payment,
      notes: notes.trim(),
      source: existing?.source ?? ('manual' as const),
      transcript: existing?.transcript ?? '',
    };
    const e = validateTransaction(input);
    if (amount.trim() && value === null && !e.amount) e.amount = 'Enter a valid amount, e.g. 250 or 99.50.';
    setErrors(e);
    if (hasErrors(e)) {
      haptics.warning();
      return;
    }
    setSaving(true);
    try {
      const record = {
        type,
        amountPaise: rupeesToPaise(value!),
        categoryId,
        description: finalDescription(description, categoryId),
        occurredAt: occurredAt!,
        paymentMethod: payment,
        notes: notes.trim(),
        source: input.source,
        transcript: input.transcript,
      };
      if (existing) await updateTransaction(existing.id, record);
      else await addTransactions([record]);
      haptics.success();
      toast({ tone: 'success', message: editing ? 'Transaction updated.' : `${type === 'income' ? 'Income' : 'Expense'} saved.` });
      navigate(-1);
    } catch (err) {
      setSaving(false);
      toast({ tone: 'error', message: err instanceof Error ? err.message : 'Could not save. Please try again.' });
    }
  }

  return (
    <div className="bg-surface text-on-surface font-body-md text-body-md flex flex-col min-h-[100dvh]">
      <AppHeader variant="stack" title={editing ? 'Edit Entry' : 'Manual Entry'} onBack={requestLeave} />
      <main className="flex-1 flex flex-col relative w-full pt-header pb-safe bg-surface">
        <form
          className="flex flex-col w-full max-w-2xl mx-auto px-margin pb-space-xl pt-space-sm"
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
          noValidate
        >
          <div className="w-full flex justify-center mb-space-lg">
            <TypeToggle value={type} onChange={changeType} />
          </div>

          <div className="flex flex-col items-center justify-center py-space-lg mb-space-md">
            <label htmlFor="amount-input" className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider mb-space-xs font-medium">
              Amount
            </label>
            <div className="flex items-center justify-center w-full">
              <span className={`font-display-lg-mobile text-display-lg-mobile font-semibold transition-colors duration-200 mr-1 ${amountColor}`} id="currency-symbol">
                ₹
              </span>
              <input
                autoFocus={!editing}
                className={`font-display-lg-mobile text-display-lg-mobile bg-transparent font-semibold w-48 text-left focus:outline-none placeholder:text-outline-variant transition-colors duration-200 tabular-nums ${amountColor}`}
                id="amount-input"
                inputMode="decimal"
                placeholder="0.00"
                type="text"
                value={amount}
                aria-invalid={!!errors.amount}
                onChange={(e) => {
                  // digits and a single dot, max 2 decimals
                  let v = e.target.value.replace(/[^\d.]/g, '');
                  const [whole, ...rest] = v.split('.');
                  v = rest.length ? `${whole}.${rest.join('').slice(0, 2)}` : whole;
                  setAmount(v.slice(0, 11));
                  if (errors.amount) setErrors((x) => ({ ...x, amount: undefined }));
                }}
              />
            </div>
            <FieldError message={errors.amount} />
          </div>

          <div className="flex flex-col gap-space-lg">
            <div className="flex flex-col gap-space-xs">
              <div className="flex items-center justify-between">
                <span className="font-label-md text-label-md text-on-surface-variant font-medium">Category</span>
                <span className="font-label-sm text-label-sm text-primary font-medium" id="selected-category-label">
                  {getCategory(categoryId).label}
                </span>
              </div>
              <CategoryChips type={type} value={categoryId} onChange={setCategoryId} />
              <FieldError message={errors.category} />
            </div>

            <div className="flex flex-col gap-space-xs">
              <label className="font-label-md text-label-md text-on-surface-variant font-medium" htmlFor="desc-input">
                Description
              </label>
              <div className="flex items-center gap-space-sm bg-surface-container-lowest rounded-xl px-space-md py-3 shadow-[0px_1px_3px_rgba(15,23,42,0.05)] focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-0">
                <Icon name="edit_note" className="text-outline text-[20px]" />
                <input
                  className="w-full bg-transparent font-body-lg text-body-lg text-on-surface placeholder:text-outline focus:outline-none"
                  id="desc-input"
                  placeholder={type === 'expense' ? 'e.g., Dinner with friends' : 'e.g., October salary'}
                  type="text"
                  maxLength={60}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  enterKeyHint="done"
                />
              </div>
              <FieldError message={errors.description} />
            </div>

            <div className="flex flex-col gap-space-xs">
              <span className="font-label-md text-label-md text-on-surface-variant font-medium">Date</span>
              <div className="grid grid-cols-[1fr_auto] gap-space-sm">
                <div className="relative flex items-center justify-between bg-surface-container-lowest rounded-xl px-space-md py-3 shadow-[0px_1px_3px_rgba(15,23,42,0.05)] cursor-pointer min-w-0">
                  <div className="flex items-center gap-space-sm min-w-0">
                    <Icon name="calendar_today" className="text-primary text-[20px]" />
                    <span className="font-title-sm text-title-sm text-on-surface truncate" id="display-date">
                      {occurredAt !== null ? formatEntryDate(occurredAt) : 'Pick a date'}
                    </span>
                  </div>
                  <Icon name="expand_more" className="text-outline text-[20px]" />
                  <input
                    aria-label="Date"
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    id="date-native"
                    type="date"
                    value={date}
                    max={toDateInputValue(Date.now())}
                    onChange={(e) => e.target.value && setDate(e.target.value)}
                  />
                </div>
                <div className="relative flex items-center gap-space-xs bg-surface-container-lowest rounded-xl px-space-md py-3 shadow-[0px_1px_3px_rgba(15,23,42,0.05)] cursor-pointer">
                  <Icon name="schedule" className="text-primary text-[20px]" />
                  <span className="font-title-sm text-title-sm text-on-surface tabular-nums">
                    {occurredAt !== null ? new Date(occurredAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : '--:--'}
                  </span>
                  <input aria-label="Time" className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" type="time" value={time} onChange={(e) => e.target.value && setTime(e.target.value)} />
                </div>
              </div>
              <FieldError message={errors.date} />
            </div>

            <div className="flex flex-col gap-space-xs">
              <span className="font-label-md text-label-md text-on-surface-variant font-medium">Payment method</span>
              <PaymentChips value={payment} onChange={setPayment} />
            </div>

            <div className="flex flex-col gap-space-xs">
              <div className="flex items-center justify-between">
                <label className="font-label-md text-label-md text-on-surface-variant font-medium" htmlFor="notes-input">
                  Notes <span className="text-outline font-normal">(optional)</span>
                </label>
                {notes.length > NOTES_MAX - 100 && <span className="font-label-sm text-label-sm text-outline">{notes.length}/{NOTES_MAX}</span>}
              </div>
              <div className="flex items-start gap-space-sm bg-surface-container-lowest rounded-xl px-space-md py-3 shadow-[0px_1px_3px_rgba(15,23,42,0.05)] focus-within:ring-2 focus-within:ring-primary">
                <Icon name="sticky_note_2" className="text-outline text-[20px] mt-0.5" />
                <textarea
                  id="notes-input"
                  rows={2}
                  maxLength={NOTES_MAX}
                  className="w-full bg-transparent font-body-lg text-body-lg text-on-surface placeholder:text-outline focus:outline-none resize-none"
                  placeholder="Add details, e.g. split with Priya"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
              <FieldError message={errors.notes} />
            </div>
          </div>

          <div className="mt-space-xl pt-space-md">
            <button
              className={`w-full flex items-center justify-center gap-space-xs h-14 rounded-full text-on-primary font-label-lg text-label-lg shadow-[0px_4px_6px_-1px_rgba(44,78,207,0.25)] hover:opacity-95 active:scale-[0.99] transition-all disabled:opacity-70 ${type === 'expense' ? 'bg-primary-container' : 'bg-secondary'}`}
              id="save-button"
              type="submit"
              disabled={saving}
            >
              {saving ? <Spinner className="w-5 h-5 border-white/30 border-t-white" /> : <Icon name="check" className="text-[20px]" />}
              <span>{saving ? 'Saving…' : editing ? 'Update Transaction' : 'Save Transaction'}</span>
            </button>
          </div>
        </form>
      </main>

      <ConfirmDialog
        open={discardOpen}
        icon="edit_off"
        title="Discard changes?"
        message={editing ? 'Your edits to this transaction will be lost.' : 'This entry has not been saved yet.'}
        confirmLabel="Discard"
        cancelLabel="Keep editing"
        destructive
        onConfirm={() => {
          setDiscardOpen(false);
          navigate(-1);
        }}
        onCancel={() => setDiscardOpen(false)}
      />
    </div>
  );
}
