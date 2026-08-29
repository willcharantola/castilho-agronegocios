"use client";

import * as React from "react";
import Link from "next/link";
import { Search, Warehouse } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { NegocioListItem } from "@/lib/api/negocios";
import styles from "./page.module.css";

export default function NegociosPage() {
  const [negocios, setNegocios] = React.useState<NegocioListItem[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [reloadKey, setReloadKey] = React.useState(0);

  React.useEffect(() => {
    let cancelled = false;
    // Reset to the loading state for this fetch — React's own data-fetching
    // pattern (see "Synchronizing with Effects"). Safe: guarded by `cancelled`.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNegocios(null);
    setError(null);

    fetch("/api/negocios")
      .then(async (res) => {
        if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? "Erro ao carregar.");
        return res.json() as Promise<NegocioListItem[]>;
      })
      .then((data) => {
        if (!cancelled) setNegocios(data);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      });

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  return (
    <div className={cn(styles.page, "pt-safe")}>
      <h1 className={styles.title}>Negócios Cadastrados</h1>

      <div className={styles.searchWrap}>
        <Search className={styles.searchIcon} size={18} />
        <input
          className={cn(styles.searchInput, "glass-panel")}
          placeholder="Buscar negócio... (em breve)"
          disabled
        />
      </div>

      <div className={styles.filters}>
        <div className={styles.filterGroup}>
          <span className={styles.filterLabel}>Período</span>
          <select className={cn(styles.filterSelect, "glass-panel")} disabled defaultValue="tudo">
            <option value="tudo">Tudo</option>
          </select>
        </div>
        <div className={styles.filterGroup}>
          <span className={styles.filterLabel}>Vendedor</span>
          <select className={cn(styles.filterSelect, "glass-panel")} disabled defaultValue="todos">
            <option value="todos">Todos</option>
          </select>
        </div>
      </div>
      <p className={styles.filtersHint}>Filtros funcionais chegam em uma próxima etapa.</p>

      {negocios === null && !error ? (
        <div className={cn(styles.state, "glass-panel")}>Carregando negócios...</div>
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

      {negocios && negocios.length === 0 ? (
        <div className={cn(styles.state, "glass-panel")}>Nenhum negócio cadastrado ainda.</div>
      ) : null}

      {negocios && negocios.length > 0 ? (
        <div className={styles.list}>
          {negocios.map((negocio) => (
            <Link
              key={negocio.negocioId}
              href={`/negocios/${negocio.negocioId}`}
              className={cn(styles.card, "glass-panel")}
            >
              <span className={styles.cardIcon}>
                <Warehouse size={18} />
              </span>
              <div className={styles.cardInfo}>
                <p className={styles.cardFarm}>{negocio.fazenda}</p>
                <p className={styles.cardMeta}>
                  Vendedor: {negocio.vendedor} · {formatDate(negocio.dataNegocio)}
                </p>
              </div>
              <div className={styles.cardAmount}>
                <p className={styles.cardCommission}>{formatCurrency(negocio.comissao)}</p>
                <p className={styles.cardHeads}>Cabeças: {negocio.qtdAnimais ?? "—"}</p>
              </div>
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
