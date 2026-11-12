"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2, ChevronRight, Percent, Tags, UserRound, Users, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { clearSession } from "@/lib/api-client";
import { contarPendentesNaFila, limparCacheDeLeitura } from "@/lib/offline/cache";
import { useUsuario } from "@/lib/permissoes";
import { cn } from "@/lib/utils";
import { NIVEL_LABELS } from "./usuarios/usuario-form";
import styles from "./page.module.css";

type ItemConfiguracao = { href: string; icon: LucideIcon; titulo: string; descricao: string; somenteAdmin?: boolean };

/** Uma linha por opção: novas configurações entram aqui. */
const ITENS: ItemConfiguracao[] = [
  {
    href: "/configuracoes/dados-da-empresa",
    icon: Building2,
    titulo: "Dados da empresa",
    // Normal abre só para consulta; só Admin altera.
    descricao: "Nome, CNPJ, CRECI e dados bancários",
  },
  {
    href: "/configuracoes/impostos-e-taxas",
    icon: Percent,
    titulo: "Impostos e taxas",
    descricao: "Alíquotas de Funrural e Senar dos negócios",
  },
  {
    href: "/configuracoes/tipos-de-gado",
    icon: Tags,
    titulo: "Tipos de gado",
    descricao: "Nomes sugeridos ao cadastrar lotes",
    // Só serve ao cadastro de lotes, que é do Admin (a API recusa a lista para Normal).
    somenteAdmin: true,
  },
  {
    href: "/configuracoes/usuarios",
    icon: Users,
    titulo: "Usuários",
    descricao: "Cadastro e acesso dos usuários do sistema",
    // Para Normal o item aparece desativado; a API recusa (403) as rotas de usuários.
    somenteAdmin: true,
  },
];

export default function ConfiguracoesPage() {
  const router = useRouter();
  const usuario = useUsuario();
  const admin = usuario?.nivel_acesso === "Admin";

  async function handleLogout() {
    const naFila = await contarPendentesNaFila();
    if (
      naFila > 0 &&
      !window.confirm(
        `Há ${naFila} cadastro(s) salvo(s) neste aparelho ainda não enviado(s). Eles continuam aqui se ` +
          "você entrar de novo com esta conta, mas serão apagados se outro usuário entrar. Sair mesmo assim?",
      )
    ) {
      return;
    }
    clearSession();
    // Os dados guardados para uso offline são do usuário que saiu (ex.: comissão de um Admin).
    await limparCacheDeLeitura();
    router.push("/login");
  }

  return (
    <div className="page-container page-narrow pt-safe">
      <h1 className="page-title">Configurações</h1>

      {/* Usuário logado (dados da sessão guardada no aparelho). */}
      {usuario ? (
        <section className="list-card glass-panel" aria-label="Usuário atual">
          <span className="card-icon">
            <UserRound size={18} />
          </span>
          <span className={styles.cardInfo}>
            <span className="card-name">
              {usuario.nome} {usuario.sobrenome}
            </span>
            <span className={styles.cardMeta}>{usuario.email}</span>
            <span className={styles.cardMeta}>{NIVEL_LABELS[usuario.nivel_acesso]}</span>
          </span>
        </section>
      ) : null}

      <nav className="card-list" aria-label="Configurações">
        {ITENS.map(({ href, icon: Icon, titulo, descricao, somenteAdmin }) => {
          const bloqueado = Boolean(somenteAdmin) && !admin;
          const conteudo = (
            <>
              <span className="card-icon">
                <Icon size={18} />
              </span>
              <span className={styles.cardInfo}>
                <span className="card-name">{titulo}</span>
                <span className={styles.cardMeta}>
                  {bloqueado ? "Disponível apenas para administradores" : descricao}
                </span>
              </span>
              <ChevronRight size={18} className={styles.chevron} aria-hidden />
            </>
          );
          // Sem permissão: visível, mas sem link (não navega nem mostra erro).
          return bloqueado ? (
            <span key={href} aria-disabled="true" className={cn("list-card glass-panel", "item-bloqueado")}>
              {conteudo}
            </span>
          ) : (
            <Link key={href} href={href} className="list-card glass-panel">
              {conteudo}
            </Link>
          );
        })}
      </nav>

      <Button variant="brand-secondary" onClick={handleLogout}>
        Sair
      </Button>
    </div>
  );
}
