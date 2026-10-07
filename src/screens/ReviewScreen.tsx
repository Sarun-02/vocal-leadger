import { useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AppHeader } from '../components/AppHeader';
import { CategoryChips, PaymentChips, TypeToggle } from '../components/ChipPickers';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Icon } from '../components/Icon';
import { EmptyState, FieldError, Spinner } from '../components/States';
import { coerceCategory, getCategory, iconForTransaction } from '../data/categories';
import { formatReviewDate, fromDateTimeInputs, toDateInputValue, toTimeInputValue } from '../lib/dates';
import { formatINR, parseAmountInput, rupeesToPaise } from '../lib/format';
import { finalDescription, hasErrors, validateTransaction, type FieldErrors } from '../lib/validation';
import type { DraftTransaction, TransactionInput } from '../models/types';
import { haptics } from '../services/haptics';
import { useAppData } from '../state/AppDataContext';
import { useBackHandler } from '../state/BackHandlerContext';
import { useToast } from '../state/ToastContext';
import { useVoiceDrafts } from '../state/VoiceDraftContext';

/** design-reference/review_transactions_vocal_ledger */
export function ReviewScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const { addTransactions } = useAppData();
  const { drafts, transcript, notice, setDrafts, clear } = useVoiceDrafts();

  const [expanded, setExpanded] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, FieldErrors>>({});
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const needsAttention = drafts.some((d) => d.needsReview || d.amount === null);
  const batch = useMemo(() => {
    let expense = 0;
    let income = 0;
    for (const d of drafts) {
      if (d.amount === null) continue;
      if (d.type === 'income') income += rupeesToPaise(d.amount);
      else expense += rupeesToPaise(d.amount);
    }
    return { expense, income };
  }, [drafts]);

  const fromVoice = (location.state as { fromVoice?: boolean } | null)?.fromVoice === true;

  useBackHandler(cancelOpen === false && pendingDelete === null && drafts.length > 0, () => setCancelOpen(true));

  function update(key: string, patch: Partial<DraftTransaction>) {
    setDrafts((prev) => prev.map((d) => (d.key === key ? { ...d, ...patch } : d)));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: {} }));
  }

  function remove(key: string) {
    setDrafts((prev) => prev.filter((d) => d.key !== key));
    setPendingDelete(null);
    if (expanded === key) setExpanded(null);
    haptics.tap();
  }

  function leave() {
    clear();
    // Return to wherever voice entry was started (skipping the voice screen itself).
    if (fromVoice && window.history.length > 2) navigate(-2);
    else navigate('/', { replace: true });
  }

  async function save() {
    if (saving || drafts.length === 0) return;
    const found: Record<string, FieldErrors> = {};
    for (const d of drafts) {
      const e = validateTransaction({ ...d, amount: d.amount, source: 'voice', transcript });
      if (hasErrors(e)) found[d.key] = e;
    }
    setErrors(found);
    const firstBad = drafts.find((d) => found[d.key]);
    if (firstBad) {
      setExpanded(firstBad.key);
      haptics.warning();
      requestAnimationFrame(() => cardRefs.current[firstBad.key]?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
      toast({ tone: 'error', message: 'Fix the highlighted transaction before saving.' });
      return;
    }
    setSaving(true);
    try {
      const inputs: TransactionInput[] = drafts.map((d) => ({
        type: d.type,
        amountPaise: rupeesToPaise(d.amount!),
        categoryId: d.categoryId,
        description: finalDescription(d.description, d.categoryId),
        occurredAt: d.occurredAt,
        paymentMethod: d.paymentMethod,
        notes: d.notes.trim(),
        source: 'voice',
        transcript,
      }));
      await addTransactions(inputs);
      haptics.success();
      toast({ tone: 'success', message: `Recorded ${inputs.length} transaction${inputs.length > 1 ? 's' : ''} to your ledger.` });
      leave();
    } catch (e) {
      toast({ tone: 'error', message: e instanceof Error ? e.message : 'Could not save. Please try again.' });
    } finally {
      setSaving(false);
    }
  }

  if (drafts.length === 0) {
    return (
      <div className="bg-surface text-on-surface font-body-md text-body-md flex flex-col min-h-[100dvh]">
        <AppHeader variant="stack" title="Transaction Review" onBack={leave} />
        <main className="flex-1 flex flex-col w-full pt-header pb-safe bg-surface">
          <div className="px-margin pt-space-xl max-w-2xl mx-auto w-full">
            <div className="bg-surface-container-lowest rounded-2xl shadow-sm">
              <EmptyState
                icon="mic"
                title="Nothing left to review"
                message={transcript ? 'All detected transactions were removed.' : 'Record a voice entry to review it here.'}
                action={
                  <button type="button" className="h-11 px-space-lg rounded-full bg-primary text-on-primary font-label-lg text-label-lg" onClick={() => navigate('/voice', { replace: true })}>
                    Start voice entry
                  </button>
                }
              />
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="bg-surface text-on-surface font-body-md text-body-md flex flex-col min-h-[100dvh]">
      <AppHeader variant="stack" title="Transaction Review" />
      <main className="flex-1 flex flex-col relative w-full pt-header pb-safe bg-surface">
        <div className="flex flex-col w-full max-w-2xl mx-auto relative pb-40">
          {/* Interactive Feedback Pill / Audio Recognition Badge */}
          <div className="px-margin pt-space-sm mb-space-sm flex items-center justify-between gap-2">
            <div className="inline-flex items-center gap-space-xs bg-surface-container-high px-space-md py-1 rounded-full text-primary">
              <Icon name="mic" className="text-[16px] animate-pulse" />
              <span className="font-label-sm text-label-sm font-semibold tracking-wide uppercase">
                Voice Captured • {drafts.length} {drafts.length === 1 ? 'Item' : 'Items'}
              </span>
            </div>
            {needsAttention ? (
              <span className="font-label-sm text-label-sm text-on-surface-variant flex items-center gap-1">
                <Icon name="error" className="text-[15px] text-tertiary" />
                Check highlighted
              </span>
            ) : (
              <span className="font-label-sm text-label-sm text-on-surface-variant flex items-center gap-1">
                <Icon name="check_circle" className="text-[15px] text-secondary" />
                Parsed successfully
              </span>
            )}
          </div>

          <div className="px-margin mb-space-md">
            <p className="font-body-md text-body-md text-on-surface-variant">Review and edit the detected transactions before saving.</p>
            {notice && <p className="font-body-sm text-body-sm text-outline mt-1">{notice}</p>}
          </div>

          <div className="px-margin flex flex-col gap-space-md" id="transaction-card-list">
            {drafts.map((d) => (
              <ReviewCard
                key={d.key}
                ref={(el) => {
                  cardRefs.current[d.key] = el;
                }}
                draft={d}
                errors={errors[d.key]}
                expanded={expanded === d.key}
                onToggle={() => setExpanded((cur) => (cur === d.key ? null : d.key))}
                onExpand={() => setExpanded(d.key)}
                onChange={(patch) => update(d.key, patch)}
                onDelete={() => setPendingDelete(d.key)}
              />
            ))}
          </div>

          {/* Total Summary Chip Strip */}
          <div className="mx-margin mt-space-lg flex items-center justify-between py-space-sm bg-surface-container-low rounded-xl px-space-md">
            <div className="flex items-center gap-2">
              <Icon name="receipt_long" className="text-[18px] text-primary" />
              <span className="font-label-lg text-label-lg text-on-surface font-medium">Batch Total</span>
            </div>
            <div className="flex flex-col items-end">
              {(batch.expense > 0 || batch.income === 0) && (
                <div className="flex items-baseline gap-1">
                  <span className="font-title-sm text-title-sm text-on-surface-variant">Expense:</span>
                  <span className="font-title-md text-title-md text-tertiary font-bold tabular-nums" id="batch-total">{formatINR(batch.expense)}</span>
                </div>
              )}
              {batch.income > 0 && (
                <div className="flex items-baseline gap-1">
                  <span className="font-title-sm text-title-sm text-on-surface-variant">Income:</span>
                  <span className="font-title-md text-title-md text-secondary font-bold tabular-nums">{formatINR(batch.income)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Sticky Bottom Action Bar */}
          <div className="hide-on-keyboard fixed bottom-0 left-0 right-0 z-40 bg-surface/95 backdrop-blur-md pb-safe pt-space-sm px-margin shadow-[0_-4px_16px_rgba(15,23,42,0.06)]">
            <div className="flex flex-col gap-space-xs max-w-lg mx-auto pb-space-sm">
              <button
                type="button"
                className="w-full h-12 bg-primary text-on-primary rounded-full font-label-lg text-label-lg font-semibold flex items-center justify-center gap-2 shadow-md hover:bg-primary-container active:scale-[0.99] transition-all disabled:opacity-60"
                id="save-button"
                onClick={save}
                disabled={saving}
              >
                {saving ? <Spinner className="w-5 h-5 border-white/30 border-t-white" /> : <Icon name="task_alt" className="text-[20px]" />}
                <span id="save-button-text">
                  {saving ? 'Saving…' : `Confirm & Save (${drafts.length} Transaction${drafts.length > 1 ? 's' : ''})`}
                </span>
              </button>
              <button type="button" className="w-full h-11 bg-transparent text-on-surface-variant hover:text-on-surface rounded-full font-label-lg text-label-lg font-medium flex items-center justify-center transition-colors" onClick={() => setCancelOpen(true)} disabled={saving}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      </main>

      <ConfirmDialog
        open={pendingDelete !== null}
        icon="delete"
        destructive
        title="Discard this transaction?"
        message="It will be removed from this batch and won't be saved."
        confirmLabel="Discard"
        onConfirm={() => pendingDelete && remove(pendingDelete)}
        onCancel={() => setPendingDelete(null)}
      />
      <ConfirmDialog
        open={cancelOpen}
        icon="close"
        destructive
        title="Cancel review?"
        message="Voice transactions will not be saved."
        confirmLabel="Discard all"
        cancelLabel="Keep editing"
        onConfirm={() => {
          setCancelOpen(false);
          leave();
        }}
        onCancel={() => setCancelOpen(false)}
      />
    </div>
  );
}

interface ReviewCardProps {
  draft: DraftTransaction;
  errors?: FieldErrors;
  expanded: boolean;
  onToggle(): void;
  onExpand(): void;
  onChange(patch: Partial<DraftTransaction>): void;
  onDelete(): void;
  ref?: (el: HTMLDivElement | null) => void;
}

function ReviewCard({ draft, errors, expanded, onToggle, onExpand, onChange, onDelete, ref }: ReviewCardProps) {
  const income = draft.type === 'income';
  const cat = getCategory(draft.categoryId);
  const [amountText, setAmountText] = useState(draft.amount === null ? '' : String(draft.amount));
  const flagged = draft.needsReview || draft.amount === null || (errors && hasErrors(errors));

  return (
    <div
      ref={ref}
      className={`transaction-item bg-surface-container-lowest rounded-xl p-space-md shadow-sm relative transition-all duration-200 ${flagged ? 'ring-2 ring-tertiary-fixed-dim' : ''} ${expanded ? 'ring-2 ring-primary-container' : ''}`}
    >
      <div className="flex items-start justify-between gap-space-sm pb-space-sm">
        <div className="flex items-center gap-space-sm flex-1 min-w-0">
          <div className="w-10 h-10 rounded-full bg-surface-container-high text-primary flex items-center justify-center shrink-0">
            <Icon name={iconForTransaction(draft.description, draft.categoryId)} className="text-[20px]" />
          </div>
          <div className="flex-1 min-w-0">
            <button type="button" className="flex items-center gap-1.5 group max-w-full" onClick={onExpand}>
              <span className="font-title-md text-title-md text-on-surface truncate">{draft.description || 'Add description'}</span>
              <Icon name="edit" className="text-[16px] text-outline group-hover:text-primary transition-colors shrink-0" />
            </button>
            <div className="flex items-center gap-space-xs mt-0.5 flex-wrap">
              <span className={`font-label-sm text-label-sm px-2 py-0.5 rounded-full font-medium ${income ? 'bg-secondary-container text-on-secondary-container' : 'bg-error-container text-on-error-container'}`}>{income ? 'Income' : 'Expense'}</span>
              <span className="text-outline text-label-sm">•</span>
              <button type="button" className="font-label-sm text-label-sm text-on-surface-variant hover:text-primary transition-colors flex items-center gap-0.5" onClick={onExpand}>
                <span>{cat.longLabel}</span>
                <Icon name="arrow_drop_down" className="text-[14px]" />
              </button>
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end">
          <button type="button" className="flex items-baseline gap-0.5 bg-surface-container-low px-space-sm py-1 rounded-lg hover:bg-surface-container transition-colors" onClick={onExpand}>
            <span className={`font-title-sm text-title-sm ${income ? 'text-secondary' : 'text-tertiary'}`}>₹</span>
            <span className={`font-headline-sm text-headline-sm tabular-nums font-semibold ${draft.amount === null ? 'text-outline' : income ? 'text-secondary' : 'text-tertiary'}`}>
              {draft.amount === null ? '—' : formatINR(rupeesToPaise(draft.amount)).replace('₹', '')}
            </span>
            <Icon name="edit" className={`text-[14px] ml-0.5 opacity-60 ${income ? 'text-secondary' : 'text-tertiary'}`} />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="flex flex-col gap-space-md pt-space-sm pb-space-sm border-t border-surface-container-low animate-fade-in">
          <div className="flex justify-center">
            <TypeToggle
              value={draft.type}
              onChange={(t) => onChange({ type: t, categoryId: coerceCategory(draft.categoryId, t) })}
            />
          </div>
          <div className="grid grid-cols-[1fr_auto] gap-space-sm">
            <div className="flex flex-col gap-1">
              <label className="font-label-md text-label-md text-on-surface-variant font-medium" htmlFor={`desc-${draft.key}`}>Description</label>
              <input
                id={`desc-${draft.key}`}
                className="w-full bg-surface-container-low rounded-xl px-3 py-2.5 font-body-lg text-body-lg text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                value={draft.description}
                maxLength={60}
                onChange={(e) => onChange({ description: e.target.value, needsReview: false })}
              />
              <FieldError message={errors?.description} />
            </div>
            <div className="flex flex-col gap-1 w-28">
              <label className="font-label-md text-label-md text-on-surface-variant font-medium" htmlFor={`amt-${draft.key}`}>Amount (₹)</label>
              <input
                id={`amt-${draft.key}`}
                inputMode="decimal"
                className="w-full bg-surface-container-low rounded-xl px-3 py-2.5 font-title-md text-title-md text-on-surface tabular-nums focus:outline-none focus:ring-2 focus:ring-primary"
                value={amountText}
                placeholder="0"
                onChange={(e) => {
                  const raw = e.target.value.replace(/[^\d.]/g, '');
                  setAmountText(raw);
                  onChange({ amount: parseAmountInput(raw), needsReview: false });
                }}
              />
              <FieldError message={errors?.amount} />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <span className="font-label-md text-label-md text-on-surface-variant font-medium">Category</span>
            <CategoryChips type={draft.type} value={draft.categoryId} onChange={(id) => onChange({ categoryId: id, needsReview: false })} />
            <FieldError message={errors?.category} />
          </div>
          <div className="flex flex-col gap-1">
            <span className="font-label-md text-label-md text-on-surface-variant font-medium">Payment method</span>
            <PaymentChips value={draft.paymentMethod} onChange={(p) => onChange({ paymentMethod: p })} />
          </div>
          <div className="grid grid-cols-2 gap-space-sm">
            <div className="flex flex-col gap-1">
              <label className="font-label-md text-label-md text-on-surface-variant font-medium" htmlFor={`date-${draft.key}`}>Date</label>
              <input
                id={`date-${draft.key}`}
                type="date"
                className="w-full bg-surface-container-low rounded-xl px-3 py-2.5 font-body-md text-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                value={toDateInputValue(draft.occurredAt)}
                max={toDateInputValue(Date.now())}
                onChange={(e) => {
                  const ts = fromDateTimeInputs(e.target.value, toTimeInputValue(draft.occurredAt));
                  if (ts !== null) onChange({ occurredAt: ts });
                }}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="font-label-md text-label-md text-on-surface-variant font-medium" htmlFor={`time-${draft.key}`}>Time</label>
              <input
                id={`time-${draft.key}`}
                type="time"
                className="w-full bg-surface-container-low rounded-xl px-3 py-2.5 font-body-md text-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                value={toTimeInputValue(draft.occurredAt)}
                onChange={(e) => {
                  const ts = fromDateTimeInputs(toDateInputValue(draft.occurredAt), e.target.value);
                  if (ts !== null) onChange({ occurredAt: ts });
                }}
              />
            </div>
          </div>
          <FieldError message={errors?.date} />
          <div className="flex flex-col gap-1">
            <label className="font-label-md text-label-md text-on-surface-variant font-medium" htmlFor={`notes-${draft.key}`}>Notes (optional)</label>
            <input
              id={`notes-${draft.key}`}
              className="w-full bg-surface-container-low rounded-xl px-3 py-2.5 font-body-md text-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
              value={draft.notes}
              maxLength={500}
              placeholder="Add a note"
              onChange={(e) => onChange({ notes: e.target.value })}
            />
            <FieldError message={errors?.notes} />
          </div>
        </div>
      )}

      {/* Footer Row: Date & Action Icons */}
      <div className="pt-space-sm mt-space-xs flex items-center justify-between bg-surface-bright rounded-lg px-space-sm py-1.5">
        <button type="button" className="flex items-center gap-1.5 text-on-surface-variant hover:text-primary transition-colors min-w-0" onClick={onExpand}>
          <Icon name="calendar_today" className="text-[16px]" />
          <span className="font-body-sm text-body-sm truncate">{formatReviewDate(draft.occurredAt)}</span>
        </button>
        <div className="flex items-center gap-1 shrink-0">
          <button type="button" aria-label={expanded ? 'Done editing' : 'Edit transaction'} aria-expanded={expanded} className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${expanded ? 'text-primary bg-surface-container' : 'text-outline hover:text-primary hover:bg-surface-container'}`} onClick={onToggle}>
            <Icon name={expanded ? 'check' : 'tune'} className="text-[18px]" />
          </button>
          <button type="button" aria-label="Delete transaction" className="w-8 h-8 rounded-full flex items-center justify-center text-outline hover:text-error hover:bg-error-container/40 transition-all" onClick={onDelete}>
            <Icon name="delete" className="text-[18px]" />
          </button>
        </div>
      </div>
    </div>
  );
}
