import { useNavigate } from 'react-router-dom';
import { formatDateShort, formatTime, isSameDay } from '../lib/dates';
import type { AppNotification } from '../lib/notifications';
import { BottomSheet } from './BottomSheet';
import { Icon } from './Icon';
import { EmptyState } from './States';

const TONE: Record<AppNotification['tone'], string> = {
  danger: 'bg-error-container text-on-error-container',
  warning: 'bg-tertiary-fixed text-on-tertiary-fixed-variant',
  info: 'bg-surface-container-high text-primary',
  success: 'bg-secondary-container text-on-secondary-container',
};

export function NotificationsSheet({ open, onClose, items, seenAt }: { open: boolean; onClose: () => void; items: AppNotification[]; seenAt: number }) {
  const navigate = useNavigate();
  return (
    <BottomSheet open={open} onClose={onClose} label="Notifications">
      <div className="flex items-center justify-between mb-space-sm">
        <div className="flex items-center gap-1.5">
          <Icon name="notifications" className="text-[20px] text-on-surface-variant" />
          <h4 className="font-title-lg text-title-lg text-on-surface font-semibold">Notifications</h4>
        </div>
        <button type="button" aria-label="Close" className="w-10 h-10 rounded-full bg-surface-container-high text-on-surface flex items-center justify-center active:scale-95" onClick={onClose}>
          <Icon name="close" className="text-[20px]" />
        </button>
      </div>
      {items.length === 0 ? (
        <EmptyState compact icon="notifications_off" title="You're all caught up" message="Budget alerts and daily summaries will appear here." />
      ) : (
        <div className="flex flex-col divide-y divide-surface-container-low">
          {items.map((n) => (
            <button
              key={n.id}
              type="button"
              className="w-full text-left flex items-start gap-3 py-3 px-1 rounded-xl active:bg-surface-container-low"
              onClick={() => {
                onClose();
                if (n.to) navigate(n.to);
              }}
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${TONE[n.tone]}`}>
                <Icon name={n.icon} className="text-[20px]" />
              </div>
              <div className="flex flex-col min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-title-sm text-title-sm text-on-surface">{n.title}</span>
                  {n.ts > seenAt && <span className="w-2 h-2 rounded-full bg-primary-container shrink-0" aria-label="New" />}
                </div>
                <span className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">{n.body}</span>
                <span className="font-label-sm text-label-sm text-outline mt-1">{isSameDay(n.ts, Date.now()) ? formatTime(n.ts) : formatDateShort(n.ts)}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </BottomSheet>
  );
}
