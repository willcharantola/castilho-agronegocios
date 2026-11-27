"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { BackLink } from "@/components/back-link";
import { PesagemCabecas } from "@/components/pesagem/pesagem-cabecas";
import { useNegocioComPendencias } from "@/lib/flows/use-negocio-com-pendencias";
import { cn } from "@/lib/utils";
import styles from "../gado-page.module.css";

/**
 * Pesagem de um negócio já existente: a mesma tela do cadastro (passo 7). Cada "Cadastrar"
 * limpa o peso e mantém o lote, para continuar pesando; "Voltar ao negócio" sai.
 */
export default function AdicionarGadoPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { negocio, erro, recarregar } = useNegocioComPendencias(Number(params.id));
  const [ultimoLoteId, setUltimoLoteId] = React.useState<number | null>(null);
  const detalhe = `/negocios/${params.id}`;

  const aviso =
    negocio?.modalidade === "cabeca"
      ? "Negócios por cabeça não possuem pesagem individual."
      : negocio && negocio.lotes.length === 0
        ? "Cadastre um lote antes de registrar cabeças."
        : null;

  if (aviso) {
    return (
      <div className={cn("page-container page-narrow", styles.page, "pt-safe")}>
        <BackLink href={detalhe} />
        <h1 className="page-title">Pesagem</h1>
        <div className="state-box glass-panel">{aviso}</div>
      </div>
    );
  }

  return (
    <PesagemCabecas
      negocio={negocio}
      erro={erro}
      recarregar={recarregar}
      voltar={{ href: detalhe, label: "Negócio" }}
      ultimoLoteId={ultimoLoteId}
      onLoteUsado={setUltimoLoteId}
      acao={{ label: "Voltar ao negócio", onClick: () => router.push(detalhe) }}
    />
  );
}
