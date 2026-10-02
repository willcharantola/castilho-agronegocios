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
import type { NegocioDetail } from "@/lib/api/types";
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
    await createGado({ negocio_id: Number(params.id), ...formValuesParaInput(values) });
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
