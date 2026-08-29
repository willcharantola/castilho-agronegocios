"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { Warehouse, Beef } from "lucide-react";
import { BackLink } from "@/components/back-link";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatNumber, formatGenero } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { NegocioDetail } from "@/lib/api/negocios";
import styles from "./page.module.css";

export default function NegocioDetailPage() {
  const params = useParams<{ id: string }>();
  const [negocio, setNegocio] = React.useState<NegocioDetail | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [reloadKey, setReloadKey] = React.useState(0);

  React.useEffect(() => {
    let cancelled = false;
    // Reset to the loading state for this fetch — React's own data-fetching
    // pattern (see "Synchronizing with Effects"). Safe: guarded by `cancelled`.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNegocio(null);
    setError(null);

    fetch(`/api/negocios/${params.id}`)
      .then(async (res) => {
        if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? "Erro ao carregar.");
        return res.json() as Promise<NegocioDetail>;
      })
      .then((data) => {
        if (!cancelled) setNegocio(data);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      });

    return () => {
      cancelled = true;
    };
  }, [params.id, reloadKey]);

  const valorMedio =
    negocio?.valorMedio ??
    (negocio && negocio.gados.length > 0
      ? negocio.gados.reduce((sum, g) => sum + (g.valorTotal ?? 0), 0) / negocio.gados.length
      : 0);

  return (
    <div className={cn(styles.page, "pt-safe")}>
      <BackLink href="/negocios" />

      {!negocio && !error ? <div className={cn(styles.state, "glass-panel")}>Carregando negócio...</div> : null}

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

      {negocio ? (
        <>
          <div className={cn(styles.summary, "glass-dark")}>
            <div className={styles.summaryHeader}>
              <span className={styles.summaryIcon}>
                <Warehouse size={18} />
              </span>
              <div>
                <p className={styles.summaryFarm}>Fazenda {negocio.fazenda}</p>
                <p className={styles.summarySeller}>Vendedor: {negocio.vendedor}</p>
              </div>
            </div>
            <div className={styles.summaryStats}>
              <div>
                <p className={styles.summaryStatLabel}>Rend. de Carcaça</p>
                <p className={styles.summaryStatValue}>{formatNumber(negocio.rendimentoCarcaca, 0)}%</p>
              </div>
              <div>
                <p className={styles.summaryStatLabel}>Valor p/ arroba</p>
                <p className={styles.summaryStatValue}>{formatCurrency(negocio.valorArroba)}</p>
              </div>
              <div>
                <p className={styles.summaryStatLabel}>Modalidade</p>
                <p className={styles.summaryStatValue}>{negocio.modalidade}</p>
              </div>
            </div>
            <div className={styles.summaryFooter}>
              <span>
                Cabeças: <b>{negocio.qtdAnimais ?? negocio.gados.length}</b>
              </span>
              <span>
                Valor médio p/ cabeça: <b>{formatCurrency(valorMedio)}</b>
              </span>
            </div>
          </div>

          <p className={styles.sectionTitle}>Gado cadastrado</p>

          {negocio.gados.length === 0 ? (
            <div className={cn(styles.state, "glass-panel")}>Nenhum gado cadastrado neste negócio.</div>
          ) : (
            <div className={styles.gadoList}>
              {negocio.gados.map((gado) => (
                <div key={gado.gadoId} className={styles.gadoRow}>
                  <span className={styles.gadoIcon}>
                    <Beef size={18} />
                  </span>
                  <div className={styles.gadoInfo}>
                    <p className={styles.gadoName}>{gado.denominacao}</p>
                    <p className={styles.gadoMeta}>
                      Gênero: {formatGenero(gado.genero)} · Peso p/ cálculo: {formatNumber(gado.pesoCalculo)}
                    </p>
                  </div>
                  <div className={styles.gadoAmount}>
                    <p className={styles.gadoAmountValue}>
                      {gado.valorTotal !== null ? formatCurrency(gado.valorTotal) : "—"}
                    </p>
                    <p>Peso da @: {formatNumber(gado.pesoArroba)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
