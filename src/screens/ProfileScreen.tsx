import { useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppHeader } from '../components/AppHeader';
import { BottomSheet } from '../components/BottomSheet';
import { PaymentChips } from '../components/ChipPickers';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Icon } from '../components/Icon';
import { FieldError } from '../components/States';
import { config } from '../config/env';
import { formatINR } from '../lib/format';
import { totals } from '../lib/stats';
import { validatePassword } from '../services/auth/authService';
import { useAppData } from '../state/AppDataContext';
import { useToast } from '../state/ToastContext';

const LANGUAGES = [
  { id: 'en-IN', label: 'English (India)' },
  { id: 'en-US', label: 'English (US)' },
  { id: 'en-GB', label: 'English (UK)' },
  { id: 'hi-IN', label: 'Hindi' },
];

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative w-12 h-7 rounded-full transition-colors shrink-0 ${checked ? 'bg-primary-container' : 'bg-surface-container-high'}`}
    >
      <span className={`absolute top-1 w-5 h-5 rounded-full bg-surface-container-lowest shadow transition-all ${checked ? 'left-6' : 'left-1'}`} />
    </button>
  );
}

function Row({ icon, title, subtitle, right, onClick, danger }: { icon: string; title: string; subtitle?: string; right?: ReactNode; onClick?: () => void; danger?: boolean }) {
  const content = (
    <>
      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${danger ? 'bg-error-container text-on-error-container' : 'bg-surface-container-high text-primary'}`}>
        <Icon name={icon} className="text-[20px]" />
      </div>
      <div className="flex flex-col flex-1 min-w-0 text-left">
        <span className={`font-title-sm text-title-sm ${danger ? 'text-error' : 'text-on-surface'}`}>{title}</span>
        {subtitle && <span className="font-body-sm text-body-sm text-on-surface-variant">{subtitle}</span>}
      </div>
      {right ?? (onClick && <Icon name="chevron_right" className="text-outline text-[20px]" />)}
    </>
  );
  return onClick ? (
    <button type="button" onClick={onClick} className="w-full flex items-center gap-3 py-3 px-1 rounded-xl active:bg-surface-container-low">
      {content}
    </button>
  ) : (
    <div className="w-full flex items-center gap-3 py-3 px-1">{content}</div>
  );
}

/** Profile & settings, reached from the avatar in every header. */
export function ProfileScreen() {
  const navigate = useNavigate();
  const toast = useToast();
  const { account, transactions, settings, updateSettings, signOut, changePassword, eraseAllData } = useAppData();
  const [pwOpen, setPwOpen] = useState(false);
  const [eraseOpen, setEraseOpen] = useState(false);
  const [signOutOpen, setSignOutOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const all = totals(transactions);

  async function patch(p: Parameters<typeof updateSettings>[0]) {
    try {
      await updateSettings(p);
    } catch {
      toast({ tone: 'error', message: 'Could not save the setting.' });
    }
  }

  return (
    <div className="bg-surface text-on-surface font-body-md text-body-md flex flex-col min-h-[100dvh]">
      <AppHeader variant="stack" title="Profile" hideAvatar />
      <main className="flex-1 flex flex-col w-full pt-header pb-safe bg-surface">
        <div className="flex flex-col w-full max-w-2xl mx-auto px-margin pb-space-xl gap-space-md pt-space-sm">
          <section className="bg-surface-container-lowest rounded-2xl p-space-lg shadow-sm flex items-center gap-space-md">
            <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center shrink-0">
              <Icon name="person" className="text-on-primary text-[30px]" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-title-lg text-title-lg text-on-surface truncate">{account?.username}</span>
              <span className="font-body-sm text-body-sm text-on-surface-variant">Local account · data stored on this device</span>
            </div>
          </section>

          <section className="grid grid-cols-3 gap-2">
            {[
              { label: 'Entries', value: String(all.count) },
              { label: 'Total spent', value: formatINR(all.expensePaise) },
              { label: 'Total income', value: formatINR(all.incomePaise) },
            ].map((s) => (
              <div key={s.label} className="bg-surface-container-lowest rounded-xl p-2.5 shadow-sm flex flex-col min-w-0">
                <span className="font-label-sm text-label-sm text-on-surface-variant">{s.label}</span>
                <span className="font-title-sm text-title-sm text-on-surface mt-1 truncate tabular-nums">{s.value}</span>
              </div>
            ))}
          </section>

          <section className="bg-surface-container-lowest rounded-2xl p-space-md shadow-sm flex flex-col gap-space-sm">
            <h2 className="font-title-md text-title-md text-on-surface px-1">Voice & Entry</h2>
            <div className="flex flex-col gap-1.5 px-1">
              <span className="font-label-md text-label-md text-on-surface-variant">Speech language</span>
              <div className="flex flex-wrap gap-2">
                {LANGUAGES.map((l) => (
                  <button
                    key={l.id}
                    type="button"
                    className={`px-3.5 py-1.5 rounded-full font-label-md text-label-md transition-all active:scale-95 ${settings.voiceLanguage === l.id ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface-variant'}`}
                    onClick={() => patch({ voiceLanguage: l.id })}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-1.5 px-1 pt-space-sm">
              <span className="font-label-md text-label-md text-on-surface-variant">Default payment method</span>
              <PaymentChips value={settings.defaultPaymentMethod} onChange={(p) => patch({ defaultPaymentMethod: p })} />
            </div>
          </section>

          <section className="bg-surface-container-lowest rounded-2xl px-space-md py-space-xs shadow-sm divide-y divide-surface-container-low">
            <Row icon="notifications_active" title="Budget alerts" subtitle="Notify at 80% and when over budget" right={<Toggle label="Budget alerts" checked={settings.budgetAlerts} onChange={(v) => patch({ budgetAlerts: v })} />} />
            <Row icon="vibration" title="Haptic feedback" subtitle="Vibrate on taps and saves" right={<Toggle label="Haptic feedback" checked={settings.haptics} onChange={(v) => patch({ haptics: v })} />} />
          </section>

          <section className="bg-surface-container-lowest rounded-2xl px-space-md py-space-xs shadow-sm divide-y divide-surface-container-low">
            <Row icon="lock_reset" title="Change password" onClick={() => setPwOpen(true)} />
            <Row icon="logout" title="Sign out" subtitle="Your data stays on this device" onClick={() => setSignOutOpen(true)} />
            <Row icon="delete_forever" title="Erase all data" subtitle="Delete every transaction, budget and setting" onClick={() => setEraseOpen(true)} danger />
          </section>

          <p className="font-label-sm text-label-sm text-outline text-center">
            Vocal Ledger v{config.appVersion} · Works offline{config.aiParserUrl ? ' · Smart parsing enabled' : ''}
          </p>
        </div>
      </main>

      <ChangePasswordSheet
        open={pwOpen}
        onClose={() => setPwOpen(false)}
        onSubmit={async (cur, next) => {
          const ok = await changePassword(cur, next);
          if (ok) toast({ tone: 'success', message: 'Password changed.' });
          return ok;
        }}
      />
      <ConfirmDialog
        open={signOutOpen}
        icon="logout"
        title="Sign out?"
        message="You'll need your password to open your ledger again."
        confirmLabel="Sign out"
        onConfirm={async () => {
          setSignOutOpen(false);
          await signOut().catch(() => toast({ tone: 'error', message: 'Could not sign out.' }));
          navigate('/', { replace: true });
        }}
        onCancel={() => setSignOutOpen(false)}
      />
      <ConfirmDialog
        open={eraseOpen}
        icon="delete_forever"
        destructive
        busy={busy}
        title="Erase all data?"
        message={`This permanently deletes ${all.count} transactions, your budgets, settings and account from this device.`}
        confirmLabel="Erase everything"
        onConfirm={async () => {
          setBusy(true);
          try {
            await eraseAllData();
            setEraseOpen(false);
            toast({ tone: 'info', message: 'All data erased.' });
            navigate('/', { replace: true });
          } catch {
            toast({ tone: 'error', message: 'Could not erase data. Please try again.' });
          } finally {
            setBusy(false);
          }
        }}
        onCancel={() => setEraseOpen(false)}
      />
    </div>
  );
}

function ChangePasswordSheet({ open, onClose, onSubmit }: { open: boolean; onClose: () => void; onSubmit: (cur: string, next: string) => Promise<boolean> }) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<{ current?: string; next?: string; confirm?: string }>({});
  const [busy, setBusy] = useState(false);

  function close() {
    setCurrent('');
    setNext('');
    setConfirm('');
    setErrors({});
    onClose();
  }

  async function submit() {
    const e = {
      current: current ? undefined : 'Enter your current password.',
      next: validatePassword(next) ?? undefined,
      confirm: next === confirm ? undefined : 'Passwords do not match.',
    };
    setErrors(e);
    if (e.current || e.next || e.confirm) return;
    setBusy(true);
    try {
      if (await onSubmit(current, next)) close();
      else setErrors({ current: 'Current password is incorrect.' });
    } catch {
      setErrors({ current: 'Could not update the password. Try again.' });
    } finally {
      setBusy(false);
    }
  }

  const field = (id: string, label: string, value: string, set: (v: string) => void, err?: string, auto = 'new-password') => (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="font-label-md text-label-md text-on-surface-variant font-medium">{label}</label>
      <input id={id} type="password" autoComplete={auto} value={value} onChange={(e) => set(e.target.value)} className="w-full bg-surface-container-low rounded-xl px-space-md py-3 font-body-lg text-body-lg text-on-surface focus:outline-none focus:shadow-[0_0_0_2px_#2c4ecf]" />
      <FieldError message={err} />
    </div>
  );

  return (
    <BottomSheet open={open} onClose={close} label="Change password">
      <h4 className="font-title-lg text-title-lg text-on-surface font-semibold mb-space-md">Change password</h4>
      <form
        className="flex flex-col gap-space-md"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        {field('pw-current', 'Current password', current, setCurrent, errors.current, 'current-password')}
        {field('pw-new', 'New password', next, setNext, errors.next)}
        {field('pw-confirm', 'Confirm new password', confirm, setConfirm, errors.confirm)}
        <div className="flex w-full gap-space-sm pt-space-sm">
          <button type="button" className="flex-1 h-11 rounded-full bg-surface-container text-on-surface font-label-lg text-label-lg" onClick={close}>
            Cancel
          </button>
          <button type="submit" disabled={busy} className="flex-1 h-11 rounded-full bg-primary text-on-primary font-label-lg text-label-lg disabled:opacity-60">
            {busy ? 'Saving…' : 'Update'}
          </button>
        </div>
      </form>
    </BottomSheet>
  );
}
