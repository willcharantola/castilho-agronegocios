"use client";

import { LoteForm } from "@/components/lote-form";
import { criarLote, editarLote } from "@/lib/flows/operacoes-lote";
import type { NegocioComPendencias } from "@/lib/offline/pendentes";

/**
 * Modalidade "cabeca": formulário único do "Lote único" (quantidade, tipo de lote, gênero
 * e carimbo, com o valor por cabeça do próprio lote). Cria o lote na primeira vez e o edita depois — a API
 * grava o nome e o rendimento 100 sozinha.
 */
export function LoteUnicoForm({
  negocio,
  submitLabel,
  onSaved,
}: {
  negocio: NegocioComPendencias;
  submitLabel: string;
  onSaved: () => Promise<void> | void;
}) {
  const lote = negocio.lotes[0];
  return (
    <LoteForm
      key={lote?.lote_id ?? "novo"}
      modalidade="cabeca"
      lote={lote}
      submitLabel={submitLabel}
      onSubmit={async (input) => {
        if (lote) await editarLote(negocio, lote.lote_id, input);
        else await criarLote(negocio, input);
        await onSaved();
      }}
    />
  );
}
