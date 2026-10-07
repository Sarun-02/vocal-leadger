import { registerPlugin, WebPlugin, type PermissionState, type PluginListenerHandle } from '@capacitor/core';

/**
 * Bridge to the native `VoiceInput` plugin
 * (android/app/src/main/java/com/vocalledger/app/VoiceInputPlugin.java),
 * a thin wrapper around android.speech.SpeechRecognizer.
 */
export type VoiceErrorCode =
  | 'no-match'
  | 'speech-timeout'
  | 'network'
  | 'audio'
  | 'permission'
  | 'busy'
  | 'unavailable'
  | 'language-unavailable'
  | 'server'
  | 'client'
  | 'unknown';

export interface VoicePermissionStatus {
  microphone: PermissionState;
}

export interface VoiceInputPlugin {
  isAvailable(): Promise<{ available: boolean }>;
  checkPermissions(): Promise<VoicePermissionStatus>;
  requestPermissions(): Promise<VoicePermissionStatus>;
  /** Resolves once the recogniser has started; results arrive via events. */
  start(options: { language: string; preferOffline: boolean }): Promise<void>;
  /** Stops listening and delivers a final result for what was heard so far. */
  stop(): Promise<void>;
  /** Aborts without a result. */
  cancel(): Promise<void>;
  /** Opens this app's system settings page (to re-enable a denied permission). */
  openAppSettings(): Promise<void>;

  addListener(event: 'partial', fn: (e: { text: string }) => void): Promise<PluginListenerHandle>;
  addListener(event: 'final', fn: (e: { text: string; alternatives: string[] }) => void): Promise<PluginListenerHandle>;
  addListener(event: 'error', fn: (e: { code: VoiceErrorCode; message: string }) => void): Promise<PluginListenerHandle>;
  addListener(event: 'level', fn: (e: { level: number }) => void): Promise<PluginListenerHandle>;
  addListener(event: 'state', fn: (e: { listening: boolean }) => void): Promise<PluginListenerHandle>;
  removeAllListeners(): Promise<void>;
}

// ───────── Browser implementation (development only, uses the Web Speech API) ─────────

interface WebSpeechResult {
  isFinal: boolean;
  0: { transcript: string };
}
interface WebSpeechEvent {
  resultIndex: number;
  results: ArrayLike<WebSpeechResult>;
}
interface WebSpeechRecognition {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((e: WebSpeechEvent) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

function webSpeechCtor(): (new () => WebSpeechRecognition) | null {
  const w = window as unknown as Record<string, unknown>;
  return (w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null) as (new () => WebSpeechRecognition) | null;
}

class VoiceInputWeb extends WebPlugin {
  private rec: WebSpeechRecognition | null = null;
  private finalText = '';
  private latest = '';
  private cancelled = false;

  async isAvailable() {
    return { available: webSpeechCtor() !== null };
  }

  async checkPermissions(): Promise<VoicePermissionStatus> {
    try {
      const status = await navigator.permissions.query({ name: 'microphone' as PermissionName });
      return { microphone: status.state as PermissionState };
    } catch {
      return { microphone: 'prompt' };
    }
  }

  async requestPermissions(): Promise<VoicePermissionStatus> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
      return { microphone: 'granted' };
    } catch {
      return { microphone: 'denied' };
    }
  }

  async start(options: { language: string }) {
    const Ctor = webSpeechCtor();
    if (!Ctor) throw this.unavailable('Speech recognition is not supported in this browser.');
    this.rec?.abort();
    const rec = new Ctor();
    rec.lang = options.language;
    rec.interimResults = true;
    rec.continuous = false;
    this.finalText = '';
    this.latest = '';
    this.cancelled = false;
    rec.onstart = () => this.notifyListeners('state', { listening: true });
    rec.onresult = (e) => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) this.finalText += r[0].transcript;
        else interim += r[0].transcript;
      }
      this.latest = (this.finalText + interim).trim();
      this.notifyListeners('partial', { text: this.latest });
      this.notifyListeners('level', { level: Math.random() * 0.6 + 0.3 });
    };
    rec.onerror = (e) => {
      const map: Record<string, VoiceErrorCode> = {
        'no-speech': 'speech-timeout',
        'audio-capture': 'audio',
        'not-allowed': 'permission',
        network: 'network',
        'language-not-supported': 'language-unavailable',
        aborted: 'client',
      };
      if (!this.cancelled) this.notifyListeners('error', { code: map[e.error] ?? 'unknown', message: e.error });
    };
    rec.onend = () => {
      this.notifyListeners('state', { listening: false });
      if (!this.cancelled && this.latest) this.notifyListeners('final', { text: this.latest, alternatives: [] });
      this.rec = null;
    };
    this.rec = rec;
    rec.start();
  }

  async stop() {
    this.rec?.stop();
  }

  async cancel() {
    this.cancelled = true;
    this.rec?.abort();
  }

  async openAppSettings() {
    /* not applicable in a browser */
  }
}

export const VoiceInput = registerPlugin<VoiceInputPlugin>('VoiceInput', {
  web: () => new VoiceInputWeb() as unknown as VoiceInputPlugin,
});
