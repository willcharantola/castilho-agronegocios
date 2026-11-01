"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Warehouse } from "lucide-react";
import { BackLink } from "@/components/back-link";
import { LoteUnicoForm } from "@/components/lote-unico-form";
import { ProgressSteps } from "@/components/progress-steps";
import { PASSOS_NOVO_NEGOCIO, useNegocioFlow } from "@/lib/flows/negocio-flow";
import { useNegocioComPendencias } from "@/lib/flows/use-negocio-com-pendencias";
import { cn } from "@/lib/utils";
import styles from "./page.module.css";

/**
 * Passo 6 da modalidade "cabeca": sem lista de lotes nem pesagem — um único formulário
 * que cria (ou atualiza) o "Lote único". Depois segue direto para a revisão.
 */
export default function NovoNegocioLoteUnicoPage() {
  const router = useRouter();
  const { data, update } = useNegocioFlow();
  const { negocio, erro, recarregar, idReal } = useNegocioComPendencias(data.negocioId);

  React.useEffect(() => {
    if (!data.negocioId) router.replace("/negocios/novo/informacoes");
    else if (data.modalidade && data.modalidade !== "cabeca") router.replace("/negocios/novo/lotes");
  }, [data.negocioId, data.modalidade, router]);

  React.useEffect(() => {
    if (idReal) update({ negocioId: idReal });
  }, [idReal, update]);

  if (!data.negocioId || data.modalidade !== "cabeca") return null;

  return (
    <div className={cn("page-container page-narrow", styles.page, "pt-safe")}>
      <BackLink href="/negocios/novo/informacoes" label="Informações" />
      <h1 className={cn("page-title", styles.title)}>Lote único</h1>
      <ProgressSteps current={6} total={PASSOS_NOVO_NEGOCIO} />

      <div className="summary-card glass-dark">
        <span className="card-icon-on-dark">
          <Warehouse size={18} />
        </span>
        <div>
          <p className={styles.fazendaNome}>{data.fazendaNome}</p>
          <p className={styles.fazendaMeta}>Comprador: {data.compradorNome} · Por Cabeça</p>
        </div>
      </div>

      {erro && !negocio ? <div className="state-box state-error glass-panel">{erro}</div> : null}
      {!negocio && !erro ? <div className="state-box glass-panel">Carregando...</div> : null}

      {negocio ? (
        <LoteUnicoForm
          negocio={negocio}
          submitLabel="Próximo"
          onSaved={async () => {
            await recarregar();
            router.push("/negocios/novo/revisao");
          }}
        />
      ) : null}
    </div>
  );
}
