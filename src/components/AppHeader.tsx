import { useNavigate } from 'react-router-dom';
import logo from '../assets/logo.png';
import { Icon } from './Icon';

interface AppHeaderProps {
  title: string;
  /** "tab" = top-level screen (brand + bell); "stack" = pushed screen with a back arrow. */
  variant: 'tab' | 'stack';
  onBack?: () => void;
  hasUnread?: boolean;
  onBell?: () => void;
  hideAvatar?: boolean;
}

/** Fixed top app bar, ported from the design's <header>. The mock status-bar row is the real system bar now. */
export function AppHeader({ title, variant, onBack, hasUnread, onBell, hideAvatar }: AppHeaderProps) {
  const navigate = useNavigate();
  const back = onBack ?? (() => navigate(-1));

  return (
    <header className="fixed top-0 w-full z-50 pt-safe bg-surface/80 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
      <div className="h-14 px-margin flex items-center justify-between">
        <div className="flex items-center gap-space-sm min-w-0">
          {variant === 'stack' && (
            <button
              type="button"
              aria-label="Back"
              className="w-11 h-11 -ml-2 flex items-center justify-center text-on-surface hover:text-primary transition-colors rounded-full active:bg-surface-container shrink-0"
              onClick={back}
            >
              <Icon name="arrow_back" className="text-[24px]" />
            </button>
          )}
          <img alt="Vocal Ledger Icon" className="h-8 w-auto object-contain shrink-0" src={logo} />
          {variant === 'tab' ? (
            <div className="flex flex-col min-w-0">
              <span className="font-label-sm text-label-sm text-on-surface-variant leading-none">Vocal Ledger</span>
              <h1 className="font-title-md text-title-md text-on-surface leading-tight truncate">{title}</h1>
            </div>
          ) : (
            <h1 className="font-title-lg text-title-lg text-on-surface font-semibold truncate">{title}</h1>
          )}
        </div>
        <div className="flex items-center gap-space-xs shrink-0">
          {variant === 'tab' && (
            <button
              type="button"
              aria-label={hasUnread ? 'Notifications (new)' : 'Notifications'}
              className="relative w-11 h-11 flex items-center justify-center text-on-surface-variant hover:text-on-surface rounded-full transition-colors active:bg-surface-container"
              onClick={onBell}
            >
              <Icon name="notifications" className="text-[22px]" />
              {hasUnread && <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-tertiary-container ring-2 ring-surface" />}
            </button>
          )}
          {!hideAvatar && (
            <button
              type="button"
              aria-label="Profile and settings"
              className="w-8 h-8 rounded-full bg-primary flex items-center justify-center active:scale-95 transition-transform"
              onClick={() => navigate('/profile')}
            >
              <Icon name="person" className="text-on-primary text-[18px]" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
