"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Beef, Pencil, Warehouse } from "lucide-react";
import { BackLink } from "@/components/back-link";
import { ProgressSteps } from "@/components/progress-steps";
import { Button } from "@/components/ui/button";
import { GadoForm } from "@/components/gado-form";
import { GadoEditDialog } from "@/components/gado-edit-dialog";
import { PendenteBadge } from "@/components/offline/pendente-badge";
import { formatCurrency, formatNumber } from "@/lib/format";
import { MODALIDADE_LABELS } from "@/lib/labels";
import { cadastrarGado } from "@/lib/flows/operacoes-lote";
import { PASSOS_NOVO_NEGOCIO, useNegocioFlow } from "@/lib/flows/negocio-flow";
import { useNegocioComPendencias } from "@/lib/flows/use-negocio-com-pendencias";
import { cn } from "@/lib/utils";
import type { Gado } from "@/lib/api/types";
import styles from "./page.module.css";

/** Passo 7 (modalidades "arroba" e "kg"): pesagem das cabeças, cada uma num lote. */
export default function NovoNegocioGadoPage() {
  const router = useRouter();
  const { data, update } = useNegocioFlow();
  const { negocio, erro, recarregar, idReal } = useNegocioComPendencias(data.negocioId);
  const [gadoEmEdicao, setGadoEmEdicao] = React.useState<Gado | null>(null);

  React.useEffect(() => {
    if (!data.negocioId) router.replace("/negocios/novo/informacoes");
  }, [data.negocioId, router]);

  React.useEffect(() => {
    if (idReal) update({ negocioId: idReal });
  }, [idReal, update]);

  const modalidade = negocio?.modalidade;
  React.useEffect(() => {
    // "cabeca" não tem pesagem; sem lotes não há onde registrar a cabeça.
    if (modalidade === "cabeca") router.replace("/negocios/novo/lote-unico");
    else if (negocio && negocio.lotes.length === 0) router.replace("/negocios/novo/lotes");
  }, [modalidade, negocio, router]);

  const cabecas = React.useMemo(
    () =>
      (negocio?.lotes ?? [])
        .flatMap((lote) => lote.gados.map((gado) => ({ gado, nomeLote: lote.nome_lote })))
        // Mais recente primeiro (a última pesagem logo abaixo do formulário): as ainda na
        // fila (id negativo) são as mais novas; ids locais e reais não se comparam entre si.
        .sort(
          (a, b) =>
            Number(b.gado.gado_id < 0) - Number(a.gado.gado_id < 0) ||
            Math.abs(b.gado.gado_id) - Math.abs(a.gado.gado_id)
        ),
    [negocio]
  );

  if (!data.negocioId) return null;

  return (
    <div className={cn("page-narrow", styles.page, "pt-safe")}>
      <BackLink href="/negocios/novo/lotes" label="Lotes" />
      <ProgressSteps current={7} total={PASSOS_NOVO_NEGOCIO} />

      {erro && !negocio ? <div className="state-box state-error glass-panel">{erro}</div> : null}

      {negocio ? (
        <div className={cn(styles.summary, "glass-dark")}>
          <div className="card-header">
            <span className="card-icon-on-dark">
              <Warehouse size={18} />
            </span>
            <div>
              <p className={styles.summaryFarm}>{data.fazendaNome}</p>
              <p className="card-meta-on-dark">Pecuarista: {negocio.pecuarista.nome_pecuarista}</p>
              <p className="card-meta-on-dark">Comprador: {negocio.comprador.nome_empresa}</p>
            </div>
          </div>
          <div className={styles.summaryStats}>
            <div>
              <p className={styles.summaryStatLabel}>Modalidade</p>
              <p className={styles.summaryStatValue}>{MODALIDADE_LABELS[negocio.modalidade]}</p>
            </div>
            <div>
              <p className={styles.summaryStatLabel}>Lotes</p>
              <p className={styles.summaryStatValue}>{negocio.lotes.length}</p>
            </div>
          </div>
          <div className={styles.summaryFooter}>
            <span>
              Cabeças: <b>{cabecas.length}</b>
            </span>
            <span>
              Valor total: <b>{negocio.valor_total !== null ? formatCurrency(negocio.valor_total) : "—"}</b>
            </span>
          </div>
        </div>
      ) : null}

      {negocio && negocio.lotes.length > 0 && negocio.modalidade !== "cabeca" ? (
        <GadoForm
          // Remonta quando a lista de lotes muda (ex.: lote sincronizado ganhou id real).
          key={negocio.lotes.map((l) => l.lote_id).join(",")}
          modalidade={negocio.modalidade}
          lotes={negocio.lotes}
          defaultValues={{ loteId: data.ultimoLoteId ?? (negocio.lotes.length === 1 ? negocio.lotes[0].lote_id : null) }}
          submitLabel="Cadastrar"
          submittingLabel="Cadastrando..."
          resetAfterSubmit
          onSubmit={async ({ loteId, pesoTotal }) => {
            const lote = negocio.lotes.find((l) => l.lote_id === loteId);
            if (!lote) throw new Error("Lote não encontrado.");
            const sincronizado = await cadastrarGado(negocio, lote, pesoTotal);
            update({ ultimoLoteId: loteId });
            if (sincronizado) await recarregar();
          }}
        />
      ) : null}

      {negocio ? (
        <div className={styles.sessionList}>
          {cabecas.length > 0 ? (
            <>
              <p className="section-title">Cabeças cadastradas</p>
              <div className={styles.sessionItems}>
                {cabecas.map(({ gado, nomeLote }) => (
                  <button
                    key={gado.gado_id}
                    type="button"
                    className={styles.sessionRow}
                    onClick={() => setGadoEmEdicao(gado)}
                    aria-label={`Editar cabeça de ${formatNumber(gado.peso_total)} kg do lote ${nomeLote}`}
                  >
                    <span className={styles.sessionIcon}>
                      <Beef size={18} />
                    </span>
                    <div className={styles.sessionInfo}>
                      <p className={styles.sessionName}>{nomeLote}</p>
                      <p className={styles.sessionMeta}>
                        Peso: {formatNumber(gado.peso_total)} kg · Arrobas: {formatNumber(gado.peso_arroba)}
                      </p>
                      {"pendente" in gado && gado.pendente ? <PendenteBadge pendente={gado.pendente} /> : null}
                    </div>
                    <div className={styles.sessionAmount}>
                      <p className={styles.sessionAmountValue}>
                        {gado.valor_total !== null ? formatCurrency(gado.valor_total) : "—"}
                      </p>
                    </div>
                    <Pencil size={16} className={styles.sessionEditIcon} aria-hidden />
                  </button>
                ))}
              </div>
            </>
          ) : null}
          <Button
            type="button"
            variant="ghost"
            size="xl"
            className={styles.finishButton}
            onClick={() => router.push("/negocios/novo/revisao")}
          >
            Revisar e concluir
          </Button>
        </div>
      ) : null}

      {negocio ? (
        <GadoEditDialog
          gado={gadoEmEdicao}
          negocio={negocio}
          lotes={negocio.lotes}
          onClose={() => setGadoEmEdicao(null)}
          onSaved={recarregar}
        />
      ) : null}
    </div>
  );
}
