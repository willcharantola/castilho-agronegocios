"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { BackLink } from "@/components/back-link";
import { GadoForm } from "@/components/gado-form";
import { MODALIDADE_LABELS } from "@/lib/labels";
import { cadastrarGado } from "@/lib/flows/operacoes-lote";
import { useNegocioComPendencias } from "@/lib/flows/use-negocio-com-pendencias";
import { cn } from "@/lib/utils";
import styles from "../gado-page.module.css";

/** Adiciona uma cabeça (escolhendo o lote) a um negócio já existente. */
export default function AdicionarGadoPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { negocio, erro } = useNegocioComPendencias(Number(params.id));

  const aviso =
    negocio?.modalidade === "cabeca"
      ? "Negócios por cabeça não possuem pesagem individual."
      : negocio && negocio.lotes.length === 0
        ? "Cadastre um lote antes de registrar cabeças."
        : null;
  const cabecas = negocio?.lotes.reduce((soma, l) => soma + l.gados.length, 0) ?? 0;

  return (
    <div className={cn("page-container page-narrow", styles.page, "pt-safe")}>
      <BackLink href={`/negocios/${params.id}`} />
      <div>
        <h1 className="page-title">Adicionar Gado</h1>
        {negocio ? (
          <p className={styles.subtitle}>
            Modalidade: {MODALIDADE_LABELS[negocio.modalidade]} · {cabecas} cabeça(s) cadastrada(s)
          </p>
        ) : null}
      </div>

      {!negocio && !erro ? <div className="state-box glass-panel">Carregando negócio...</div> : null}
      {erro && !negocio ? <div className="state-box state-error glass-panel">{erro}</div> : null}
      {aviso ? <div className="state-box glass-panel">{aviso}</div> : null}

      {negocio && !aviso ? (
        <GadoForm
          modalidade={negocio.modalidade}
          tipoGado={negocio.tipo_gado}
          valorUnidade={negocio.valor_unidade}
          lotes={negocio.lotes}
          defaultValues={{ loteId: negocio.lotes.length === 1 ? negocio.lotes[0].lote_id : null }}
          submitLabel="Cadastrar"
          submittingLabel="Cadastrando..."
          onSubmit={async ({ loteId, pesoTotal }) => {
            const lote = negocio.lotes.find((l) => l.lote_id === loteId);
            if (!lote) throw new Error("Lote não encontrado.");
            // Sem conexão, a cabeça fica na fila e aparece no detalhe como pendente.
            await cadastrarGado(negocio, lote, pesoTotal);
            router.push(`/negocios/${params.id}`);
          }}
        />
      ) : null}
    </div>
  );
}
