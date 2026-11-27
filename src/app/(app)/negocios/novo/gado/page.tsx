"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { PesagemCabecas } from "@/components/pesagem/pesagem-cabecas";
import { useNegocioFlow } from "@/lib/flows/negocio-flow";
import { useNegocioComPendencias } from "@/lib/flows/use-negocio-com-pendencias";

/** Passo 7 (modalidades "arroba" e "kg"): pesagem das cabeças, cada uma num lote. */
export default function NovoNegocioGadoPage() {
  const router = useRouter();
  const { data, update } = useNegocioFlow();
  const { negocio, erro, recarregar, idReal } = useNegocioComPendencias(data.negocioId);

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

  if (!data.negocioId) return null;

  return (
    <PesagemCabecas
      negocio={negocio}
      erro={erro}
      recarregar={recarregar}
      voltar={{ href: "/negocios/novo/lotes", label: "Lotes" }}
      fazendaNome={data.fazendaNome}
      compradorNome={data.compradorNome}
      ultimoLoteId={data.ultimoLoteId}
      onLoteUsado={(loteId) => update({ ultimoLoteId: loteId })}
      acao={{ label: "Revisar e concluir", onClick: () => router.push("/negocios/novo/revisao") }}
    />
  );
}
