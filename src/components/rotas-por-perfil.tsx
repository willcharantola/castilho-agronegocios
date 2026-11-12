"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { useUsuario } from "@/lib/permissoes";

/**
 * Telas que o usuário Normal não abre: em Negócios ele vê a lista dos negócios liberados
 * para ele, a pesagem de cada um e o cadastro de negócio; de pecuaristas, fazendas e
 * frigoríficos, só as telas de cadastro. Acesso direto pela URL volta para a Home.
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

/**
 * Rotas de /negocios abertas ao Normal: a lista e o negócio (que para ele é a pesagem), e o
 * fluxo de cadastro de negócio (/negocios/novo/...).
 */
const NEGOCIOS_DO_NORMAL = /^\/negocios(\/\d+|\/novo(\/.*)?)?\/?$/;

/**
 * Pecuaristas, fazendas e frigoríficos: o Normal abre as listas, as fichas (só leitura) e as
 * telas de cadastro (pecuarista com fazendas, fazenda nova de um pecuarista e frigorífico).
 */
const CADASTROS_DO_NORMAL =
  /^\/(fazendas|pecuaristas|compradores)(\/\d+|\/novo|\/novo\/fazendas|\/\d+\/fazendas\/nova)?\/?$/;

export function rotaSomenteAdmin(pathname: string) {
  if (NEGOCIOS_DO_NORMAL.test(pathname) || CADASTROS_DO_NORMAL.test(pathname)) return false;
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
