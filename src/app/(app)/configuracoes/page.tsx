"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, Percent, UserRound, Users, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { clearSession, getUsuario } from "@/lib/api-client";
import { NIVEL_LABELS } from "./usuarios/usuario-form";
import styles from "./page.module.css";

type ItemConfiguracao = { href: string; icon: LucideIcon; titulo: string; descricao: string; somenteAdmin?: boolean };

/** Uma linha por opção: novas configurações entram aqui. */
const ITENS: ItemConfiguracao[] = [
  {
    href: "/configuracoes/impostos-e-taxas",
    icon: Percent,
    titulo: "Impostos e taxas",
    descricao: "Alíquotas de Funrural e Senar dos negócios",
  },
  {
    href: "/configuracoes/usuarios",
    icon: Users,
    titulo: "Usuários",
    descricao: "Cadastro e acesso dos usuários do sistema",
    // Só para Admin (visual): a API é quem impede o acesso dos demais.
    somenteAdmin: true,
  },
];

export default function ConfiguracoesPage() {
  const router = useRouter();
  const usuario = getUsuario();
  const admin = usuario?.nivel_acesso === "Admin";
  const itens = ITENS.filter((item) => admin || !item.somenteAdmin);

  function handleLogout() {
    clearSession();
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
        {itens.map(({ href, icon: Icon, titulo, descricao }) => (
          <Link key={href} href={href} className="list-card glass-panel">
            <span className="card-icon">
              <Icon size={18} />
            </span>
            <span className={styles.cardInfo}>
              <span className="card-name">{titulo}</span>
              <span className={styles.cardMeta}>{descricao}</span>
            </span>
            <ChevronRight size={18} className={styles.chevron} aria-hidden />
          </Link>
        ))}
      </nav>

      <Button variant="brand-secondary" onClick={handleLogout}>
        Sair
      </Button>
    </div>
  );
}
