import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { DraftTransaction } from '../models/types';

/** Hands parsed voice drafts from the Voice Listening screen to the Review screen. */
interface VoiceDraftState {
  transcript: string;
  drafts: DraftTransaction[];
  notice?: string;
}

interface VoiceDraftValue extends VoiceDraftState {
  setSession(state: VoiceDraftState): void;
  setDrafts(updater: (prev: DraftTransaction[]) => DraftTransaction[]): void;
  clear(): void;
}

const VoiceDraftContext = createContext<VoiceDraftValue | null>(null);

const EMPTY: VoiceDraftState = { transcript: '', drafts: [] };

export function VoiceDraftProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<VoiceDraftState>(EMPTY);
  const setSession = useCallback((s: VoiceDraftState) => setState(s), []);
  const setDrafts = useCallback((u: (prev: DraftTransaction[]) => DraftTransaction[]) => setState((s) => ({ ...s, drafts: u(s.drafts) })), []);
  const clear = useCallback(() => setState(EMPTY), []);
  const value = useMemo(() => ({ ...state, setSession, setDrafts, clear }), [state, setSession, setDrafts, clear]);
  return <VoiceDraftContext.Provider value={value}>{children}</VoiceDraftContext.Provider>;
}

export function useVoiceDrafts(): VoiceDraftValue {
  const ctx = useContext(VoiceDraftContext);
  if (!ctx) throw new Error('useVoiceDrafts must be used inside VoiceDraftProvider');
  return ctx;
}
