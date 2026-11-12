"use client";

import * as React from "react";
import { Beef } from "lucide-react";
import { useAviso } from "@/components/aviso";
import { BackLink } from "@/components/back-link";
import { GadoForm, type LoteDoGadoForm } from "@/components/gado-form";
import { PendenteBadge } from "@/components/offline/pendente-badge";
import { Button } from "@/components/ui/button";
import { fetchNegocioPesagem } from "@/lib/api/negocios";
import type { NegocioPesagem } from "@/lib/api/types";
import { concluirPesagem, lancarPesagem } from "@/lib/flows/pesagem";
import { formatDate, formatFazenda, formatHora, formatNumber } from "@/lib/format";
import { MODALIDADE_LABELS } from "@/lib/labels";
import { usePendentes, useVersaoSincronizacao } from "@/lib/offline/fila";
import { gadoDePendente, type ExibicaoGado } from "@/lib/offline/pendentes";
import { mensagemDeErro } from "@/lib/offline/rede";
import { cn } from "@/lib/utils";
import styles from "./pesagens.module.css";

/**
 * Pesagem de um negócio liberado para o usuário responsável: escolhe o lote e lança o peso.
 * Sem valores, comprador ou comissão (a API nem os envia). Sem conexão, as cabeças ficam
 * na fila e aparecem aqui como pendentes.
 */
export function PesagemNegocio({ negocioId }: { negocioId: number }) {
  const avisar = useAviso();
  const versaoSincronizacao = useVersaoSincronizacao();
  const [negocio, setNegocio] = React.useState<NegocioPesagem | null>(null);
  const [erro, setErro] = React.useState<string | null>(null);
  const [concluindo, setConcluindo] = React.useState(false);

  const recarregar = React.useCallback(async () => {
    try {
      setNegocio(await fetchNegocioPesagem(negocioId));
      setErro(null);
    } catch (err) {
      setErro(mensagemDeErro(err, "Erro ao carregar o negócio."));
    }
  }, [negocioId]);

  React.useEffect(() => {
    // Busca ao abrir e depois de cada sincronização da fila.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    recarregar();
  }, [recarregar, versaoSincronizacao]);

  // Cabeças deste negócio ainda na fila offline.
  const gadosNaFila = usePendentes("gado");
  const pendentes = React.useMemo(
    () =>
      gadosNaFila.filter((r) => (r.exibicao as ExibicaoGado | undefined)?.negocio_id === negocioId).map(gadoDePendente),
    [gadosNaFila, negocioId],
  );

  const lotesDoForm: LoteDoGadoForm[] = negocio?.lotes ?? [];
  const nomeDoLote = (loteId: number) => negocio?.lotes.find((l) => l.lote_id === loteId)?.nome_lote ?? "Lote";
  const cabecas = [
    ...pendentes,
    ...(negocio?.lotes.flatMap((l) => l.gados).sort((a, b) => b.gado_id - a.gado_id) ?? []).map((g) => ({
      ...g,
      pendente: undefined,
    })),
  ];

  const aviso =
    negocio?.modalidade === "cabeca"
      ? "Negócios por cabeça não possuem pesagem individual."
      : negocio && negocio.lotes.length === 0
        ? "Este negócio ainda não tem lotes. Fale com o administrador."
        : null;

  async function concluir() {
    if (!negocio) return;
    setConcluindo(true);
    try {
      const enviado = await concluirPesagem(negocio.negocio_id);
      avisar(
        enviado ? "Pesagem concluída." : "Pesagem concluída no aparelho. Ela será enviada quando houver conexão.",
        "sucesso",
      );
      if (enviado) await recarregar();
    } catch (err) {
      avisar(mensagemDeErro(err, "Erro ao concluir a pesagem."), "aviso");
    } finally {
      setConcluindo(false);
    }
  }

  return (
    <div className={cn("page-container page-narrow", styles.page, "pt-safe")}>
      <BackLink href="/negocios" />
      <div>
        <h1 className="page-title">Pesagem</h1>
        {negocio ? (
          <p className={styles.subtitle}>
            {formatFazenda(negocio.nome_fazenda)} · {negocio.nome_pecuarista} · {formatDate(negocio.data_negocio)}
            <br />
            Modalidade: {MODALIDADE_LABELS[negocio.modalidade]} · {cabecas.length} cabeça(s) pesada(s)
          </p>
        ) : null}
      </div>

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
      {aviso ? <div className="state-box glass-panel">{aviso}</div> : null}

      {negocio && !aviso ? (
        <GadoForm
          modalidade={negocio.modalidade}
          tipoGado={negocio.tipo_gado}
          lotes={lotesDoForm}
          defaultValues={{ loteId: negocio.lotes.length === 1 ? negocio.lotes[0].lote_id : null }}
          submitLabel="Lançar peso"
          submittingLabel="Lançando..."
          resetAfterSubmit
          semValores
          onSubmit={async ({ loteId, pesoTotal }) => {
            const lote = negocio.lotes.find((l) => l.lote_id === loteId);
            if (!lote) throw new Error("Lote não encontrado.");
            const enviado = await lancarPesagem(negocio, lote, pesoTotal);
            if (enviado) await recarregar();
          }}
        />
      ) : null}

      {negocio && !aviso ? (
        <section className={styles.secao} aria-label="Cabeças pesadas">
          <h2 className={styles.secaoTitulo}>Cabeças pesadas</h2>
          {cabecas.length === 0 ? (
            <div className="state-box glass-panel">Nenhuma cabeça pesada ainda.</div>
          ) : (
            <div className={styles.lista}>
              {cabecas.map((gado) => (
                <div key={gado.gado_id} className={styles.linha}>
                  <span className="card-icon">
                    <Beef size={18} />
                  </span>
                  <div className={styles.linhaInfo}>
                    <p className={styles.linhaTitulo}>{nomeDoLote(gado.lote_id)}</p>
                    <p className={styles.linhaMeta}>
                      {gado.horario_pesagem ? `Pesado às ${formatHora(gado.horario_pesagem)}` : null}
                    </p>
                    {gado.pendente ? <PendenteBadge pendente={gado.pendente} /> : null}
                  </div>
                  <span className={styles.peso}>{formatNumber(gado.peso_total)} kg</span>
                </div>
              ))}
            </div>
          )}

          {negocio.hora_fim_pesagem ? (
            <p className={styles.concluido}>Pesagem concluída às {formatHora(negocio.hora_fim_pesagem)}.</p>
          ) : null}
          <Button
            type="button"
            variant="brand-secondary"
            className={styles.concluir}
            onClick={concluir}
            disabled={concluindo || cabecas.length === 0}
          >
            {concluindo ? "Concluindo..." : "Concluir pesagem"}
          </Button>
        </section>
      ) : null}
    </div>
  );
}
