import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppHeader } from '../components/AppHeader';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Icon } from '../components/Icon';
import { EmptyState } from '../components/States';
import { getCategory, getPaymentMethod, iconForTransaction } from '../data/categories';
import { formatDateLong, formatTime, relativeDayLabel } from '../lib/dates';
import { formatINR } from '../lib/format';
import { haptics } from '../services/haptics';
import { useAppData } from '../state/AppDataContext';
import { useToast } from '../state/ToastContext';

function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 py-3">
      <div className="w-9 h-9 rounded-full bg-surface-container-low flex items-center justify-center text-on-surface-variant shrink-0">
        <Icon name={icon} className="text-[18px]" />
      </div>
      <div className="flex flex-col min-w-0">
        <span className="font-label-sm text-label-sm text-on-surface-variant">{label}</span>
        <span className="font-title-sm text-title-sm text-on-surface break-words">{value}</span>
      </div>
    </div>
  );
}

/** Detail view for a single ledger entry, with Edit and Delete. */
export function TransactionDetailScreen() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { getTransaction, deleteTransaction, restoreTransaction, status } = useAppData();
  const tx = getTransaction(id);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!tx) {
    return (
      <div className="bg-surface text-on-surface flex flex-col min-h-[100dvh]">
        <AppHeader variant="stack" title="Transaction" />
        <main className="pt-header px-margin max-w-2xl mx-auto w-full">
          {status === 'ready' && (
            <div className="mt-space-lg bg-surface-container-lowest rounded-2xl shadow-sm">
              <EmptyState icon="search_off" title="Transaction not found" message="It may have been deleted." />
            </div>
          )}
        </main>
      </div>
    );
  }

  const income = tx.type === 'income';
  const cat = getCategory(tx.categoryId);

  async function remove() {
    if (!tx) return;
    setBusy(true);
    try {
      const removed = await deleteTransaction(tx.id);
      haptics.success();
      setConfirmOpen(false);
      navigate(-1);
      toast({
        tone: 'info',
        message: 'Transaction deleted.',
        action: {
          label: 'Undo',
          onClick: () => {
            restoreTransaction(removed).catch(() => toast({ tone: 'error', message: 'Could not restore the transaction.' }));
          },
        },
      });
    } catch (e) {
      setBusy(false);
      toast({ tone: 'error', message: e instanceof Error ? e.message : 'Could not delete. Please try again.' });
    }
  }

  return (
    <div className="bg-surface text-on-surface font-body-md text-body-md flex flex-col min-h-[100dvh]">
      <AppHeader variant="stack" title="Transaction" />
      <main className="flex-1 flex flex-col w-full pt-header pb-safe bg-surface">
        <div className="flex flex-col w-full max-w-2xl mx-auto px-margin pb-space-xl gap-space-md pt-space-sm">
          <section className="bg-surface-container-lowest rounded-2xl p-space-lg shadow-[0_1px_3px_rgba(15,23,42,0.06),0_1px_2px_rgba(15,23,42,0.04)] flex flex-col items-center text-center">
            <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-space-sm ${income ? 'bg-secondary-container text-on-secondary-container' : 'bg-tertiary-fixed text-on-tertiary-fixed-variant'}`}>
              <Icon name={iconForTransaction(tx.description, tx.categoryId)} className="text-[28px]" />
            </div>
            <span className="font-title-md text-title-md text-on-surface">{tx.description}</span>
            <span className={`font-display-lg-mobile text-display-lg-mobile tracking-tight mt-1 tabular-nums ${income ? 'text-secondary' : 'text-tertiary'}`}>
              {income ? '+' : '-'} {formatINR(tx.amountPaise)}
            </span>
            <div className="flex items-center gap-space-xs mt-space-sm">
              <span className={`font-label-sm text-label-sm px-2 py-0.5 rounded-full font-medium ${income ? 'bg-secondary-container text-on-secondary-container' : 'bg-error-container text-on-error-container'}`}>{income ? 'Income' : 'Expense'}</span>
              <span className="bg-surface-container-high text-on-surface-variant font-label-sm text-label-sm px-2 py-0.5 rounded-full">{cat.label}</span>
              {tx.source === 'voice' && (
                <span className="bg-surface-container-high text-primary font-label-sm text-label-sm px-2 py-0.5 rounded-full flex items-center gap-0.5">
                  <Icon name="mic" className="text-[12px]" /> Voice
                </span>
              )}
            </div>
          </section>

          <section className="bg-surface-container-lowest rounded-2xl px-space-md py-space-xs shadow-sm divide-y divide-surface-container-low">
            <InfoRow icon="calendar_today" label="Date" value={`${formatDateLong(tx.occurredAt)} · ${relativeDayLabel(tx.occurredAt)}`} />
            <InfoRow icon="schedule" label="Time" value={formatTime(tx.occurredAt)} />
            <InfoRow icon={cat.icon} label="Category" value={cat.longLabel} />
            <InfoRow icon={getPaymentMethod(tx.paymentMethod).icon} label="Payment method" value={getPaymentMethod(tx.paymentMethod).label} />
            {tx.notes && <InfoRow icon="sticky_note_2" label="Notes" value={tx.notes} />}
            {tx.transcript && <InfoRow icon="record_voice_over" label="Voice transcript" value={`“${tx.transcript}”`} />}
          </section>

          <div className="flex gap-space-sm pt-space-sm">
            <button type="button" className="flex-1 h-12 rounded-full bg-surface-container-high text-primary font-label-lg text-label-lg flex items-center justify-center gap-2 active:scale-[0.99]" onClick={() => navigate(`/edit/${tx.id}`)}>
              <Icon name="edit" className="text-[20px]" />
              Edit
            </button>
            <button type="button" className="flex-1 h-12 rounded-full bg-error-container text-on-error-container font-label-lg text-label-lg flex items-center justify-center gap-2 active:scale-[0.99]" onClick={() => setConfirmOpen(true)}>
              <Icon name="delete" className="text-[20px]" />
              Delete
            </button>
          </div>
          <p className="font-label-sm text-label-sm text-outline text-center">
            Added {formatDateLong(tx.createdAt)}
            {tx.updatedAt > tx.createdAt + 1000 ? ` · Edited ${formatDateLong(tx.updatedAt)}` : ''}
          </p>
        </div>
      </main>

      <ConfirmDialog
        open={confirmOpen}
        icon="delete"
        destructive
        title="Delete this transaction?"
        message={`${tx.description} · ${formatINR(tx.amountPaise)} will be removed and your totals updated.`}
        confirmLabel="Delete"
        busy={busy}
        onConfirm={remove}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
