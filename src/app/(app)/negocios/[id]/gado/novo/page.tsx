"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { BackLink } from "@/components/back-link";
import { GadoForm, formValuesParaInput, type GadoFormValues } from "@/components/gado-form";
import { createGado } from "@/lib/api/gados";
import { fetchNegocio } from "@/lib/api/negocios";
import { ApiError } from "@/lib/api-client";
import { MODALIDADE_LABELS } from "@/lib/labels";
import { cn } from "@/lib/utils";
import type { CreateGadoInput, NegocioDetail } from "@/lib/api/types";
import { estimarValoresGado } from "@/lib/calculo-gado";
import { enviarOuEnfileirar } from "@/lib/offline/fila";
import { horaLocalAtual } from "@/lib/offline/rede";
import styles from "../gado-page.module.css";

/** Adiciona um gado a um negócio já existente e volta para o detalhe do negócio. */
export default function AdicionarGadoPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [negocio, setNegocio] = React.useState<NegocioDetail | null>(null);
  const [loadError, setLoadError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    fetchNegocio(params.id)
      .then((negocioData) => {
        if (cancelled) return;
        if (negocioData.modalidade === "cabeca") {
          setLoadError("Negócios por cabeça não possuem cadastro individual de gado.");
          return;
        }
        setNegocio(negocioData);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setLoadError(err instanceof ApiError || err instanceof Error ? err.message : "Erro ao carregar.");
      });
    return () => {
      cancelled = true;
    };
  }, [params.id]);

  async function cadastrar(values: GadoFormValues) {
    if (!negocio) return;
    const input = formValuesParaInput(values);
    const estimado = estimarValoresGado(negocio.modalidade, input.peso_total, input.rendimento_carcaca, negocio.valor_unidade);
    // Sem conexão, o gado fica na fila (com a hora da pesagem do aparelho) e aparece no
    // detalhe do negócio como pendente de sincronização.
    await enviarOuEnfileirar(
      "gado",
      { negocio_id: negocio.negocio_id, ...input },
      (payload, uuid) => createGado({ ...(payload as CreateGadoInput), uuid_origem: uuid }),
      {
        exibicao: {
          negocio_id: negocio.negocio_id,
          peso_calculo: estimado.pesoCalculo,
          peso_arroba: estimado.pesoArroba,
          valor_total: estimado.valorTotal,
        },
        extrasFila: { horario_pesagem: horaLocalAtual() },
      }
    );
    router.push(`/negocios/${params.id}`);
  }

  return (
    <div className={cn(styles.page, "pt-safe")}>
      <BackLink href={`/negocios/${params.id}`} />
      <div>
        <h1 className={styles.title}>Adicionar Gado</h1>
        {negocio ? (
          <p className={styles.subtitle}>
            Modalidade: {MODALIDADE_LABELS[negocio.modalidade]} · {negocio.gados.length} cabeça(s) cadastrada(s)
          </p>
        ) : null}
      </div>

      {!negocio && !loadError ? <div className={cn(styles.state, "glass-panel")}>Carregando negócio...</div> : null}
      {loadError ? <div className={cn(styles.state, styles.stateError, "glass-panel")}>{loadError}</div> : null}

      {negocio ? (
        <GadoForm
          modalidade={negocio.modalidade}
          valorUnidade={negocio.valor_unidade}
          submitLabel="Cadastrar"
          submittingLabel="Cadastrando..."
          onSubmit={cadastrar}
        />
      ) : null}
    </div>
  );
}
