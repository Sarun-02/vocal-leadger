import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useBackHandler } from '../state/BackHandlerContext';

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  /** Accessible label for the dialog. */
  label: string;
  /** Centered text layout like the design's voice sheet. */
  centered?: boolean;
}

/**
 * Modal sheet, styled after the design's "voiceModal": scrim `bg-inverse-surface/40` with blur,
 * `rounded-3xl` white card with a drag handle. Closes on scrim tap and on Android back.
 */
export function BottomSheet({ open, onClose, children, label, centered }: BottomSheetProps) {
  useBackHandler(open, onClose);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;
  return createPortal(
    <div
      className="fixed inset-0 z-[60] bg-inverse-surface/40 backdrop-blur-sm flex flex-col justify-end p-margin animate-fade-in"
      style={{ paddingBottom: 'calc(var(--sab) + 1rem)' }}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className={`w-full max-w-lg mx-auto bg-surface-container-lowest rounded-3xl p-space-lg shadow-2xl flex flex-col max-h-[85dvh] overflow-y-auto no-scrollbar animate-sheet-in ${centered ? 'items-center text-center' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-outline-variant rounded-full mb-space-md self-center shrink-0" />
        {children}
      </div>
    </div>,
    document.body,
  );
}
