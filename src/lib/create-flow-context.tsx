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
    const [hydrated, setHydrated] = React.useState(false);

    React.useEffect(() => {
      if (hydrated) return;
      try {
        const raw = sessionStorage.getItem(storageKey);
        if (raw) setData({ ...initialValue, ...JSON.parse(raw) });
      } catch {
        // ignore malformed/unavailable storage
      }
      setHydrated(true);
    }, [hydrated]);

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

    // Children only mount once the stored state is restored. React runs child effects
    // before parent ones, so otherwise a step's guard (e.g. "no fazenda chosen → back to
    // step 1") would run against the empty initial state after a full page load — which
    // is what every step navigation becomes offline (the RSC fetch fails and Next falls
    // back to a hard navigation served by the service worker), and also on a refresh.
    if (!hydrated) return null;

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
