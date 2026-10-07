import type { PluginListenerHandle } from '@capacitor/core';
import { VoiceInput, type VoiceErrorCode } from './voicePlugin';

export type MicAccess =
  | 'granted'
  /** User declined this time; we may ask again. */
  | 'denied'
  /** User chose "Don't allow" permanently; only system settings can fix it. */
  | 'blocked'
  /** No speech recognition service on this device. */
  | 'unavailable';

/**
 * Microphone permission flow:
 *   1. check current state
 *   2. request if not yet granted (system dialog)
 *   3. report denied / permanently blocked so the UI can explain and recover
 */
export async function ensureMicrophoneAccess(): Promise<MicAccess> {
  try {
    const { available } = await VoiceInput.isAvailable();
    if (!available) return 'unavailable';

    const current = (await VoiceInput.checkPermissions()).microphone;
    if (current === 'granted') return 'granted';
    // Android reports "denied" before asking only when the user permanently blocked it.
    if (current === 'denied') return 'blocked';

    const after = (await VoiceInput.requestPermissions()).microphone;
    if (after === 'granted') return 'granted';
    return after === 'denied' ? 'blocked' : 'denied';
  } catch {
    return 'unavailable';
  }
}

export function openAppSettings(): Promise<void> {
  return VoiceInput.openAppSettings().catch(() => undefined);
}

export interface ListenCallbacks {
  onPartial(text: string): void;
  onFinal(text: string): void;
  onError(code: VoiceErrorCode, message: string): void;
  onLevel(level: number): void;
  onListeningChange(listening: boolean): void;
}

/** One listening session. Call `dispose()` when the screen unmounts. */
export class SpeechSession {
  private handles: PluginListenerHandle[] = [];
  private disposed = false;

  constructor(private readonly cb: ListenCallbacks) {}

  async start(language: string, preferOffline: boolean): Promise<void> {
    await this.detach();
    if (this.disposed) return;
    this.handles = await Promise.all([
      VoiceInput.addListener('partial', (e) => this.cb.onPartial(e.text)),
      VoiceInput.addListener('final', (e) => this.cb.onFinal(e.text)),
      VoiceInput.addListener('error', (e) => this.cb.onError(e.code, e.message)),
      VoiceInput.addListener('level', (e) => this.cb.onLevel(e.level)),
      VoiceInput.addListener('state', (e) => this.cb.onListeningChange(e.listening)),
    ]);
    try {
      await VoiceInput.start({ language, preferOffline });
    } catch (e) {
      this.cb.onError('client', e instanceof Error ? e.message : String(e));
    }
  }

  async stop(): Promise<void> {
    await VoiceInput.stop().catch(() => undefined);
  }

  async dispose(): Promise<void> {
    this.disposed = true;
    await VoiceInput.cancel().catch(() => undefined);
    await this.detach();
  }

  private async detach(): Promise<void> {
    const hs = this.handles;
    this.handles = [];
    await Promise.all(hs.map((h) => h.remove().catch(() => undefined)));
  }
}

/** User-facing copy for recogniser errors. */
export function describeVoiceError(code: VoiceErrorCode): { title: string; hint: string } {
  switch (code) {
    case 'no-match':
      return { title: "Didn't catch that", hint: 'Try again, e.g. “Spent 250 on lunch”, or type it instead.' };
    case 'speech-timeout':
      return { title: 'No speech heard', hint: 'Tap the mic and start speaking right away.' };
    case 'network':
      return { title: 'Speech service needs a connection', hint: 'Connect to the internet, install an offline speech pack in Android settings, or type instead.' };
    case 'language-unavailable':
      return { title: 'Language not available', hint: 'Pick another voice language in Settings, or type instead.' };
    case 'audio':
      return { title: 'Microphone problem', hint: 'Another app may be using the microphone. Close it and try again.' };
    case 'permission':
      return { title: 'Microphone permission needed', hint: 'Allow microphone access to log by voice.' };
    case 'busy':
      return { title: 'Speech service is busy', hint: 'Wait a moment and tap the mic again.' };
    case 'unavailable':
      return { title: 'Voice input not available', hint: 'This device has no speech recognition service. You can type instead.' };
    default:
      return { title: 'Voice input stopped', hint: 'Tap the mic to try again, or type instead.' };
  }
}
