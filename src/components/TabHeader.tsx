import { useMemo, useState } from 'react';
import { monthKey } from '../lib/dates';
import { buildNotifications } from '../lib/notifications';
import { useNow } from '../lib/useNow';
import { useAppData } from '../state/AppDataContext';
import { AppHeader } from './AppHeader';
import { NotificationsSheet } from './NotificationsSheet';

/** Header for the three bottom-nav screens: brand, notifications bell (with real alerts), avatar. */
export function TabHeader({ title }: { title: string }) {
  const { transactions, getBudget, settings, notificationsSeenAt, markNotificationsSeen } = useAppData();
  const now = useNow();
  const month = monthKey(now);
  const [open, setOpen] = useState(false);

  const items = useMemo(
    () => buildNotifications(transactions, month, getBudget(month), settings.budgetAlerts, now),
    [transactions, month, getBudget, settings.budgetAlerts, now],
  );
  const hasUnread = items.some((n) => n.ts > notificationsSeenAt);

  return (
    <>
      <AppHeader
        variant="tab"
        title={title}
        hasUnread={hasUnread}
        onBell={() => {
          setOpen(true);
        }}
      />
      <NotificationsSheet
        open={open}
        items={items}
        seenAt={notificationsSeenAt}
        onClose={() => {
          setOpen(false);
          void markNotificationsSeen();
        }}
      />
    </>
  );
}
