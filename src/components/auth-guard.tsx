"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { getToken, getUsuario, updateUsuarioLocal } from "@/lib/api-client";
import { fetchMe } from "@/lib/api/auth";

/**
 * Gates its children behind a valid local session, redirecting to /login otherwise,
 * and to /primeiro-acesso while the user still has to set a new password.
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [checked, setChecked] = React.useState(false);

  React.useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    if (getUsuario()?.primeiro_acesso) {
      router.replace("/primeiro-acesso");
      return;
    }
    // Syncing React state from localStorage (an external system) — safe.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setChecked(true);

    // Atualiza o usuário guardado com o estado real da API (nível de acesso alterado
    // pelo admin, primeiro acesso marcado, sessões antigas sem usuario_id). Offline,
    // falha em silêncio e segue com o que está salvo.
    let cancelled = false;
    fetchMe()
      .then((usuario) => {
        if (cancelled) return;
        updateUsuarioLocal(usuario);
        if (usuario.primeiro_acesso) router.replace("/primeiro-acesso");
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (!checked) return null;

  return <>{children}</>;
}
