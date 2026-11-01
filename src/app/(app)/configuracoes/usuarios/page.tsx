"use client";

import * as React from "react";
import Link from "next/link";
import { UserPlus, UserRound } from "lucide-react";
import { BackLink } from "@/components/back-link";
import { Button } from "@/components/ui/button";
import { fetchUsuarios } from "@/lib/api/usuarios";
import type { Usuario } from "@/lib/api/types";
import { mensagemDeErro } from "@/lib/offline/rede";
import { useOnlineStatus } from "@/lib/offline/use-online-status";
import { cn } from "@/lib/utils";
import { useSomenteAdmin } from "./use-somente-admin";
import { NIVEL_LABELS } from "./usuario-form";
import styles from "./page.module.css";

/**
 * Lista de usuários da empresa — só para Admin. Esconder aqui é apenas usabilidade:
 * a API recusa (403) estas rotas para quem não é Admin.
 */
export default function UsuariosPage() {
  const admin = useSomenteAdmin();
  const online = useOnlineStatus();
  const [usuarios, setUsuarios] = React.useState<Usuario[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [reloadKey, setReloadKey] = React.useState(0);

  React.useEffect(() => {
    if (!admin) return;
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
  }, [admin, reloadKey]);

  if (!admin) return null;

  return (
    <div className={cn("page-container page-narrow pt-safe", styles.section)}>
      <BackLink href="/configuracoes" />
      <div className={styles.sectionHeader}>
        <h1 className="page-title">Usuários do sistema</h1>
        <Button
          variant="brand"
          className={styles.newButton}
          disabled={!online}
          render={online ? <Link href="/configuracoes/usuarios/novo" /> : undefined}
        >
          <UserPlus size={16} aria-hidden />
          Cadastrar usuário
        </Button>
      </div>
      {!online ? <p className={styles.hint}>Gestão de usuários indisponível sem internet.</p> : null}

      {usuarios === null && !error ? (
        <div className="state-box glass-panel">Carregando usuários...</div>
      ) : null}

      {error ? (
        <div className="state-box state-error glass-panel">
          {error}
          <div>
            <Button className="retry-button" variant="brand" onClick={() => setReloadKey((k) => k + 1)}>
              Tentar novamente
            </Button>
          </div>
        </div>
      ) : null}

      {usuarios && usuarios.length === 0 ? (
        <div className="state-box glass-panel">Nenhum usuário cadastrado.</div>
      ) : null}

      {usuarios && usuarios.length > 0 ? (
        <div className="card-list">
          {usuarios.map((usuario) => (
            <Link
              key={usuario.usuario_id}
              href={`/configuracoes/usuarios/${usuario.usuario_id}`}
              // Sem internet não há como editar: o card fica só para leitura.
              aria-disabled={!online || undefined}
              onClick={online ? undefined : (e) => e.preventDefault()}
              className="list-card glass-panel"
            >
              <span className="card-icon">
                <UserRound size={18} />
              </span>
              <div className="card-info">
                <p className="card-name">
                  {usuario.nome} {usuario.sobrenome}
                </p>
                <p className={styles.cardMeta}>{usuario.email}</p>
                <div className={styles.tags}>
                  <span className={cn(styles.tag, usuario.nivel_acesso === "Admin" && styles.tagAdmin)}>
                    {NIVEL_LABELS[usuario.nivel_acesso]}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
