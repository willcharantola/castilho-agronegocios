"use client";

import * as React from "react";
import Link from "next/link";
import { UserPlus, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fetchUsuarios } from "@/lib/api/usuarios";
import type { Usuario } from "@/lib/api/types";
import { mensagemDeErro } from "@/lib/offline/rede";
import { useOnlineStatus } from "@/lib/offline/use-online-status";
import { cn } from "@/lib/utils";
import styles from "./page.module.css";

export const NIVEL_LABELS: Record<Usuario["nivel_acesso"], string> = {
  Admin: "Administrador",
  Normal: "Normal",
};

/**
 * Lista de usuários da empresa — renderizada só para Admin. Esconder aqui é apenas
 * usabilidade: a API recusa (403) estas rotas para quem não é Admin.
 */
export function UsuariosSection() {
  const online = useOnlineStatus();
  const [usuarios, setUsuarios] = React.useState<Usuario[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [reloadKey, setReloadKey] = React.useState(0);

  React.useEffect(() => {
    let cancelled = false;
    // Volta ao estado de carregamento a cada busca (padrão das demais listagens).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUsuarios(null);
    setError(null);
    fetchUsuarios()
      .then((lista) => {
        if (!cancelled) setUsuarios(lista);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(mensagemDeErro(err, "Erro ao carregar."));
      });
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>Usuários do sistema</h2>
        <Button
          variant="brand"
          className={styles.newButton}
          disabled={!online}
          render={online ? <Link href="/perfil/usuarios/novo" /> : undefined}
        >
          <UserPlus size={16} aria-hidden />
          Cadastrar usuário
        </Button>
      </div>
      {!online ? <p className={styles.hint}>Gestão de usuários indisponível sem internet.</p> : null}

      {usuarios === null && !error ? (
        <div className={cn(styles.state, "glass-panel")}>Carregando usuários...</div>
      ) : null}

      {error ? (
        <div className={cn(styles.state, styles.stateError, "glass-panel")}>
          {error}
          <div>
            <Button className={styles.retryButton} variant="brand" onClick={() => setReloadKey((k) => k + 1)}>
              Tentar novamente
            </Button>
          </div>
        </div>
      ) : null}

      {usuarios && usuarios.length === 0 ? (
        <div className={cn(styles.state, "glass-panel")}>Nenhum usuário cadastrado.</div>
      ) : null}

      {usuarios && usuarios.length > 0 ? (
        <div className={styles.list}>
          {usuarios.map((usuario) => (
            <Link
              key={usuario.usuario_id}
              href={`/perfil/usuarios/${usuario.usuario_id}`}
              // Sem internet não há como editar: o card fica só para leitura.
              aria-disabled={!online || undefined}
              onClick={online ? undefined : (e) => e.preventDefault()}
              className={cn(styles.card, "glass-panel")}
            >
              <span className={styles.cardIcon}>
                <UserRound size={18} />
              </span>
              <div className={styles.cardInfo}>
                <p className={styles.cardName}>
                  {usuario.nome} {usuario.sobrenome}
                </p>
                <p className={styles.cardMeta}>{usuario.email}</p>
                <div className={styles.tags}>
                  <span className={cn(styles.tag, usuario.nivel_acesso === "Admin" && styles.tagAdmin)}>
                    {NIVEL_LABELS[usuario.nivel_acesso]}
                  </span>
                  {usuario.primeiro_acesso ? (
                    <span className={cn(styles.tag, styles.tagPendente)}>Primeiro acesso pendente</span>
                  ) : null}
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : null}
    </section>
  );
}
