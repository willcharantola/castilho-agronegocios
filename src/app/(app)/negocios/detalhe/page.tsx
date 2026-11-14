"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { NegocioDetalhe } from "../[id]/negocio-detalhe";

/**
 * Tela do negócio com o id na query (/negocios/detalhe?id=…). Diferente de /negocios/[id],
 * é uma rota fixa, salva no aparelho na instalação do app: abre offline também os negócios
 * criados sem internet (id temporário), ainda não sincronizados. Ver hrefNegocio.
 */
function NegocioDetalhePorQuery() {
  const id = Number(useSearchParams().get("id"));
  if (!Number.isInteger(id) || id === 0) {
    return <div className="state-box state-error glass-panel">Negócio não encontrado.</div>;
  }
  return <NegocioDetalhe negocioId={id} />;
}

export default function NegocioDetalhePage() {
  return (
    <React.Suspense>
      <NegocioDetalhePorQuery />
    </React.Suspense>
  );
}
