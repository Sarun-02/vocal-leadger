import { createContext, useContext, useEffect, useRef, type ReactNode } from 'react';

/**
 * Stack of "back" interceptors. Overlays (sheets, dialogs) register a handler while open so
 * the Android back button closes them before the router navigates.
 */
type Handler = () => boolean | void;

interface BackStack {
  push(h: { current: Handler }): () => void;
  /** Runs the top-most handler. Returns true if it consumed the back press. */
  handle(): boolean;
}

const BackHandlerContext = createContext<BackStack | null>(null);

export function BackHandlerProvider({ children }: { children: ReactNode }) {
  const stack = useRef<Array<{ current: Handler }>>([]);
  const api = useRef<BackStack>({
    push(h) {
      stack.current.push(h);
      return () => {
        stack.current = stack.current.filter((x) => x !== h);
      };
    },
    handle() {
      const top = stack.current[stack.current.length - 1];
      if (!top) return false;
      return top.current() !== false;
    },
  });
  return <BackHandlerContext.Provider value={api.current}>{children}</BackHandlerContext.Provider>;
}

export function useBackStack(): BackStack {
  const ctx = useContext(BackHandlerContext);
  if (!ctx) throw new Error('useBackStack must be used inside BackHandlerProvider');
  return ctx;
}

/** While `active`, the Android back button calls `handler` instead of navigating. */
export function useBackHandler(active: boolean, handler: Handler): void {
  const stack = useBackStack();
  const ref = useRef(handler);
  ref.current = handler;
  useEffect(() => {
    if (!active) return;
    return stack.push(ref);
  }, [active, stack]);
}
