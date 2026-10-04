"use client";

import * as React from "react";
import Link from "next/link";
import { Building2, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Fab } from "@/components/fab";
import { cn } from "@/lib/utils";
import { fetchCompradores } from "@/lib/api/compradores";
import type { Comprador } from "@/lib/api/types";
import { ApiError } from "@/lib/api-client";
import { PendenteBadge } from "@/components/offline/pendente-badge";
import { useVersaoSincronizacao } from "@/lib/offline/fila";
import { mesclarPendentes, useCompradoresPendentes } from "@/lib/offline/pendentes";
import styles from "./page.module.css";

export default function CompradoresPage() {
  const [compradoresServidor, setCompradores] = React.useState<Comprador[] | null>(null);
  // Cadastros feitos offline aparecem no topo, marcados como pendentes de sincronização.
  const compradoresPendentes = useCompradoresPendentes();
  const compradores = React.useMemo(
    () => mesclarPendentes(compradoresServidor, compradoresPendentes),
    [compradoresServidor, compradoresPendentes]
  );
  const versaoSincronizacao = useVersaoSincronizacao();
  const [error, setError] = React.useState<string | null>(null);
  const [reloadKey, setReloadKey] = React.useState(0);
  const [busca, setBusca] = React.useState("");

  React.useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCompradores(null);
    setError(null);

    fetchCompradores()
      .then((data) => {
        if (!cancelled) setCompradores(data);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof ApiError || err instanceof Error ? err.message : "Erro ao carregar.");
      });

    return () => {
      cancelled = true;
    };
  }, [reloadKey, versaoSincronizacao]);

  const buscaLower = busca.trim().toLowerCase();
  const filtrados = compradores?.filter(
    (c) =>
      buscaLower === "" ||
      c.nome_empresa.toLowerCase().includes(buscaLower) ||
      c.municipio.toLowerCase().includes(buscaLower) ||
      c.pessoa_contato.toLowerCase().includes(buscaLower)
  );

  return (
    <div className={cn(styles.page, "pt-safe")}>
      <h1 className={styles.title}>Compradores Cadastrados</h1>

      <div className={styles.searchWrap}>
        <Search className={styles.searchIcon} size={18} />
        <input
          className={cn(styles.searchInput, "glass-panel")}
          placeholder="Buscar comprador..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
      </div>

      {compradores === null && !error ? (
        <div className={cn(styles.state, "glass-panel")}>Carregando compradores...</div>
      ) : null}

      {error && !compradores ? (
        <div className={cn(styles.state, styles.stateError, "glass-panel")}>
          {error}
          <div>
            <Button className={styles.retryButton} variant="brand" onClick={() => setReloadKey((k) => k + 1)}>
              Tentar novamente
            </Button>
          </div>
        </div>
      ) : null}

      {filtrados && filtrados.length === 0 ? (
        <div className={cn(styles.state, "glass-panel")}>
          {compradores && compradores.length > 0
            ? "Nenhum comprador encontrado para essa busca."
            : "Nenhum comprador cadastrado ainda."}
        </div>
      ) : null}

      {filtrados && filtrados.length > 0 ? (
        <div className={styles.list}>
          {filtrados.map((comprador) => (
            <Link
              key={comprador.comprador_id}
              href={`/compradores/${comprador.comprador_id}`}
              // Pendente: ainda não existe no servidor, então não há tela de edição para abrir.
              aria-disabled={comprador.pendente ? true : undefined}
              onClick={comprador.pendente ? (e) => e.preventDefault() : undefined}
              className={cn(styles.card, "glass-panel")}
            >
              <span className={styles.cardIcon}>
                <Building2 size={18} />
              </span>
              <div className={styles.cardInfo}>
                <p className={styles.cardName}>{comprador.nome_empresa}</p>
                <p className={styles.cardMeta}>CNPJ: {comprador.cnpj}</p>
                <p className={styles.cardMeta}>
                  {comprador.municipio} · Contato: {comprador.pessoa_contato}
                </p>
                {comprador.pendente ? <PendenteBadge pendente={comprador.pendente} /> : null}
              </div>
            </Link>
          ))}
        </div>
      ) : null}

      <Fab icon={Plus} label="Cadastrar comprador" href="/compradores/novo" />
    </div>
  );
}
