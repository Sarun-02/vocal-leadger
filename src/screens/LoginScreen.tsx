import { useState, type FormEvent } from 'react';
import logo from '../assets/logo.png';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Icon } from '../components/Icon';
import { FieldError, Spinner } from '../components/States';
import { validatePassword, validateUsername } from '../services/auth/authService';
import { haptics } from '../services/haptics';
import { useAppData } from '../state/AppDataContext';
import { useToast } from '../state/ToastContext';

/** design-reference/login_vocal_ledger — creates the on-device account on first launch, then signs in. */
export function LoginScreen() {
  const { account, createAccount, signIn, eraseAllData } = useAppData();
  const toast = useToast();
  const creating = !account;

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<{ username?: string; password?: string; form?: string }>({});
  const [resetOpen, setResetOpen] = useState(false);
  const [resetting, setResetting] = useState(false);

  async function submit(e?: FormEvent) {
    e?.preventDefault();
    if (busy) return;
    const next = { username: validateUsername(username) ?? undefined, password: validatePassword(password) ?? undefined };
    if (!creating) next.password = password ? undefined : 'Enter your password.';
    setErrors(next);
    if (next.username || next.password) {
      haptics.warning();
      return;
    }
    setBusy(true);
    try {
      if (creating) {
        await createAccount(username, password);
        haptics.success();
        toast({ tone: 'success', message: 'Account created. Welcome to Vocal Ledger!' });
      } else if (!(await signIn(username, password))) {
        haptics.warning();
        setErrors({ form: 'Incorrect username or password.' });
      } else {
        haptics.success();
      }
    } catch {
      setErrors({ form: 'Could not access secure storage on this device. Please try again.' });
    } finally {
      setBusy(false);
    }
  }

  async function resetApp() {
    setResetting(true);
    try {
      await eraseAllData();
      setResetOpen(false);
      setUsername('');
      setPassword('');
      setErrors({});
      toast({ tone: 'info', message: 'All data erased. Create a new account to start over.' });
    } catch {
      toast({ tone: 'error', message: 'Could not erase data. Please try again.' });
    } finally {
      setResetting(false);
    }
  }

  return (
    <div className="bg-surface text-on-surface font-body-md text-body-md flex flex-col min-h-[100dvh] pt-safe pb-safe">
      <main className="flex-1 flex flex-col relative w-full bg-surface">
        <form className="flex flex-col w-full max-w-lg mx-auto px-margin pb-space-xl" onSubmit={submit} noValidate>
          {/* Brand Header & Emblem */}
          <div className="flex flex-col items-center text-center mt-space-lg mb-space-xl">
            <div className="relative w-20 h-20 mb-space-md flex items-center justify-center rounded-2xl bg-surface-container shadow-md">
              <img alt="Vocal Ledger Icon" className="w-16 h-16 object-contain rounded-xl" src={logo} />
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-secondary-container flex items-center justify-center text-on-secondary-container shadow-sm">
                <Icon name="mic" className="text-sm leading-none" fill />
              </div>
            </div>
            <h1 className="font-headline-md text-headline-md text-on-surface tracking-tight">Vocal Ledger</h1>
            <p className="font-body-md text-body-md text-on-surface-variant mt-space-xs">Simple voice-first finance</p>
          </div>

          {/* Form Container */}
          <div className="w-full bg-surface-container-lowest rounded-2xl p-space-lg shadow-sm flex flex-col gap-space-lg">
            {creating && (
              <p className="font-body-sm text-body-sm text-on-surface-variant -mb-space-sm">
                Create a local account to protect your ledger on this device.
              </p>
            )}
            <div className="flex flex-col gap-1.5 relative">
              <label className="font-label-md text-label-md text-on-surface-variant font-medium" htmlFor="username">
                Username or Email
              </label>
              <div className="relative flex items-center bg-surface-container-low rounded-xl px-space-md py-3 focus-within:bg-surface-container-lowest focus-within:shadow-[0_0_0_2px_#2c4ecf] transition-all duration-200">
                <Icon name="person" className="text-outline mr-3 text-[22px]" />
                <input
                  autoComplete="username"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  className="w-full bg-transparent font-body-lg text-body-lg text-on-surface placeholder:text-outline focus:outline-none"
                  id="username"
                  placeholder="e.g. rahul.sharma"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  aria-invalid={!!errors.username}
                  enterKeyHint="next"
                />
              </div>
              <FieldError message={errors.username} />
            </div>

            <div className="flex flex-col gap-1.5 relative">
              <div className="flex items-center justify-between">
                <label className="font-label-md text-label-md text-on-surface-variant font-medium" htmlFor="password">
                  {creating ? 'Create Password' : 'Password'}
                </label>
              </div>
              <div className="relative flex items-center bg-surface-container-low rounded-xl px-space-md py-3 focus-within:bg-surface-container-lowest focus-within:shadow-[0_0_0_2px_#2c4ecf] transition-all duration-200">
                <Icon name="lock" className="text-outline mr-3 text-[22px]" />
                <input
                  autoComplete={creating ? 'new-password' : 'current-password'}
                  className="w-full bg-transparent font-body-lg text-body-lg text-on-surface placeholder:text-outline focus:outline-none"
                  id="password"
                  placeholder="••••••••"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  aria-invalid={!!errors.password}
                  enterKeyHint="go"
                />
                <button
                  aria-label="Toggle password visibility"
                  className="text-outline hover:text-on-surface transition-colors p-1 flex items-center justify-center focus:outline-none"
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                >
                  <Icon name={showPassword ? 'visibility_off' : 'visibility'} className="text-[20px]" />
                </button>
              </div>
              <FieldError message={errors.password} />
            </div>

            {errors.form && (
              <div role="alert" className="flex items-center gap-2 bg-error-container text-on-error-container rounded-xl px-space-md py-2.5 font-body-sm text-body-sm">
                <Icon name="error" className="text-[18px]" />
                {errors.form}
              </div>
            )}

            <button
              className="w-full bg-primary-container text-on-primary font-label-lg text-label-lg py-3.5 px-space-lg rounded-xl shadow-md active:scale-[0.99] transition-transform duration-150 flex items-center justify-center gap-2 mt-space-xs disabled:opacity-80"
              id="submitBtn"
              type="submit"
              disabled={busy}
            >
              {busy ? <Spinner className="w-5 h-5 border-white/30 border-t-white" /> : null}
              <span>{creating ? 'Create Account' : 'Sign In'}</span>
              {!busy && <Icon name="arrow_forward" className="text-[18px]" />}
            </button>
          </div>

          {/* Subtle Helper Note */}
          <div className="mt-space-lg text-center px-space-sm flex flex-col items-center gap-space-sm">
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              {creating ? 'Your data stays on this device. Speak or type to track seamlessly.' : 'Stored privately on this device. Speak or type to track seamlessly.'}
            </p>
            {!creating && (
              <button type="button" className="font-label-md text-label-md text-primary py-2 px-space-md rounded-full hover:bg-surface-container" onClick={() => setResetOpen(true)}>
                Forgot password?
              </button>
            )}
          </div>
        </form>
      </main>

      <ConfirmDialog
        open={resetOpen}
        icon="delete_forever"
        destructive
        title="Reset Vocal Ledger?"
        message="Passwords can't be recovered because nothing leaves your phone. Resetting erases all transactions, budgets and settings on this device."
        confirmLabel="Erase & Reset"
        busy={resetting}
        onConfirm={resetApp}
        onCancel={() => setResetOpen(false)}
      />
    </div>
  );
}
