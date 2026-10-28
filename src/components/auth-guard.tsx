"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { getToken, updateUsuarioLocal } from "@/lib/api-client";
import { fetchMe } from "@/lib/api/auth";

/**
 * Gates its children behind a valid local session, redirecting to /login otherwise.
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [checked, setChecked] = React.useState(false);

  React.useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    // Syncing React state from localStorage (an external system) — safe.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setChecked(true);

    // Atualiza o usuário guardado com o estado real da API (nível de acesso alterado
    // pelo admin, sessões antigas sem usuario_id). Offline,
    // falha em silêncio e segue com o que está salvo.
    let cancelled = false;
    fetchMe()
      .then((usuario) => {
        if (cancelled) return;
        updateUsuarioLocal(usuario);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (!checked) return null;

  return <>{children}</>;
}
