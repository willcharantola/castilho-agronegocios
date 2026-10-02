"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { BackLink } from "@/components/back-link";
import { GadoForm, formValuesParaInput, gadoParaFormInput, type GadoFormValues } from "@/components/gado-form";
import { updateGado } from "@/lib/api/gados";
import { fetchNegocio } from "@/lib/api/negocios";
import { ApiError } from "@/lib/api-client";
import { MODALIDADE_LABELS } from "@/lib/labels";
import { cn } from "@/lib/utils";
import type { Gado, NegocioDetail } from "@/lib/api/types";
import styles from "../../gado-page.module.css";

export default function EditarGadoPage() {
  const params = useParams<{ id: string; gadoId: string }>();
  const router = useRouter();
  const [negocio, setNegocio] = React.useState<NegocioDetail | null>(null);
  const [gado, setGado] = React.useState<Gado | null>(null);
  const [loadError, setLoadError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    fetchNegocio(params.id)
      .then((negocioData) => {
        if (cancelled) return;
        // Negócios "cabeca" não têm gados individuais — não há o que editar.
        if (negocioData.modalidade === "cabeca") {
          setLoadError("Negócios por cabeça não possuem cadastro individual de gado.");
          return;
        }
        const encontrado = negocioData.gados.find((g) => g.gado_id === Number(params.gadoId));
        if (!encontrado) {
          setLoadError("Gado não encontrado neste negócio.");
          return;
        }
        setNegocio(negocioData);
        setGado(encontrado);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setLoadError(err instanceof ApiError || err instanceof Error ? err.message : "Erro ao carregar.");
      });
    return () => {
      cancelled = true;
    };
  }, [params.id, params.gadoId]);

  async function salvar(values: GadoFormValues) {
    await updateGado(params.gadoId, formValuesParaInput(values));
    router.push(`/negocios/${params.id}`);
  }

  return (
    <div className={cn(styles.page, "pt-safe")}>
      <BackLink href={`/negocios/${params.id}`} />
      <div>
        <h1 className={styles.title}>Editar Gado</h1>
        {negocio ? (
          <p className={styles.subtitle}>
            Modalidade: {MODALIDADE_LABELS[negocio.modalidade]} · Valores recalculados ao salvar
          </p>
        ) : null}
      </div>

      {!gado && !loadError ? <div className={cn(styles.state, "glass-panel")}>Carregando gado...</div> : null}
      {loadError ? <div className={cn(styles.state, styles.stateError, "glass-panel")}>{loadError}</div> : null}

      {negocio && gado ? (
        <GadoForm
          modalidade={negocio.modalidade}
          valorUnidade={negocio.valor_unidade}
          defaultValues={gadoParaFormInput(gado)}
          submitLabel="Salvar Alterações"
          submittingLabel="Salvando..."
          onSubmit={salvar}
        />
      ) : null}
    </div>
  );
}
