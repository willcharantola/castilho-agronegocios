"use client";

import * as React from "react";
import { Eye, EyeOff } from "lucide-react";
import { USUARIO_KEY } from "@/lib/api-client";
import type { Usuario } from "@/lib/api/types";
import { cn } from "@/lib/utils";

/*
 * Perfil do usuário logado e regras de exibição por perfil. Esconder aqui é só
 * usabilidade: a API já não envia os dados restritos ao usuário Normal (vêm `null`) e
 * recusa (403) as ações restritas.
 */

/** Traço exibido no lugar de um dado sem permissão (ou que veio `null` da API). */
export const SEM_PERMISSAO = "-";
/** Máscara da comissão escondida pelo botão do olho (o dado existe e pode ser revelado). */
export const COMISSAO_MASCARADA = "••••";

function assinar(aoMudar: () => void) {
  // Outra aba fazendo login/logout.
  window.addEventListener("storage", aoMudar);
  return () => window.removeEventListener("storage", aoMudar);
}

function lerSessao() {
  try {
    return localStorage.getItem(USUARIO_KEY);
  } catch {
    return null;
  }
}

/**
 * Usuário da sessão guardada no aparelho (sem chamada de rede; funciona offline). No
 * servidor e na primeira renderização do cliente é `null`, para não dar erro de
 * hidratação — a tela renderiza como "sem permissão" e se ajusta em seguida.
 */
export function useUsuario(): Usuario | null {
  const bruto = React.useSyncExternalStore(assinar, lerSessao, () => null);
  return React.useMemo(() => {
    if (!bruto) return null;
    try {
      return JSON.parse(bruto) as Usuario;
    } catch {
      return null;
    }
  }, [bruto]);
}

export function useIsAdmin(): boolean {
  return useUsuario()?.nivel_acesso === "Admin";
}

/** Valor formatado, ou "-" sem permissão ou quando a API mandou `null`. */
export function valorRestrito<T>(
  valor: T | null | undefined,
  podeVer: boolean,
  formatar: (v: T) => string = String
): string {
  return podeVer && valor !== null && valor !== undefined ? formatar(valor) : SEM_PERMISSAO;
}

/** Renderiza o conteúdo só para Admin; para os demais, o `fallback` (padrão "-"). */
export function SomenteAdmin({
  children,
  fallback = SEM_PERMISSAO,
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  return useIsAdmin() ? <>{children}</> : <>{fallback}</>;
}

/**
 * Como a comissão aparece na tela:
 * - "restrita": usuário Normal → "-";
 * - "mascarada": Admin com o olho fechado → "••••" (o valor real não vai para o DOM);
 * - "visivel": Admin com o olho aberto → o valor.
 */
export type ExibicaoComissao = "restrita" | "mascarada" | "visivel";

export function exibirComissao<T>(
  valor: T | null | undefined,
  exibicao: ExibicaoComissao,
  formatar: (v: T) => string
): string {
  if (exibicao === "restrita") return SEM_PERMISSAO;
  if (exibicao === "mascarada") return COMISSAO_MASCARADA;
  return valor !== null && valor !== undefined ? formatar(valor) : "—";
}

/**
 * Estado do botão do olho: começa sempre escondido e não é lembrado (abrir ou recarregar
 * a página esconde de novo). Para quem não é Admin a comissão é sempre "restrita".
 */
export function useExibicaoComissao() {
  const admin = useIsAdmin();
  const [visivel, setVisivel] = React.useState(false);
  const exibicao: ExibicaoComissao = !admin ? "restrita" : visivel ? "visivel" : "mascarada";
  return { admin, exibicao, visivel, alternar: () => setVisivel((v) => !v) };
}

/** Botão do olho (só Admin): olho cortado = comissão escondida; olho aberto = visível. */
export function BotaoOlhoComissao({
  visivel,
  onAlternar,
  className,
  assunto = "comissão",
}: {
  visivel: boolean;
  onAlternar: () => void;
  className?: string;
  /** O que o olho cobre, para o rótulo lido pelo leitor de tela ("Mostrar <assunto>"). */
  assunto?: string;
}) {
  const rotulo = `${visivel ? "Esconder" : "Mostrar"} ${assunto}`;
  const Icone = visivel ? Eye : EyeOff;
  return (
    <button
      type="button"
      className={cn("botao-olho", className)}
      aria-pressed={visivel}
      aria-label={rotulo}
      title={rotulo}
      onClick={onAlternar}
    >
      <Icone size={20} aria-hidden />
    </button>
  );
}
