"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { Warehouse, Beef, FileText } from "lucide-react";
import { BackLink } from "@/components/back-link";
import { Button } from "@/components/ui/button";
import { Fab } from "@/components/fab";
import { formatCurrency, formatNumber, formatGenero } from "@/lib/format";
import { cn } from "@/lib/utils";
import { fetchNegocio } from "@/lib/api/negocios";
import { fetchFazendas } from "@/lib/api/fazendas";
import type { NegocioDetail } from "@/lib/api/types";
import { ApiError } from "@/lib/api-client";
import styles from "./page.module.css";

export default function NegocioDetailPage() {
  const params = useParams<{ id: string }>();
  const [negocio, setNegocio] = React.useState<NegocioDetail | null>(null);
  const [fazendaNome, setFazendaNome] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [reloadKey, setReloadKey] = React.useState(0);

  React.useEffect(() => {
    let cancelled = false;
    // Reset to the loading state for this fetch — React's own data-fetching
    // pattern (see "Synchronizing with Effects"). Safe: guarded by `cancelled`.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNegocio(null);
    setError(null);

    Promise.all([fetchNegocio(params.id), fetchFazendas()])
      .then(([negocioData, fazendasData]) => {
        if (cancelled) return;
        setNegocio(negocioData);
        setFazendaNome(
          fazendasData.find((f) => f.fazenda_id === negocioData.fazenda_id)?.nome_fazenda ?? null
        );
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof ApiError || err instanceof Error ? err.message : "Erro ao carregar.");
      });

    return () => {
      cancelled = true;
    };
  }, [params.id, reloadKey]);

  const valorMedio =
    negocio?.valor_medio ??
    (negocio && negocio.gados.length > 0
      ? negocio.gados.reduce((sum, g) => sum + (g.valor_total ?? 0), 0) / negocio.gados.length
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
                <p className={styles.summaryFarm}>
                  Fazenda {fazendaNome ?? `#${negocio.fazenda_id}`}
                </p>
                <p className={styles.summarySeller}>
                  Marchante: {negocio.marchante}
                  {negocio.comprador ? ` · Comprador: ${negocio.comprador}` : ""}
                </p>
              </div>
            </div>
            <div className={styles.summaryStats}>
              <div>
                <p className={styles.summaryStatLabel}>Rend. de Carcaça</p>
                <p className={styles.summaryStatValue}>{formatNumber(negocio.rendimento_carcaca, 0)}%</p>
              </div>
              <div>
                <p className={styles.summaryStatLabel}>Valor p/ arroba</p>
                <p className={styles.summaryStatValue}>{formatCurrency(negocio.valor_arroba)}</p>
              </div>
              <div>
                <p className={styles.summaryStatLabel}>Modalidade</p>
                <p className={styles.summaryStatValue}>{negocio.modalidade}</p>
              </div>
            </div>
            <div className={styles.summaryFooter}>
              <span>
                Cabeças: <b>{negocio.qtd_animais ?? negocio.gados.length}</b>
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
                <div key={gado.gado_id} className={styles.gadoRow}>
                  <span className={styles.gadoIcon}>
                    <Beef size={18} />
                  </span>
                  <div className={styles.gadoInfo}>
                    <p className={styles.gadoName}>{gado.denominacao}</p>
                    <p className={styles.gadoMeta}>
                      Gênero: {formatGenero(gado.genero)} · Peso p/ cálculo: {formatNumber(gado.peso_calculo)}
                    </p>
                  </div>
                  <div className={styles.gadoAmount}>
                    <p className={styles.gadoAmountValue}>
                      {gado.valor_total !== null ? formatCurrency(gado.valor_total) : "—"}
                    </p>
                    <p>Peso da @: {formatNumber(gado.peso_arroba)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : null}

      <Fab icon={FileText} label="Gerar relatório" disabled />
    </div>
  );
}
