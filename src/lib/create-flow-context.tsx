"use client";

import * as React from "react";

/**
 * Factory for a small client-side wizard store. Each multi-step flow (login,
 * cadastro, recuperar senha, cadastro de negócio) lives as separate Next.js
 * routes, so state has to survive navigation between pages — sessionStorage
 * backs the React context so a refresh or back/forward doesn't lose progress.
 */
export function createFlowContext<T extends object>(storageKey: string, initialValue: T) {
  type ContextValue = {
    data: T;
    update: (patch: Partial<T>) => void;
    reset: () => void;
  };

  const Context = React.createContext<ContextValue | null>(null);

  function Provider({ children }: { children: React.ReactNode }) {
    const [data, setData] = React.useState<T>(initialValue);
    const hydrated = React.useRef(false);

    React.useEffect(() => {
      if (hydrated.current) return;
      hydrated.current = true;
      try {
        const raw = sessionStorage.getItem(storageKey);
        if (raw) setData({ ...initialValue, ...JSON.parse(raw) });
      } catch {
        // ignore malformed/unavailable storage
      }
    }, []);

    const update = React.useCallback((patch: Partial<T>) => {
      setData((prev) => {
        const next = { ...prev, ...patch };
        try {
          sessionStorage.setItem(storageKey, JSON.stringify(next));
        } catch {
          // ignore storage failures (private mode, quota, etc.)
        }
        return next;
      });
    }, []);

    const reset = React.useCallback(() => {
      setData(initialValue);
      try {
        sessionStorage.removeItem(storageKey);
      } catch {
        // ignore
      }
    }, []);

    const value = React.useMemo(() => ({ data, update, reset }), [data, update, reset]);

    return <Context.Provider value={value}>{children}</Context.Provider>;
  }

  function useFlow() {
    const ctx = React.useContext(Context);
    if (!ctx) {
      throw new Error(`useFlow must be used within its matching Provider (${storageKey})`);
    }
    return ctx;
  }

  return { Provider, useFlow };
}
