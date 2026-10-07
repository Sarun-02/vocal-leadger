import { getCategory, iconForTransaction } from '../data/categories';
import { formatDateShort, formatTime } from '../lib/dates';
import { formatINR } from '../lib/format';
import type { Transaction } from '../models/types';
import { Icon } from './Icon';

interface RowProps {
  tx: Transaction;
  onOpen: (tx: Transaction) => void;
}

/** Row inside the Home screen's "Today's Transactions" card (design: home_vocal_ledger). */
export function HomeTransactionRow({ tx, onOpen }: RowProps) {
  const income = tx.type === 'income';
  const cat = getCategory(tx.categoryId);
  return (
    <button type="button" onClick={() => onOpen(tx)} className="w-full text-left flex items-center justify-between p-3 hover:bg-surface-container-low/40 active:bg-surface-container-low/60 rounded-xl transition-colors">
      <div className="flex items-center gap-3 min-w-0">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${income ? 'bg-secondary-fixed text-on-secondary-fixed-variant' : 'bg-tertiary-fixed text-on-tertiary-fixed-variant'}`}>
          <Icon name={iconForTransaction(tx.description, tx.categoryId)} className="text-[20px]" />
        </div>
        <div className="flex flex-col min-w-0">
          <span className="font-title-sm text-title-sm text-on-surface truncate">{tx.description}</span>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="font-label-sm text-label-sm text-on-surface-variant">{formatTime(tx.occurredAt)}</span>
            <span className="w-1 h-1 rounded-full bg-outline-variant" />
            <span className={`font-label-sm text-label-sm px-1.5 py-[0.05rem] rounded ${income ? 'bg-secondary-container text-on-secondary-container' : 'bg-surface-container text-on-surface-variant'}`}>{cat.label}</span>
            {tx.source === 'voice' && <Icon name="mic" className="text-[13px] text-outline" />}
          </div>
        </div>
      </div>
      <div className="text-right shrink-0 pl-2">
        <span className={`font-title-md text-title-md font-semibold tabular-nums ${income ? 'text-secondary' : 'text-tertiary'}`}>
          {income ? '+' : '-'} {formatINR(tx.amountPaise)}
        </span>
      </div>
    </button>
  );
}

/** Card row in the Transactions ledger (design: transactions_ledger_vocal_ledger). */
export function LedgerTransactionRow({ tx, onOpen }: RowProps) {
  const income = tx.type === 'income';
  const cat = getCategory(tx.categoryId);
  return (
    <button type="button" onClick={() => onOpen(tx)} className="w-full text-left bg-surface-container-lowest rounded-xl p-space-md shadow-sm hover:shadow-md active:bg-surface-container-low/60 transition-shadow flex items-center justify-between gap-2">
      <div className="flex items-center gap-3 min-w-0">
        <div className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 ${income ? 'bg-secondary-container text-on-secondary-container' : 'bg-surface-container text-on-surface'}`}>
          <Icon name={iconForTransaction(tx.description, tx.categoryId)} className={income ? 'text-[22px]' : 'text-[20px]'} />
        </div>
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-title-sm text-title-sm text-on-surface truncate">{tx.description}</span>
            <span className="bg-surface-container-high text-on-surface-variant font-label-sm text-label-sm px-2 py-0.5 rounded-full shrink-0">{income && tx.categoryId === 'salary' ? 'Income' : cat.label}</span>
          </div>
          <span className="font-body-sm text-body-sm text-on-surface-variant mt-0.5 truncate">
            {formatDateShort(tx.occurredAt)} • {formatTime(tx.occurredAt)}
          </span>
        </div>
      </div>
      <div className="flex flex-col items-end shrink-0">
        <span className={`font-title-md text-title-md tabular-nums ${income ? 'text-secondary' : 'text-error'}`}>
          {income ? '+' : '-'} {formatINR(tx.amountPaise)}
        </span>
        {income ? (
          <span className="font-label-sm text-label-sm text-secondary-fixed-dim bg-surface-container-low px-1.5 py-[0.05rem] rounded mt-0.5">Credit</span>
        ) : (
          <span className="font-label-sm text-label-sm text-on-surface-variant">Debit</span>
        )}
      </div>
    </button>
  );
}
