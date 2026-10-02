"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Beef, Pencil, Warehouse } from "lucide-react";
import { BackLink } from "@/components/back-link";
import { ProgressSteps } from "@/components/progress-steps";
import { Button } from "@/components/ui/button";
import { GadoForm, formValuesParaInput, type GadoFormValues } from "@/components/gado-form";
import { GadoEditDialog } from "@/components/gado-edit-dialog";
import { formatCurrency, formatNumber, formatGenero } from "@/lib/format";
import { createGado } from "@/lib/api/gados";
import { concluirNegocio, fetchNegocio } from "@/lib/api/negocios";
import { ApiError } from "@/lib/api-client";
import { MODALIDADE_LABELS } from "@/lib/labels";
import { useNegocioFlow } from "@/lib/flows/negocio-flow";
import { cn } from "@/lib/utils";
import type { Gado, NegocioDetail, Modalidade } from "@/lib/api/types";
import styles from "./page.module.css";

export default function NovoNegocioGadoPage() {
  const router = useRouter();
  const { data, reset } = useNegocioFlow();
  const [negocio, setNegocio] = React.useState<NegocioDetail | null>(null);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [concluindo, setConcluindo] = React.useState(false);
  const [concluirError, setConcluirError] = React.useState<string | null>(null);
  const [gadoEmEdicao, setGadoEmEdicao] = React.useState<Gado | null>(null);

  const carregarNegocio = React.useCallback(() => {
    if (!data.negocioId) return Promise.resolve();
    return fetchNegocio(data.negocioId)
      .then(setNegocio)
      .catch((err: unknown) => {
        setLoadError(err instanceof ApiError || err instanceof Error ? err.message : "Erro ao carregar.");
      });
  }, [data.negocioId]);

  // Guarda o valor visto na primeira renderização — `concluir()` zera
  // `data.negocioId` de propósito antes de navegar para longe, e não
  // queremos que isso dispare este redirecionamento de volta ao passo 1.
  const negocioIdRef = React.useRef(data.negocioId);
  React.useEffect(() => {
    if (!negocioIdRef.current) {
      router.replace("/negocios/novo");
      return;
    }
    carregarNegocio();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const modalidade = negocio?.modalidade;

  // "cabeca" não tem cadastro individual de gado — tem tela própria.
  React.useEffect(() => {
    if (modalidade === "cabeca") router.replace("/negocios/novo/quantidade-cabecas");
  }, [modalidade, router]);

  async function cadastrar(values: GadoFormValues) {
    if (!data.negocioId) return;
    await createGado({ negocio_id: data.negocioId, ...formValuesParaInput(values) });
    await carregarNegocio();
  }

  async function concluir() {
    const negocioId = data.negocioId;
    if (!negocioId) return;
    setConcluirError(null);
    setConcluindo(true);
    try {
      // Registra hora_fim_pesagem (hora local do cliente) antes de sair do fluxo.
      await concluirNegocio(negocioId);
    } catch (err) {
      setConcluirError(err instanceof ApiError || err instanceof Error ? err.message : "Erro ao concluir.");
      setConcluindo(false);
      return;
    }
    reset();
    router.push(`/negocios/${negocioId}`);
  }

  if (!data.negocioId) return null;

  return (
    <div className={cn(styles.page, "pt-safe")}>
      <BackLink href={`/negocios/${data.negocioId}`} label="Ver negócio" />
      <h1 className={styles.title}>Cadastrar Novo Negócio</h1>
      <ProgressSteps current={6} total={6} />

      {loadError ? <div className={cn(styles.state, styles.stateError, "glass-panel")}>{loadError}</div> : null}

      {negocio ? (
        <div className={cn(styles.summary, "glass-dark")}>
          <div className={styles.summaryHeader}>
            <span className={styles.summaryIcon}>
              <Warehouse size={18} />
            </span>
            <div>
              <p className={styles.summaryFarm}>Fazenda {data.fazendaNome}</p>
              <p className={styles.summarySeller}>Vendedor: {negocio.vendedor.nome_vendedor}</p>
              <p className={styles.summarySeller}>Comprador: {negocio.comprador.nome_empresa}</p>
            </div>
          </div>
          <div className={styles.summaryStats}>
            <div>
              <p className={styles.summaryStatLabel}>Valor p/ Un.</p>
              <p className={styles.summaryStatValue}>{formatCurrency(negocio.valor_unidade)}</p>
            </div>
            <div>
              <p className={styles.summaryStatLabel}>Modalidade</p>
              <p className={styles.summaryStatValue}>{MODALIDADE_LABELS[negocio.modalidade as Modalidade]}</p>
            </div>
          </div>
          <div className={styles.summaryFooter}>
            <span>
              Cabeças: <b>{negocio.qtd_animais ?? negocio.gados.length}</b>
            </span>
            <span>
              Valor médio p/ cabeça:{" "}
              <b>{negocio.valor_medio !== null ? formatCurrency(negocio.valor_medio) : "—"}</b>
            </span>
          </div>
        </div>
      ) : null}

      {negocio && modalidade !== "cabeca" ? (
        <GadoForm
          modalidade={negocio.modalidade}
          valorUnidade={negocio.valor_unidade}
          submitLabel="Cadastrar"
          submittingLabel="Cadastrando..."
          resetAfterSubmit
          onSubmit={cadastrar}
        />
      ) : null}

      {negocio ? (
        <div className={styles.sessionList}>
          {negocio.gados.length > 0 ? (
            <>
              <p className={styles.sessionTitle}>Gado cadastrado neste negócio (toque para editar)</p>
              <div className={styles.sessionItems}>
                {negocio.gados.map((gado) => (
                  <button
                    key={gado.gado_id}
                    type="button"
                    className={styles.sessionRow}
                    onClick={() => setGadoEmEdicao(gado)}
                    aria-label={`Editar ${gado.denominacao}`}
                  >
                    <span className={styles.sessionIcon}>
                      <Beef size={18} />
                    </span>
                    <div className={styles.sessionInfo}>
                      <p className={styles.sessionName}>{gado.denominacao}</p>
                      <p className={styles.sessionMeta}>
                        {formatGenero(gado.genero)} · Peso p/ cálculo: {formatNumber(gado.peso_calculo)}
                      </p>
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
          {concluirError ? <p className={styles.submitError}>{concluirError}</p> : null}
          <Button
            type="button"
            variant="ghost"
            size="xl"
            className={styles.finishButton}
            onClick={concluir}
            disabled={concluindo}
          >
            {concluindo ? "Concluindo..." : "Concluir"}
          </Button>
        </div>
      ) : null}

      {negocio ? (
        <GadoEditDialog
          gado={gadoEmEdicao}
          modalidade={negocio.modalidade}
          valorUnidade={negocio.valor_unidade}
          onClose={() => setGadoEmEdicao(null)}
          onSaved={carregarNegocio}
        />
      ) : null}
    </div>
  );
}
