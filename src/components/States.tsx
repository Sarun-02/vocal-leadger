import type { ReactNode } from 'react';
import { Icon } from './Icon';

export function Spinner({ className = 'w-6 h-6' }: { className?: string }) {
  return <span role="progressbar" aria-label="Loading" className={`inline-block rounded-full border-[3px] border-surface-container-high border-t-primary-container animate-spin ${className}`} />;
}

export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-space-sm py-space-xl text-on-surface-variant">
      <Spinner />
      <span className="font-body-sm text-body-sm">{label}</span>
    </div>
  );
}

interface EmptyStateProps {
  icon: string;
  title: string;
  message?: string;
  action?: ReactNode;
  compact?: boolean;
}

export function EmptyState({ icon, title, message, action, compact }: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center text-center ${compact ? 'py-space-lg px-space-md' : 'py-space-xl px-space-lg'}`}>
      <div className="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant mb-space-sm">
        <Icon name={icon} className="text-[24px]" />
      </div>
      <span className="font-title-sm text-title-sm text-on-surface">{title}</span>
      {message && <p className="font-body-sm text-body-sm text-on-surface-variant mt-1 max-w-xs">{message}</p>}
      {action && <div className="mt-space-md">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center text-center py-space-xl px-space-lg">
      <div className="w-12 h-12 rounded-full bg-error-container flex items-center justify-center text-on-error-container mb-space-sm">
        <Icon name="error" className="text-[24px]" />
      </div>
      <span className="font-title-sm text-title-sm text-on-surface">Something went wrong</span>
      <p className="font-body-sm text-body-sm text-on-surface-variant mt-1 max-w-xs">{message}</p>
      {onRetry && (
        <button type="button" className="mt-space-md h-11 px-space-lg rounded-full bg-primary text-on-primary font-label-lg text-label-lg" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}

/** Inline field error text. */
export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <span role="alert" className="font-label-sm text-label-sm text-error flex items-center gap-1 mt-0.5">
      <Icon name="error" className="text-[14px]" />
      {message}
    </span>
  );
}
