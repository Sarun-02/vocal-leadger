import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

let enabled = true;

export function setHapticsEnabled(value: boolean): void {
  enabled = value;
}

function run(fn: () => Promise<void>): void {
  if (!enabled || !Capacitor.isNativePlatform()) return;
  fn().catch(() => undefined);
}

export const haptics = {
  tap: () => run(() => Haptics.impact({ style: ImpactStyle.Light })),
  success: () => run(() => Haptics.notification({ type: NotificationType.Success })),
  warning: () => run(() => Haptics.notification({ type: NotificationType.Warning })),
};
