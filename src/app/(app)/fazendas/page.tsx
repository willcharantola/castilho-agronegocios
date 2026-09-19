"use client";

import * as React from "react";
import Link from "next/link";
import { Plus, Search, Warehouse } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Fab } from "@/components/fab";
import { cn } from "@/lib/utils";
import { fetchFazendas } from "@/lib/api/fazendas";
import type { Fazenda } from "@/lib/api/types";
import { ApiError } from "@/lib/api-client";
import styles from "./page.module.css";

export default function FazendasPage() {
  const [fazendas, setFazendas] = React.useState<Fazenda[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [reloadKey, setReloadKey] = React.useState(0);
  const [busca, setBusca] = React.useState("");

  React.useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFazendas(null);
    setError(null);

    fetchFazendas()
      .then((data) => {
        if (!cancelled) setFazendas(data);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof ApiError || err instanceof Error ? err.message : "Erro ao carregar.");
      });

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const buscaLower = busca.trim().toLowerCase();
  const filtradas = fazendas?.filter(
    (f) =>
      buscaLower === "" ||
      f.nome_fazenda.toLowerCase().includes(buscaLower) ||
      f.municipio.toLowerCase().includes(buscaLower)
  );

  return (
    <div className={cn(styles.page, "pt-safe")}>
      <h1 className={styles.title}>Fazendas Cadastradas</h1>

      <div className={styles.searchWrap}>
        <Search className={styles.searchIcon} size={18} />
        <input
          className={cn(styles.searchInput, "glass-panel")}
          placeholder="Buscar fazenda..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
      </div>

      {fazendas === null && !error ? (
        <div className={cn(styles.state, "glass-panel")}>Carregando fazendas...</div>
      ) : null}

      {error ? (
        <div className={cn(styles.state, styles.stateError, "glass-panel")}>
          {error}
          <div>
            <Button
              className={styles.retryButton}
              variant="brand"
              onClick={() => setReloadKey((k) => k + 1)}
            >
              Tentar novamente
            </Button>
          </div>
        </div>
      ) : null}

      {filtradas && filtradas.length === 0 ? (
        <div className={cn(styles.state, "glass-panel")}>
          {fazendas && fazendas.length > 0
            ? "Nenhuma fazenda encontrada para essa busca."
            : "Nenhuma fazenda cadastrada ainda."}
        </div>
      ) : null}

      {filtradas && filtradas.length > 0 ? (
        <div className={styles.list}>
          {filtradas.map((fazenda) => (
            <Link
              key={fazenda.fazenda_id}
              href={`/fazendas/${fazenda.fazenda_id}`}
              className={cn(styles.card, "glass-panel")}
            >
              <span className={styles.cardIcon}>
                <Warehouse size={18} />
              </span>
              <div className={styles.cardInfo}>
                <p className={styles.cardName}>{fazenda.nome_fazenda}</p>
                <p className={styles.cardMeta}> Município: {fazenda.municipio} </p>
                 <p className={styles.cardMeta}>I.E.: {fazenda.inscricao_estadual}</p>
              </div>
            </Link>
          ))}
        </div>
      ) : null}

      <Fab icon={Plus} label="Cadastrar fazenda" href="/fazendas/novo" />
    </div>
  );
}
