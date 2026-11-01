"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Beef, FileText, Plus } from "lucide-react";
import { BackLink } from "@/components/back-link";
import { PendenteBadge } from "@/components/offline/pendente-badge";
import { Button } from "@/components/ui/button";
import { Fab } from "@/components/fab";
import { ComissaoForm } from "@/components/comissao-form";
import { NegocioCarrossel } from "@/components/negocio-carrossel";
import { TipoNegocioForm } from "@/components/tipo-negocio-form";
import { cn } from "@/lib/utils";
import { formatCurrency, formatHora, formatNumber, formatPercent } from "@/lib/format";
import { GENERO_LABELS } from "@/lib/labels";
import { fetchNegocio } from "@/lib/api/negocios";
import { gerarRomaneios } from "@/lib/relatorio-romaneio";
import { useNegocioComPendencias } from "@/lib/flows/use-negocio-com-pendencias";
import { mensagemDeErro } from "@/lib/offline/rede";
import styles from "./page.module.css";

export default function NegocioDetailPage() {
  const params = useParams<{ id: string }>();
  const { negocio, erro, recarregar } = useNegocioComPendencias(Number(params.id));

  const [gerandoRelatorio, setGerandoRelatorio] = React.useState(false);
  const [relatorioError, setRelatorioError] = React.useState<string | null>(null);
  const [relatorioAvisos, setRelatorioAvisos] = React.useState<string[]>([]);

  const porCabeca = negocio?.modalidade === "cabeca";
  const sincronizado = (negocio?.negocio_id ?? 0) > 0;

  // Filtro dos chips do carrossel: 0 = "Geral", i = i-ésimo lote.
  const [filtro, setFiltro] = React.useState(0);
  const lotes = negocio?.lotes ?? [];
  const loteFiltrado = filtro > 0 ? (lotes[Math.min(filtro, lotes.length) - 1] ?? null) : null;
  const cabecas = (loteFiltrado ? [loteFiltrado] : lotes).flatMap((lote) =>
    lote.gados.map((gado) => ({ gado, lote }))
  );

  async function handleGerarRelatorio() {
    if (!negocio || !sincronizado) return;
    setRelatorioError(null);
    setRelatorioAvisos([]);
    setGerandoRelatorio(true);
    try {
      // Só o que já está no servidor: cabeças pendentes têm valores apenas estimados.
      const servidor = await fetchNegocio(negocio.negocio_id);
      const { avisos } = await gerarRomaneios(
        [servidor],
        servidor.fazenda ? { [servidor.fazenda.fazenda_id]: servidor.fazenda } : {}
      );
      setRelatorioAvisos(avisos);
    } catch (err) {
      setRelatorioError(mensagemDeErro(err, "Erro ao gerar relatório."));
    } finally {
      setGerandoRelatorio(false);
    }
  }

  return (
    <div className={cn("page-wide", styles.page, "pt-safe")}>
      <BackLink href="/negocios" />

      {!negocio && !erro ? <div className="state-box glass-panel">Carregando negócio...</div> : null}

      {erro && !negocio ? (
        <div className="state-box state-error glass-panel">
          {erro}
          <div>
            <Button className="retry-button" variant="brand" onClick={() => recarregar()}>
              Tentar novamente
            </Button>
          </div>
        </div>
      ) : null}

      {negocio ? (
        <>
          <NegocioCarrossel
            negocio={negocio}
            fazenda={negocio.fazenda ?? null}
            ativo={filtro}
            onAtivoChange={setFiltro}
            cabecasNoQuadro={false}
          />

          {sincronizado ? (
            <TipoNegocioForm
              key={negocio.tipo_negocio}
              negocioId={negocio.negocio_id}
              tipoNegocio={negocio.tipo_negocio}
              onUpdated={() => recarregar()}
            />
          ) : null}

          <ComissaoForm
            negocioId={negocio.negocio_id}
            porcentagem={negocio.porcentagem_comissao}
            comissao={negocio.comissao}
            onUpdated={() => recarregar()}
          />

          {/* Cabeças do filtro ativo ("Geral" = todas). Negócios "cabeca" não têm pesagem. */}
          {porCabeca ? null : cabecas.length === 0 ? (
            <div className="state-box glass-panel">
              {loteFiltrado ? "Nenhum gado cadastrado neste lote." : "Nenhum gado cadastrado neste negócio."}
            </div>
          ) : (
            <div className={styles.gadoList}>
              {cabecas.map(({ gado, lote }) => {
                const conteudo = (
                  <>
                    <span className={styles.gadoIcon}>
                      <Beef size={18} />
                    </span>
                    <div className={styles.gadoInfo}>
                      <p className={styles.gadoName}>{lote.nome_lote}</p>
                      <p className={styles.gadoMeta}>Gênero: {GENERO_LABELS[lote.genero]}</p>
                      <p className={styles.gadoMeta}>Rend.: {formatPercent(lote.rendimento_carcaca)}</p>
                      <p className={styles.gadoMeta}>Peso p/ cálculo: {formatNumber(gado.peso_calculo)}</p>
                      <p className={styles.gadoMeta}>
                        {gado.horario_pesagem ? `Pesado às ${formatHora(gado.horario_pesagem)}` : null}
                      </p>
                      <p className={styles.gadoMeta}>Peso total: {formatNumber(gado.peso_total)}</p>
                      <p className={styles.gadoMeta}>Peso da @: {formatNumber(gado.peso_arroba)}</p>
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
                // Cabeças pendentes (só no aparelho) não abrem a edição: ela usa a API.
                return gado.pendente || gado.gado_id <= 0 ? (
                  <div key={gado.gado_id} className={styles.gadoRow}>
                    {conteudo}
                  </div>
                ) : (
                  <Link
                    key={gado.gado_id}
                    href={`/negocios/${negocio.negocio_id}/gado/${gado.gado_id}/editar`}
                    className={cn(styles.gadoRow, styles.gadoRowLink)}
                    aria-label={`Editar cabeça de ${formatNumber(gado.peso_total)} kg do ${lote.nome_lote}`}
                  >
                    {conteudo}
                  </Link>
                );
              })}
            </div>
          )}
        </>
      ) : null}

      {relatorioError ? <p className="report-error">{relatorioError}</p> : null}
      {relatorioAvisos.map((aviso) => (
        <p key={aviso} className="report-notice">
          {aviso}
        </p>
      ))}

      <Fab
        icon={FileText}
        label="Gerar relatório"
        onClick={handleGerarRelatorio}
        disabled={gerandoRelatorio || !negocio || !sincronizado}
        disabledTitle={gerandoRelatorio ? "Gerando relatório..." : "Disponível após a sincronização"}
      />

      {/* Negócios "cabeca" não têm pesagem; sem lote não há onde registrar a cabeça. */}
      {negocio && !porCabeca && negocio.lotes.length > 0 ? (
        <Fab icon={Plus} label="Adicionar gado" href={`/negocios/${negocio.negocio_id}/gado/novo`} stacked />
      ) : null}
    </div>
  );
}
