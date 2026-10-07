import { BottomSheet } from './BottomSheet';
import { Icon } from './Icon';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
  icon?: string;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Replaces the design's window.confirm() calls with an in-app sheet (same button styles). */
export function ConfirmDialog({ open, title, message, confirmLabel, cancelLabel = 'Cancel', destructive, icon, busy, onConfirm, onCancel }: ConfirmDialogProps) {
  return (
    <BottomSheet open={open} onClose={onCancel} label={title} centered>
      {icon && (
        <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-space-sm ${destructive ? 'bg-error-container text-on-error-container' : 'bg-surface-container-high text-primary'}`}>
          <Icon name={icon} className="text-[28px]" />
        </div>
      )}
      <h4 className="font-title-lg text-title-lg text-on-surface font-semibold">{title}</h4>
      <p className="font-body-md text-body-md text-on-surface-variant mt-1 mb-space-lg">{message}</p>
      <div className="flex w-full gap-space-sm">
        <button type="button" className="flex-1 h-11 rounded-full bg-surface-container text-on-surface font-label-lg text-label-lg active:scale-[0.98] transition-transform" onClick={onCancel} disabled={busy}>
          {cancelLabel}
        </button>
        <button
          type="button"
          className={`flex-1 h-11 rounded-full font-label-lg text-label-lg active:scale-[0.98] transition-transform disabled:opacity-60 ${destructive ? 'bg-tertiary-container text-on-tertiary' : 'bg-primary text-on-primary'}`}
          onClick={onConfirm}
          disabled={busy}
        >
          {busy ? 'Please wait…' : confirmLabel}
        </button>
      </div>
    </BottomSheet>
  );
}
