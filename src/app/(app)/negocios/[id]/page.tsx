"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Warehouse, Beef, FileText, Pencil, Plus } from "lucide-react";
import { BackLink } from "@/components/back-link";
import { Button } from "@/components/ui/button";
import { Fab } from "@/components/fab";
import { formatCurrency, formatNumber, formatGenero, formatHora, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { fetchNegocio } from "@/lib/api/negocios";
import { fetchFazendas } from "@/lib/api/fazendas";
import { gerarRelatorioNegocio } from "@/lib/relatorio";
import type { NegocioDetail } from "@/lib/api/types";
import { ApiError } from "@/lib/api-client";
import styles from "./page.module.css";

export default function NegocioDetailPage() {
  const params = useParams<{ id: string }>();
  const [negocio, setNegocio] = React.useState<NegocioDetail | null>(null);
  const [fazendaNome, setFazendaNome] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [reloadKey, setReloadKey] = React.useState(0);

  const [gerandoRelatorio, setGerandoRelatorio] = React.useState(false);
  const [relatorioError, setRelatorioError] = React.useState<string | null>(null);

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

  // Modalidade "cabeca": sem pesagem nem gados individuais — o valor por cabeça é o próprio valor_unidade.
  const porCabeca = negocio?.modalidade === "cabeca";
  const valorMedio =
    negocio?.valor_medio ??
    (porCabeca ? negocio.valor_unidade : null) ??
    (negocio && negocio.gados.length > 0
      ? negocio.gados.reduce((sum, g) => sum + (g.valor_total ?? 0), 0) / negocio.gados.length
      : 0);

  async function handleGerarRelatorio() {
    if (!negocio) return;
    setRelatorioError(null);
    setGerandoRelatorio(true);
    try {
      await gerarRelatorioNegocio(negocio, fazendaNome ?? `Fazenda #${negocio.fazenda_id}`);
    } catch (err) {
      setRelatorioError(
        err instanceof ApiError || err instanceof Error ? err.message : "Erro ao gerar relatório."
      );
    } finally {
      setGerandoRelatorio(false);
    }
  }

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
                  {fazendaNome ?? `#${negocio.fazenda_id}`}
                </p>
               
              </div>
            </div>
          


            <div className={styles.summaryFooter}>

               <span>Vendedor: {negocio.vendedor.nome_vendedor}</span>
              
             </div>

             <div className={styles.summaryFooter}>

               <span>Comprador: {negocio.comprador.nome_empresa}</span>
              
             </div>


             <div className={styles.summaryFooter}>

               <span>Modalidade: {negocio.modalidade}</span>
              
             </div>

               <div className={styles.summaryFooter}>

               <span>Valor p/ un.: {formatCurrency(negocio.valor_unidade)}</span>
              
             </div>

              <div className={styles.summaryFooter}>

               <span> Data: {formatDate(negocio.data_negocio)} </span>
              
             </div>
             

            <div className={styles.summaryFooter}>
              <span>
                Início Pesagem: {negocio.hora_inicio_pesagem ? `${formatHora(negocio.hora_inicio_pesagem) || "…"}`
                    : "—"}
              </span>

              <span>Fim Pesagem: {negocio.hora_fim_pesagem ? `${formatHora(negocio.hora_fim_pesagem) || "…"} ` : "—"} </span>
             
            </div>

            <div className={styles.summaryFooter}>
              <span>
                Cabeças Negociadas: <b>{negocio.qtd_animais ?? negocio.gados.length}</b>
              </span>
             
            </div>

            <div className={styles.summaryFooter}>
              <span>
                Valor médio p/ cabeça: <b>{formatCurrency(valorMedio)}</b>
              </span>
            </div>
          </div>

          {porCabeca && negocio.gados.length === 0 ? null : (
            <p className={styles.sectionTitle}>Cabeças Cadastradas</p>
          )}

          {porCabeca && negocio.gados.length === 0 ? null : negocio.gados.length === 0 ? (
            <div className={cn(styles.state, "glass-panel")}>Nenhum gado cadastrado neste negócio.</div>
          ) : (
            <div className={styles.gadoList}>
              {negocio.gados.map((gado) => {
                const conteudo = (
                  <>
                    <span className={styles.gadoIcon}>
                      <Beef size={18} />
                    </span>
                    <div className={styles.gadoInfo}>
                      <p className={styles.gadoName}>{gado.denominacao}</p>

                      <p className={styles.gadoMeta}> Gênero: {formatGenero(gado.genero)}  </p>
                       <p className={styles.gadoMeta}> Rend.: {formatNumber(gado.rendimento_carcaca, 0)}%</p>
                       <p className={styles.gadoMeta}>Peso p/ cálculo: {formatNumber(gado.peso_calculo)}</p>
                       <p className={styles.gadoMeta}>   {gado.horario_pesagem ? ` · Pesado às ${formatHora(gado.horario_pesagem)}` : null} </p>
                        <p className={styles.gadoMeta}>Peso da @: {formatNumber(gado.peso_arroba)} </p>
                    </div>
                    <div className={styles.gadoAmount}>
                      <p className={styles.gadoAmountValue}>
                        {gado.valor_total !== null ? formatCurrency(gado.valor_total) : "—"}
                      </p>
                      <p>Valor da cabeça</p>
                    </div>
                  </>
                );
                // Negócios "cabeca" não têm gados individuais editáveis.
                return porCabeca ? (
                  <div key={gado.gado_id} className={styles.gadoRow}>
                    {conteudo}
                  </div>
                ) : (
                  <Link
                    key={gado.gado_id}
                    href={`/negocios/${negocio.negocio_id}/gado/${gado.gado_id}/editar`}
                    className={cn(styles.gadoRow, styles.gadoRowLink)}
                    aria-label={`Editar ${gado.denominacao}`}
                  >
                    {conteudo}
                    
                  </Link>
                );
              })}
            </div>
          )}
        </>
      ) : null}

      {relatorioError ? <p className={styles.relatorioError}>{relatorioError}</p> : null}

      <Fab
        icon={FileText}
        label="Gerar relatório"
        onClick={handleGerarRelatorio}
        disabled={gerandoRelatorio || !negocio}
        disabledTitle={gerandoRelatorio ? "Gerando relatório..." : "Em breve"}
      />

      {/* Negócios "cabeca" não têm cadastro individual de gado. */}
      {negocio && !porCabeca ? (
        <Fab icon={Plus} label="Adicionar gado" href={`/negocios/${negocio.negocio_id}/gado/novo`} stacked />
      ) : null}
    </div>
  );
}
