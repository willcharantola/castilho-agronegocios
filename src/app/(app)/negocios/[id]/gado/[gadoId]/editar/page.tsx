"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { BackLink } from "@/components/back-link";
import { GadoForm } from "@/components/gado-form";
import { MODALIDADE_LABELS } from "@/lib/labels";
import { editarGado } from "@/lib/flows/operacoes-lote";
import { useNegocioComPendencias } from "@/lib/flows/use-negocio-com-pendencias";
import { cn } from "@/lib/utils";
import styles from "../../gado-page.module.css";

/** Edita peso e lote de uma cabeça — trocar de lote recalcula os dois lotes envolvidos. */
export default function EditarGadoPage() {
  const params = useParams<{ id: string; gadoId: string }>();
  const router = useRouter();
  const { negocio, erro } = useNegocioComPendencias(Number(params.id));
  const gado = negocio?.lotes.flatMap((l) => l.gados).find((g) => g.gado_id === Number(params.gadoId));

  const aviso =
    negocio?.modalidade === "cabeca"
      ? "Negócios por cabeça não possuem pesagem individual."
      : negocio && !gado
        ? "Cabeça não encontrada neste negócio."
        : null;

  return (
    <div className={cn("page-container page-narrow", styles.page, "pt-safe")}>
      <BackLink href={`/negocios/${params.id}`} />
      <div>
        <h1 className="page-title">Editar Gado</h1>
        {negocio ? (
          <p className={styles.subtitle}>
            Modalidade: {MODALIDADE_LABELS[negocio.modalidade]} · Valores recalculados ao salvar
          </p>
        ) : null}
      </div>

      {!negocio && !erro ? <div className="state-box glass-panel">Carregando gado...</div> : null}
      {erro && !negocio ? <div className="state-box state-error glass-panel">{erro}</div> : null}
      {aviso ? <div className="state-box state-error glass-panel">{aviso}</div> : null}

      {negocio && gado && !aviso ? (
        <GadoForm
          modalidade={negocio.modalidade}
          tipoGado={negocio.tipo_gado}
          lotes={negocio.lotes}
          defaultValues={{ loteId: gado.lote_id, pesoTotal: gado.peso_total }}
          submitLabel="Salvar Alterações"
          submittingLabel="Salvando..."
          onSubmit={async ({ loteId, pesoTotal }) => {
            const lote = negocio.lotes.find((l) => l.lote_id === loteId);
            if (!lote) throw new Error("Lote não encontrado.");
            await editarGado(negocio, gado.gado_id, lote, pesoTotal);
            router.push(`/negocios/${params.id}`);
          }}
        />
      ) : null}
    </div>
  );
}
