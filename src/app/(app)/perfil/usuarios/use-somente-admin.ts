"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { getUsuario } from "@/lib/api-client";

/**
 * Telas de gestão de usuários: quem não é Admin volta para /perfil. É só usabilidade —
 * a API responde 403 a estas rotas para usuários Normal.
 */
export function useSomenteAdmin(): boolean {
  const router = useRouter();
  const admin = getUsuario()?.nivel_acesso === "Admin";
  React.useEffect(() => {
    if (!admin) router.replace("/perfil");
  }, [admin, router]);
  return admin;
}
