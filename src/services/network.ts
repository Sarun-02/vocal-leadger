import { Network } from '@capacitor/network';

export async function isOnline(): Promise<boolean> {
  try {
    return (await Network.getStatus()).connected;
  } catch {
    return typeof navigator !== 'undefined' ? navigator.onLine : false;
  }
}
