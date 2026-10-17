"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Warehouse, Beef, FileText, Pencil, Plus } from "lucide-react";
import { BackLink } from "@/components/back-link";
import { Button } from "@/components/ui/button";
import { Fab } from "@/components/fab";
import { ComissaoForm } from "@/components/comissao-form";
import { formatCurrency, formatNumber, formatGenero, formatHora, formatDate, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";
import { fetchNegocio } from "@/lib/api/negocios";
import { fetchFazendas } from "@/lib/api/fazendas";
import { gerarRomaneios } from "@/lib/relatorio-romaneio";
import type { Fazenda, NegocioDetail } from "@/lib/api/types";
import { ApiError } from "@/lib/api-client";
import { PendenteBadge } from "@/components/offline/pendente-badge";
import { useVersaoSincronizacao } from "@/lib/offline/fila";
import { comGadosPendentes, useGadosPendentes } from "@/lib/offline/pendentes";
import styles from "./page.module.css";

export default function NegocioDetailPage() {
  const params = useParams<{ id: string }>();
  const [negocioServidor, setNegocio] = React.useState<NegocioDetail | null>(null);
  // Gados cadastrados offline para este negócio, ainda na fila do aparelho.
  const gadosPendentes = useGadosPendentes(Number(params.id));
  const negocio = React.useMemo(
    () => (negocioServidor ? comGadosPendentes(negocioServidor, gadosPendentes) : null),
    [negocioServidor, gadosPendentes]
  );
  // Recarrega quando a fila é sincronizada (os gados pendentes passam a vir da API).
  const versaoSincronizacao = useVersaoSincronizacao();
  const [fazenda, setFazenda] = React.useState<Fazenda | null>(null);
  const fazendaNome = fazenda?.nome_fazenda ?? null;
  const [error, setError] = React.useState<string | null>(null);
  const [reloadKey, setReloadKey] = React.useState(0);

  const [gerandoRelatorio, setGerandoRelatorio] = React.useState(false);
  const [relatorioError, setRelatorioError] = React.useState<string | null>(null);
  const [relatorioAvisos, setRelatorioAvisos] = React.useState<string[]>([]);

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
        setFazenda(fazendasData.find((f) => f.fazenda_id === negocioData.fazenda_id) ?? null);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof ApiError || err instanceof Error ? err.message : "Erro ao carregar.");
      });

    return () => {
      cancelled = true;
    };
  }, [params.id, reloadKey, versaoSincronizacao]);

  // Modalidade "cabeca": sem pesagem nem gados individuais — o valor por cabeça é o próprio valor_unidade.
  const porCabeca = negocio?.modalidade === "cabeca";
  const valorMedio =
    negocio?.valor_medio ??
    (porCabeca ? negocio.valor_unidade : null) ??
    (negocio && negocio.gados.length > 0
      ? negocio.gados.reduce((sum, g) => sum + (g.valor_total ?? 0), 0) / negocio.gados.length
      : 0);

  // Campos do romaneio vêm calculados da API. Negócio ainda só no aparelho (id
  // negativo): ficam "—" até a sincronização — o cálculo não é replicado aqui.
  const sincronizado = (negocio?.negocio_id ?? 0) > 0;
  const romaneio = (valor: number | null | undefined, formatar: (v: number) => string) =>
    sincronizado && valor !== null && valor !== undefined ? formatar(valor) : "—";
  const itensRomaneio: { label: string; valor: string }[] = negocio
    ? [
        // Pesos e rendimento não se aplicam à modalidade "cabeca" (sem pesagem).
        ...(porCabeca
          ? []
          : [
              { label: "Peso total (kg)", valor: romaneio(negocio.peso_total_quilos, (v) => formatNumber(v)) },
              { label: "Peso total (@)", valor: romaneio(negocio.peso_total_arroba, (v) => formatNumber(v)) },
              { label: "Rendimento médio", valor: romaneio(negocio.rendimento_medio, formatPercent) },
              { label: "Peso médio (@)", valor: romaneio(negocio.peso_medio_arroba, (v) => formatNumber(v)) },
              { label: "Peso médio (kg)", valor: romaneio(negocio.peso_medio_quilos, (v) => formatNumber(v)) },
            ]),
        { label: "Valor médio por cabeça", valor: romaneio(valorMedio, formatCurrency) },
        { label: "Funrural (1,5%)", valor: romaneio(negocio.funrural, formatCurrency) },
        { label: "Senar (0,2%)", valor: romaneio(negocio.senar, formatCurrency) },
      ]
    : [];

  async function handleGerarRelatorio() {
    if (!negocioServidor) return;
    setRelatorioError(null);
    setRelatorioAvisos([]);
    setGerandoRelatorio(true);
    try {
      // Só o que já está no servidor: gados pendentes têm valores apenas estimados.
      const { avisos } = await gerarRomaneios(
        [negocioServidor],
        fazenda ? { [fazenda.fazenda_id]: fazenda } : {}
      );
      setRelatorioAvisos(avisos);
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

               <span>Pecuarista: {negocio.pecuarista.nome_pecuarista}</span>
              
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

           
          </div>

           <div className={cn(styles.summary, "glass-dark")}>

             <div className={styles.summaryFooter}>
              <span>
                Cabeças Negociadas: <b>{negocio.qtd_animais ?? negocio.gados.length}</b>
              </span>
             
            </div>



            <div className={styles.summaryFooter}>
              <span>
                Comissão: <b>{negocio.comissao !== null ? formatCurrency(negocio.comissao) : "—"}</b>
              </span>
            </div>


           </div>

          <div className={cn(styles.summary, "glass-dark")}>

             <div className={styles.summaryFooter}>
              <span>
                Cabeça mais leve: <b>{negocio.mais_leve}</b>
              </span>
            </div>

             <div className={styles.summaryFooter}>
              <span>
                Cabeça mais pesada: <b>{negocio.mais_pesado}</b>
              </span>
            </div>
          </div>

          <div className={cn(styles.summary, "glass-dark")}>
            <p className={styles.romaneioTitle}>Resumo do romaneio</p>
            <dl className={styles.romaneioGrid}>
              {itensRomaneio.map((item) => (
                <div key={item.label} className={styles.romaneioItem}>
                  <dt className={styles.romaneioLabel}>{item.label}</dt>
                  <dd className={styles.romaneioValue}>{item.valor}</dd>
                </div>
              ))}
            </dl>
          </div>

          <ComissaoForm
            negocioId={negocio.negocio_id}
            porcentagem={negocio.porcentagem_comissao}
            comissao={negocio.comissao}
            onUpdated={({ porcentagem_comissao, comissao }) =>
              setNegocio((atual) => (atual ? { ...atual, porcentagem_comissao, comissao } : atual))
            }
          />


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
                       <p className={styles.gadoMeta}>   {gado.horario_pesagem ? ` Pesado às ${formatHora(gado.horario_pesagem)}` : null} </p>
                       <p className={styles.gadoMeta}>Peso total: {formatNumber(gado.peso_total)} </p>
                        <p className={styles.gadoMeta}>Peso da @: {formatNumber(gado.peso_arroba)} </p>
                        {gado.pendente ? <PendenteBadge pendente={gado.pendente} /> : null}
                    </div>
                    <div className={styles.gadoAmount}>
                      <p className={styles.gadoAmountValue}>
                        {gado.valor_total !== null ? formatCurrency(gado.valor_total) : "—"}
                      </p>
                      <p className={styles.gadoMeta}>Valor da cabeça</p>  
                    </div>
                  </>
                );
                // Negócios "cabeca" não têm gados individuais editáveis; gados pendentes
                // (só no aparelho) também não — a edição em tela própria usa a API.
                return porCabeca || gado.pendente ? (
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
      {relatorioAvisos.map((aviso) => (
        <p key={aviso} className={styles.relatorioAviso}>
          {aviso}
        </p>
      ))}

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
