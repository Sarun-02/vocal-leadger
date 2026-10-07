import { App } from '@capacitor/app';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppHeader } from '../components/AppHeader';
import { Icon } from '../components/Icon';
import { Spinner } from '../components/States';
import { getCategory, iconForTransaction } from '../data/categories';
import { formatINR, rupeesToPaise } from '../lib/format';
import type { DraftTransaction } from '../models/types';
import { isOnline } from '../services/network';
import { parseOffline, parseSpeech } from '../services/parsing';
import { describeVoiceError, ensureMicrophoneAccess, openAppSettings, SpeechSession, type MicAccess } from '../services/voice/speechService';
import type { VoiceErrorCode } from '../services/voice/voicePlugin';
import { haptics } from '../services/haptics';
import { useAppData } from '../state/AppDataContext';
import { useBackHandler } from '../state/BackHandlerContext';
import { useToast } from '../state/ToastContext';
import { useVoiceDrafts } from '../state/VoiceDraftContext';

type Phase = 'starting' | 'listening' | 'idle' | 'permission' | 'typing' | 'processing';

const WAVE = [
  { h: 'h-3', delay: '0.1s', dur: '0.8s' },
  { h: 'h-5', delay: '0.25s', dur: '0.7s' },
  { h: 'h-7', delay: '0.05s', dur: '0.9s' },
  { h: 'h-4', delay: '0.3s', dur: '0.75s' },
  { h: 'h-8', delay: '0.15s', dur: '1s' },
  { h: 'h-5', delay: '0.4s', dur: '0.85s' },
  { h: 'h-2', delay: '0.2s', dur: '0.65s' },
];

function join(a: string, b: string): string {
  return [a.trim(), b.trim()].filter(Boolean).join(' ');
}

/** design-reference/voice_listening_vocal_ledger */
export function VoiceScreen() {
  const navigate = useNavigate();
  const toast = useToast();
  const { settings } = useAppData();
  const voice = useVoiceDrafts();

  const [phase, setPhase] = useState<Phase>(voice.transcript ? 'idle' : 'starting');
  const [access, setAccess] = useState<MicAccess | null>(null);
  const [committed, setCommitted] = useState(voice.transcript);
  const [partial, setPartial] = useState('');
  const [level, setLevel] = useState(0);
  const [error, setError] = useState<VoiceErrorCode | null>(null);
  const [typed, setTyped] = useState('');

  const session = useRef<SpeechSession | null>(null);
  const partialRef = useRef('');
  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  const fullText = join(committed, partial);
  const drafts = useMemo(() => parseOffline(fullText, { defaultPaymentMethod: settings.defaultPaymentMethod }), [fullText, settings.defaultPaymentMethod]);

  const getSession = useCallback(() => {
    if (!session.current) {
      session.current = new SpeechSession({
        onPartial: (text) => {
          partialRef.current = text;
          setPartial(text);
        },
        onFinal: (text) => {
          partialRef.current = '';
          setPartial('');
          setCommitted((c) => join(c, text));
          setPhase((p) => (p === 'listening' || p === 'starting' ? 'idle' : p));
          setLevel(0);
        },
        onError: (code) => {
          setLevel(0);
          // Keep whatever was heard before the error.
          const heard = partialRef.current;
          partialRef.current = '';
          setPartial('');
          if (heard) setCommitted((c) => join(c, heard));
          if (code === 'permission') {
            setAccess('denied');
            setPhase('permission');
            return;
          }
          setError(code);
          setPhase((p) => (p === 'typing' || p === 'processing' ? p : 'idle'));
          haptics.warning();
        },
        onLevel: (l) => setLevel((prev) => prev * 0.5 + Math.max(0, Math.min(1, l)) * 0.5),
        onListeningChange: (listening) => {
          if (listening) setPhase((p) => (p === 'starting' ? 'listening' : p));
        },
      });
    }
    return session.current;
  }, []);

  const startListening = useCallback(async () => {
    setError(null);
    setPhase('starting');
    const result = await ensureMicrophoneAccess();
    setAccess(result);
    if (result !== 'granted') {
      setPhase('permission');
      return;
    }
    haptics.tap();
    const online = await isOnline();
    await getSession().start(settings.voiceLanguage, !online);
    // Some recognisers never emit a "ready" state; treat start as listening.
    setPhase((p) => (p === 'starting' ? 'listening' : p));
  }, [getSession, settings.voiceLanguage]);

  const stopListening = useCallback(async () => {
    await session.current?.stop();
    setPhase((p) => (p === 'listening' || p === 'starting' ? 'idle' : p));
    setLevel(0);
  }, []);

  // Auto-start on open (unless returning from Review with a transcript).
  useEffect(() => {
    if (phaseRef.current === 'starting') void startListening();
    return () => {
      void session.current?.dispose();
      session.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Coming back from system settings after enabling the microphone.
  useEffect(() => {
    const sub = App.addListener('resume', async () => {
      if (phaseRef.current !== 'permission') return;
      const result = await ensureMicrophoneAccess();
      if (result === 'granted') void startListening();
    });
    return () => {
      void sub.then((h) => h.remove());
    };
  }, [startListening]);

  // Stop the mic when the app is backgrounded.
  useEffect(() => {
    const sub = App.addListener('pause', () => {
      if (phaseRef.current === 'listening' || phaseRef.current === 'starting') void stopListening();
    });
    return () => {
      void sub.then((h) => h.remove());
    };
  }, [stopListening]);

  const close = useCallback(() => {
    void session.current?.dispose();
    voice.clear();
    navigate(-1);
  }, [navigate, voice]);

  useBackHandler(phase === 'typing', () => setPhase('idle'));

  function toggleMic() {
    if (phase === 'listening' || phase === 'starting') void stopListening();
    else if (phase !== 'processing') void startListening();
  }

  function openTyping() {
    void stopListening();
    setTyped(fullText);
    setPhase('typing');
  }

  function finishTyping() {
    setCommitted(typed.trim());
    partialRef.current = '';
    setPartial('');
    setError(null);
    setPhase('idle');
  }

  async function review() {
    const text = phase === 'typing' ? typed.trim() : fullText;
    if (!text) return;
    setPhase('processing');
    await session.current?.dispose();
    session.current = null;
    try {
      const result = await parseSpeech(text, { defaultPaymentMethod: settings.defaultPaymentMethod });
      if (result.drafts.length === 0) {
        setCommitted(text);
        setPartial('');
        setPhase('idle');
        toast({ tone: 'error', message: 'No amount detected. Try “Spent 250 on lunch”.' });
        return;
      }
      voice.setSession({ transcript: text, drafts: result.drafts, notice: result.notice });
      navigate('/review', { state: { fromVoice: true } });
    } catch {
      setPhase('idle');
      toast({ tone: 'error', message: 'Could not analyse that. Please try again.' });
    }
  }

  const listening = phase === 'listening' || phase === 'starting';
  const reviewCount = phase === 'typing' ? parseOffline(typed, { defaultPaymentMethod: settings.defaultPaymentMethod }).length : drafts.length;
  const err = error ? describeVoiceError(error) : null;

  let statusTitle = 'Listening...';
  let statusHint = 'Speak naturally in multiple amounts or items';
  if (phase === 'processing') {
    statusTitle = 'Analysing…';
    statusHint = 'Detecting amounts, categories and dates';
  } else if (phase === 'permission') {
    statusTitle = 'Microphone off';
    statusHint = 'Voice entry needs microphone access';
  } else if (!listening) {
    if (err) {
      statusTitle = err.title;
      statusHint = err.hint;
    } else {
      statusTitle = fullText ? 'Paused' : 'Tap the mic to speak';
      statusHint = fullText ? 'Tap the mic to add more items' : 'Try “I spent 250 rupees on lunch”';
    }
  }

  return (
    <div className="bg-surface text-on-surface font-body-md text-body-md flex flex-col min-h-[100dvh]">
      <AppHeader variant="stack" title="Voice Listening" onBack={close} />
      <main className="flex-1 flex flex-col relative w-full pt-header pb-safe bg-surface">
        <div className="flex flex-col w-full max-w-2xl mx-auto px-margin pb-space-lg select-none">
          {/* Minimal Top Sub-Navigation (Voice Entry Context) */}
          <div className="flex items-center justify-between py-space-sm mb-space-xs">
            <div className="flex items-center gap-space-sm">
              <div className={`w-2.5 h-2.5 rounded-full ${listening ? 'bg-primary animate-ping' : 'bg-outline-variant'}`} />
              <span className={`font-title-sm text-title-sm tracking-wide uppercase font-semibold ${listening ? 'text-primary' : 'text-on-surface-variant'}`}>
                {listening ? 'Live Speech Recognition' : 'Speech Recognition Paused'}
              </span>
            </div>
            <button aria-label="Close" className="w-10 h-10 rounded-full bg-surface-container-high text-on-surface flex items-center justify-center hover:bg-surface-variant active:scale-95 transition-all" onClick={close} type="button">
              <Icon name="close" className="text-[20px]" />
            </button>
          </div>

          {/* Center Active Audio Stage */}
          <div className="relative flex flex-col items-center justify-center pt-space-md pb-space-lg overflow-hidden">
            <div className="relative flex items-center justify-center w-48 h-48 my-space-xs">
              {listening && <div className="absolute inset-0 rounded-full bg-primary/10 animate-ping" style={{ animationDuration: '2.4s' }} />}
              <div
                className={`absolute w-36 h-36 rounded-full bg-primary-fixed/40 ${listening ? 'animate-pulse' : ''} transition-transform duration-150`}
                style={{ animationDuration: '1.8s', transform: `scale(${listening ? 1 + level * 0.25 : 1})` }}
              />
              <div className="absolute w-28 h-28 rounded-full bg-surface-container-highest shadow-inner" />
              <button
                type="button"
                aria-label={listening ? 'Stop listening' : 'Start listening'}
                className={`relative z-10 w-20 h-20 rounded-full text-on-primary flex items-center justify-center shadow-[0_10px_25px_-4px_rgba(44,78,207,0.45)] active:scale-90 transition-all disabled:opacity-70 ${listening ? 'bg-primary-container' : 'bg-outline'}`}
                id="mic-toggle-btn"
                onClick={toggleMic}
                disabled={phase === 'processing'}
              >
                {phase === 'processing' ? <Spinner className="w-8 h-8 border-white/30 border-t-white" /> : <Icon name={phase === 'permission' ? 'mic_off' : 'mic'} className="text-[36px]" fill />}
              </button>
            </div>

            {/* Dynamic Audio Waveform Bars */}
            <div aria-hidden="true" className={`flex items-center gap-1.5 h-8 my-space-sm transition-opacity ${listening ? 'opacity-100' : 'opacity-30'}`}>
              {WAVE.map((b, i) => (
                <div
                  key={i}
                  className={`w-1 bg-primary rounded-full ${b.h} ${listening ? 'animate-bounce' : ''}`}
                  style={{ animationDelay: b.delay, animationDuration: b.dur, transform: listening ? `scaleY(${0.7 + level * 0.6})` : 'scaleY(0.5)' }}
                />
              ))}
            </div>

            <p className={`font-title-md text-title-md font-medium tracking-tight text-center ${err && !listening ? 'text-tertiary' : 'text-primary'}`}>{statusTitle}</p>
            <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5 text-center max-w-xs">{statusHint}</p>
          </div>

          {phase === 'permission' ? (
            <PermissionCard access={access} onRetry={startListening} onType={openTyping} />
          ) : phase === 'typing' ? (
            <div className="bg-surface-container-lowest rounded-2xl p-space-md shadow-[0px_4px_12px_rgba(15,23,42,0.04)] mb-space-md">
              <label htmlFor="typed" className="flex items-center gap-space-xs mb-space-xs text-on-surface-variant">
                <Icon name="keyboard" className="text-[16px]" />
                <span className="font-label-sm text-label-sm font-semibold tracking-wider uppercase">Type your entry</span>
              </label>
              <textarea
                id="typed"
                autoFocus
                rows={3}
                maxLength={500}
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                placeholder="e.g. Spent 250 on lunch and 500 on petrol"
                className="w-full bg-surface-container-low rounded-xl p-3 font-body-lg text-body-lg text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              />
              <div className="flex justify-end mt-space-sm">
                <button type="button" className="h-10 px-space-md rounded-full bg-surface-container-high text-primary font-label-lg text-label-lg" onClick={finishTyping}>
                  Done
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-surface-container-lowest rounded-2xl p-space-md shadow-[0px_4px_12px_rgba(15,23,42,0.04)] mb-space-md">
              <div className="flex items-center justify-between mb-space-xs text-on-surface-variant">
                <div className="flex items-center gap-space-xs">
                  <Icon name="record_voice_over" className="text-[16px]" />
                  <span className="font-label-sm text-label-sm font-semibold tracking-wider uppercase">Transcript</span>
                </div>
                <button type="button" aria-label="Edit transcript" className="w-8 h-8 -mr-1 rounded-full flex items-center justify-center text-outline hover:text-primary active:bg-surface-container" onClick={openTyping}>
                  <Icon name="edit" className="text-[18px]" />
                </button>
              </div>
              {fullText ? (
                <blockquote className="font-headline-sm text-headline-sm text-on-surface leading-snug font-normal italic break-words">
                  “{committed}
                  {partial && <span className="text-on-surface-variant">{committed ? ' ' : ''}{partial}</span>}”
                </blockquote>
              ) : (
                <p className="font-headline-sm text-headline-sm text-outline-variant leading-snug font-normal italic">{listening ? '…' : '“I spent 250 rupees on lunch”'}</p>
              )}
            </div>
          )}

          {/* NLP Detection Section */}
          {phase !== 'permission' && phase !== 'typing' && fullText && (
            <div className="flex flex-col gap-space-sm mb-space-lg">
              <div className="flex items-center justify-between px-space-xs">
                {drafts.length > 0 ? (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary-container text-on-secondary-container font-label-md text-label-md">
                    <Icon name="auto_awesome" className="text-[16px]" fill />
                    <span>
                      {drafts.length} {drafts.length === 1 ? 'transaction' : 'transactions'} detected
                    </span>
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-error-container text-on-error-container font-label-md text-label-md">
                    <Icon name="help" className="text-[16px]" fill />
                    <span>No amount detected yet</span>
                  </div>
                )}
                <span className="font-label-sm text-label-sm text-on-surface-variant">Parsed in real-time</span>
              </div>
              <div className="flex flex-col gap-space-xs">
                {drafts.map((d) => (
                  <DetectedItem key={`${d.description}-${d.amount}-${d.type}`} draft={d} />
                ))}
              </div>
            </div>
          )}

          {/* Bottom Ergonomic Actions Zone */}
          <div className="flex flex-col gap-space-sm pt-space-xs">
            <button
              type="button"
              className="w-full h-14 rounded-full bg-primary text-on-primary font-label-lg text-label-lg font-semibold flex items-center justify-center gap-space-xs shadow-[0_4px_12px_rgba(44,78,207,0.3)] hover:bg-primary-container active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none"
              disabled={reviewCount === 0 || phase === 'processing'}
              onClick={review}
            >
              <span>Review Transactions ({reviewCount})</span>
              <Icon name="arrow_forward" className="text-[20px]" />
            </button>
            <div className="flex items-center justify-center gap-space-md py-1">
              <button type="button" className="font-label-md text-label-md text-primary font-semibold py-2 px-space-md rounded-full hover:bg-surface-container transition-colors" id="stop-btn" onClick={phase === 'typing' ? () => void startListening() : toggleMic} disabled={phase === 'processing'}>
                {listening ? 'Tap to stop' : phase === 'typing' || phase === 'permission' ? 'Use voice' : 'Tap to resume'}
              </button>
              <span className="w-1 h-1 rounded-full bg-outline-variant" />
              {phase !== 'typing' && (
                <>
                  <button type="button" className="font-label-md text-label-md text-on-surface-variant hover:text-on-surface py-2 px-space-md rounded-full hover:bg-surface-container transition-colors" onClick={openTyping}>
                    Type instead
                  </button>
                  <span className="w-1 h-1 rounded-full bg-outline-variant" />
                </>
              )}
              <button type="button" className="font-label-md text-label-md text-on-surface-variant hover:text-on-surface py-2 px-space-md rounded-full hover:bg-surface-container transition-colors" onClick={close}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function DetectedItem({ draft }: { draft: DraftTransaction }) {
  const income = draft.type === 'income';
  return (
    <div className="flex items-center justify-between bg-surface-container-lowest p-space-sm rounded-xl shadow-[0_1px_3px_rgba(15,23,42,0.03)]">
      <div className="flex items-center gap-space-sm min-w-0">
        <div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center text-primary shrink-0">
          <Icon name={iconForTransaction(draft.description, draft.categoryId)} className="text-[20px]" fill />
        </div>
        <div className="flex flex-col min-w-0">
          <span className="font-title-sm text-title-sm text-on-surface font-semibold truncate">{draft.description}</span>
          <span className="font-body-sm text-body-sm text-on-surface-variant">{getCategory(draft.categoryId).longLabel}</span>
        </div>
      </div>
      <div className="text-right shrink-0 pl-space-xs">
        {draft.amount === null ? (
          <span className="font-title-sm text-title-sm text-outline">Needs amount</span>
        ) : (
          <span className={`font-title-md text-title-md tabular-nums font-semibold ${income ? 'text-secondary' : 'text-tertiary'}`}>
            {income ? '+' : '-'} {formatINR(rupeesToPaise(draft.amount))}
          </span>
        )}
      </div>
    </div>
  );
}

function PermissionCard({ access, onRetry, onType }: { access: MicAccess | null; onRetry: () => void; onType: () => void }) {
  const blocked = access === 'blocked';
  const unavailable = access === 'unavailable';
  return (
    <div className="bg-surface-container-lowest rounded-2xl p-space-lg shadow-[0px_4px_12px_rgba(15,23,42,0.04)] mb-space-md flex flex-col items-center text-center">
      <div className="w-12 h-12 rounded-full bg-error-container text-on-error-container flex items-center justify-center mb-space-sm">
        <Icon name={unavailable ? 'voice_over_off' : 'mic_off'} className="text-[24px]" />
      </div>
      <span className="font-title-md text-title-md text-on-surface">
        {unavailable ? 'Voice input unavailable' : blocked ? 'Microphone access is turned off' : 'Allow microphone access'}
      </span>
      <p className="font-body-sm text-body-sm text-on-surface-variant mt-1 max-w-xs">
        {unavailable
          ? 'This device has no speech recognition service. You can still type entries — they are parsed the same way.'
          : blocked
            ? 'Open Settings → Permissions → Microphone and choose “Allow”. Audio is only used to turn your words into text.'
            : 'Vocal Ledger listens only while the mic button is active, to turn your words into transactions.'}
      </p>
      <div className="flex w-full gap-space-sm mt-space-md">
        <button type="button" className="flex-1 h-11 rounded-full bg-surface-container text-on-surface font-label-lg text-label-lg" onClick={onType}>
          Type instead
        </button>
        {!unavailable && (
          <button type="button" className="flex-1 h-11 rounded-full bg-primary text-on-primary font-label-lg text-label-lg" onClick={blocked ? () => void openAppSettings() : onRetry}>
            {blocked ? 'Open Settings' : 'Allow microphone'}
          </button>
        )}
      </div>
    </div>
  );
}
