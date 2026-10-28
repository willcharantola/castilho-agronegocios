"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { BackLink } from "@/components/back-link";
import { RendimentosForm } from "@/components/rendimentos-form";
import { fetchNegocio, updateNegocio } from "@/lib/api/negocios";
import { ApiError } from "@/lib/api-client";
import { enviarOuEnfileirar } from "@/lib/offline/fila";
import { cn } from "@/lib/utils";
import type { NegocioDetail } from "@/lib/api/types";
import styles from "../gado/gado-page.module.css";

/**
 * Reabre a tela de rendimentos por categoria de um negócio "arroba". Ao salvar, a API
 * recalcula todas as cabeças (peso p/ cálculo, arroba e valor) e os totais do negócio.
 */
export default function EditarRendimentosPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [negocio, setNegocio] = React.useState<NegocioDetail | null>(null);
  const [loadError, setLoadError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    fetchNegocio(params.id)
      .then((negocioData) => {
        if (cancelled) return;
        if (negocioData.modalidade !== "arroba") {
          setLoadError("Rendimentos por categoria só se aplicam à modalidade por arroba.");
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

  return (
    <div className={cn("page-container page-narrow", styles.page, "pt-safe")}>
      <BackLink href={`/negocios/${params.id}`} />
      <div>
        <h1 className="page-title">Editar rendimentos</h1>
        {negocio ? (
          <p className={styles.subtitle}>
            {negocio.gados.length} cabeça(s) serão recalculadas ao salvar
          </p>
        ) : null}
      </div>

      {!negocio && !loadError ? <div className="state-box glass-panel">Carregando negócio...</div> : null}
      {loadError ? <div className="state-box state-error glass-panel">{loadError}</div> : null}

      {negocio ? (
        <RendimentosForm
          defaultValues={negocio}
          submitLabel="Salvar rendimentos"
          submittingLabel="Salvando..."
          onSubmit={async (rendimentos) => {
            // Sem conexão, a alteração vai para a fila e é aplicada na sincronização.
            await enviarOuEnfileirar(
              "negocio_atualizacao",
              { negocio_id: negocio.negocio_id, ...rendimentos },
              ({ negocio_id, ...campos }) => updateNegocio(negocio_id as number, campos)
            );
            router.push(`/negocios/${negocio.negocio_id}`);
          }}
        />
      ) : null}
    </div>
  );
}
