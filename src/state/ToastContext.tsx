import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { Icon } from '../components/Icon';

type Tone = 'success' | 'error' | 'info';

interface ToastOptions {
  message: string;
  tone?: Tone;
  action?: { label: string; onClick: () => void };
  durationMs?: number;
}

interface ToastState extends Required<Omit<ToastOptions, 'action'>> {
  id: number;
  action?: ToastOptions['action'];
}

const ToastContext = createContext<(opts: ToastOptions) => void>(() => undefined);

const TONE_STYLE: Record<Tone, { icon: string; iconClass: string }> = {
  success: { icon: 'check_circle', iconClass: 'text-secondary-fixed-dim' },
  error: { icon: 'error', iconClass: 'text-tertiary-fixed-dim' },
  info: { icon: 'info', iconClass: 'text-inverse-primary' },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const timer = useRef<number | undefined>(undefined);

  const show = useCallback((opts: ToastOptions) => {
    window.clearTimeout(timer.current);
    const next: ToastState = { id: Date.now(), tone: opts.tone ?? 'info', message: opts.message, action: opts.action, durationMs: opts.durationMs ?? (opts.action ? 5000 : 3000) };
    setToast(next);
    timer.current = window.setTimeout(() => setToast((t) => (t?.id === next.id ? null : t)), next.durationMs);
  }, []);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const style = toast ? TONE_STYLE[toast.tone] : null;
  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className="fixed inset-x-0 z-[70] flex justify-center px-margin pointer-events-none toast-offset" aria-live="polite">
        {toast && style && (
          <div key={toast.id} role="status" className="pointer-events-auto w-full max-w-md bg-inverse-surface text-inverse-on-surface rounded-xl px-space-md py-3 shadow-[0_10px_15px_-3px_rgba(15,23,42,0.25)] flex items-center gap-3 animate-toast-in">
            <Icon name={style.icon} className={`text-[20px] ${style.iconClass}`} fill />
            <span className="flex-1 font-body-md text-body-md">{toast.message}</span>
            {toast.action && (
              <button
                type="button"
                className="font-label-lg text-label-lg text-inverse-primary px-2 py-1 rounded-full active:bg-white/10"
                onClick={() => {
                  toast.action?.onClick();
                  setToast(null);
                }}
              >
                {toast.action.label}
              </button>
            )}
          </div>
        )}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
