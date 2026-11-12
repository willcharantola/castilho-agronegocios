"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { useUsuario } from "@/lib/permissoes";

/**
 * Telas que o usuário Normal não abre: ele só enxerga "Minhas pesagens" (/pesagens) e as
 * configurações de consulta. Acesso direto pela URL volta para a Home.
 */
const SOMENTE_ADMIN = [
  "/dashboard",
  "/negocios",
  "/pecuaristas",
  "/compradores",
  "/fazendas",
  "/configuracoes/usuarios",
  "/configuracoes/tipos-de-gado",
];

export function rotaSomenteAdmin(pathname: string) {
  return SOMENTE_ADMIN.some((rota) => pathname === rota || pathname.startsWith(`${rota}/`));
}

/**
 * Esconder aqui é só usabilidade: a API recusa (403/404) tudo o que o Normal não pode ver.
 * Enquanto o perfil não foi lido (primeira renderização), a tela restrita não aparece.
 */
export function RotasPorPerfil({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const usuario = useUsuario();
  const restrita = rotaSomenteAdmin(pathname);
  const bloquear = restrita && usuario?.nivel_acesso !== "Admin";

  React.useEffect(() => {
    if (restrita && usuario && usuario.nivel_acesso !== "Admin") router.replace("/");
  }, [restrita, usuario, router]);

  return bloquear ? null : <>{children}</>;
}
