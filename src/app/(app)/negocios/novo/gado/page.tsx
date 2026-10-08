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
import { useLiveQuery } from "dexie-react-hooks";
import { PendenteBadge } from "@/components/offline/pendente-badge";
import { estimarValoresGado } from "@/lib/calculo-gado";
import { offlineDb } from "@/lib/offline/db";
import { enviarOuEnfileirar, ehIdTemporario, referencia, type RegistroSalvo } from "@/lib/offline/fila";
import { comGadosPendentes, negocioDePendente, useGadosPendentes, type ExibicaoNegocio } from "@/lib/offline/pendentes";
import { horaLocalAtual, mensagemDeErro } from "@/lib/offline/rede";
import { MODALIDADE_LABELS } from "@/lib/labels";
import { useNegocioFlow } from "@/lib/flows/negocio-flow";
import { cn } from "@/lib/utils";
import type { CreateGadoInput, Gado, NegocioDetail, Modalidade } from "@/lib/api/types";
import styles from "./page.module.css";

/** Negócio criado offline (ainda só no aparelho) no formato usado por esta tela. */
function negocioLocal(registro: RegistroSalvo): NegocioDetail {
  const e = registro.exibicao as ExibicaoNegocio;
  return {
    ...negocioDePendente(registro),
    gados: [],
    vendedor: { nome_vendedor: e.vendedorNome } as NegocioDetail["vendedor"],
    comprador: { nome_empresa: e.compradorNome } as NegocioDetail["comprador"],
  };
}

export default function NovoNegocioGadoPage() {
  const router = useRouter();
  const { data, update, reset } = useNegocioFlow();
  const [negocioServidor, setNegocio] = React.useState<NegocioDetail | null>(null);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [concluindo, setConcluindo] = React.useState(false);
  const [concluirError, setConcluirError] = React.useState<string | null>(null);
  const [gadoEmEdicao, setGadoEmEdicao] = React.useState<Gado | null>(null);

  // Negócio criado offline: id negativo, lido da fila local (atualiza sozinho).
  const negocioOffline = ehIdTemporario(data.negocioId);
  const local = useLiveQuery(
    async () => {
      if (!data.negocioId || !negocioOffline) return null;
      const registro = await offlineDb.pendentes.get(-data.negocioId);
      const mapeado = registro
        ? undefined
        : await offlineDb.mapeamentos.where("idLocal").equals(-data.negocioId).first();
      return { registro: registro as RegistroSalvo | undefined, idReal: mapeado?.idReal };
    },
    [data.negocioId, negocioOffline]
  );

  // Se o negócio foi sincronizado enquanto esta tela estava aberta, passa a usar o id real.
  React.useEffect(() => {
    if (local?.idReal) update({ negocioId: local.idReal });
  }, [local?.idReal, update]);

  const gadosPendentes = useGadosPendentes(data.negocioId);
  const negocioBase = negocioOffline ? (local?.registro ? negocioLocal(local.registro) : null) : negocioServidor;
  const negocio = React.useMemo(
    () => (negocioBase ? comGadosPendentes(negocioBase, gadosPendentes) : null),
    [negocioBase, gadosPendentes]
  );

  const carregarNegocio = React.useCallback(() => {
    if (!data.negocioId || ehIdTemporario(data.negocioId)) return Promise.resolve();
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
  }, [data.negocioId]);

  const modalidade = negocio?.modalidade;

  // "cabeca" não tem cadastro individual de gado — tem tela própria.
  React.useEffect(() => {
    if (modalidade === "cabeca") router.replace("/negocios/novo/quantidade-cabecas");
  }, [modalidade, router]);

  async function cadastrar(values: GadoFormValues) {
    if (!data.negocioId || !negocio) return;
    const input = formValuesParaInput(values);
    const estimado = estimarValoresGado(negocio.modalidade, input.peso_total, input.rendimento_carcaca, negocio.valor_unidade);
    // Sem conexão (ou com o negócio ainda só no aparelho), o gado vai para a fila com a
    // hora da pesagem capturada agora no aparelho — a sincronização pode ser bem depois.
    const envio = await enviarOuEnfileirar(
      "gado",
      { ...(await referencia("negocio", data.negocioId)), ...input },
      (payload, uuid) => createGado({ ...(payload as CreateGadoInput), uuid_origem: uuid }),
      {
        exibicao: {
          negocio_id: data.negocioId,
          peso_calculo: estimado.pesoCalculo,
          peso_arroba: estimado.pesoArroba,
          valor_total: estimado.valorTotal,
        },
        extrasFila: { horario_pesagem: horaLocalAtual() },
      }
    );
    if (envio.sincronizado) await carregarNegocio();
  }

  async function concluir() {
    const negocioId = data.negocioId;
    if (!negocioId) return;
    setConcluirError(null);
    setConcluindo(true);
    let sincronizado: boolean;
    try {
      // Registra hora_fim_pesagem (hora local do cliente) antes de sair do fluxo. Offline,
      // a conclusão vai para a fila com a hora capturada agora no aparelho.
      const envio = await enviarOuEnfileirar(
        "conclusao",
        await referencia("negocio", negocioId),
        (payload) => concluirNegocio(payload.negocio_id as number),
        { extrasFila: { hora_fim_pesagem: horaLocalAtual() } }
      );
      sincronizado = envio.sincronizado;
    } catch (err) {
      setConcluirError(mensagemDeErro(err, "Erro ao concluir."));
      setConcluindo(false);
      return;
    }
    reset();
    // Offline, a tela de detalhe (/negocios/[id]) pode não estar salva no aparelho: volta
    // para a listagem, que mostra o negócio e os gados como pendentes de sincronização.
    router.push(sincronizado ? `/negocios/${negocioId}` : "/negocios");
  }

  if (!data.negocioId) return null;

  return (
    <div className={cn(styles.page, "pt-safe")}>
      <BackLink
        href={ehIdTemporario(data.negocioId) ? "/negocios" : `/negocios/${data.negocioId}`}
        label={ehIdTemporario(data.negocioId) ? "Negócios" : "Ver negócio"}
      />
    

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
                      {gado.pendente ? <PendenteBadge pendente={gado.pendente} /> : null}
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
