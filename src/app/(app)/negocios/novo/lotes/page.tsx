"use client";

import { formatFazenda } from "@/lib/format";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Warehouse } from "lucide-react";
import { BackLink } from "@/components/back-link";
import { LotesManager } from "@/components/lotes-manager";
import { ProgressSteps } from "@/components/progress-steps";
import { Button } from "@/components/ui/button";
import { MODALIDADE_LABELS } from "@/lib/labels";
import { PASSOS_NOVO_NEGOCIO, useNegocioFlow } from "@/lib/flows/negocio-flow";
import { useNegocioComPendencias } from "@/lib/flows/use-negocio-com-pendencias";
import { cn } from "@/lib/utils";
import styles from "./page.module.css";

/**
 * Passo 6 (modalidades "arroba" e "kg"): lotes do negócio. "Próximo" (pesagem) só
 * habilita com pelo menos um lote.
 */
export default function NovoNegocioLotesPage() {
  const router = useRouter();
  const { data, update } = useNegocioFlow();
  const { negocio, erro, recarregar, idReal } = useNegocioComPendencias(data.negocioId);

  React.useEffect(() => {
    if (!data.negocioId) router.replace("/negocios/novo/informacoes");
    else if (data.modalidade === "cabeca") router.replace("/negocios/novo/lote-unico");
  }, [data.negocioId, data.modalidade, router]);

  // Negócio criado offline e sincronizado com a tela aberta: passa a usar o id real.
  React.useEffect(() => {
    if (idReal) update({ negocioId: idReal });
  }, [idReal, update]);

  if (!data.negocioId || !data.modalidade || data.modalidade === "cabeca") return null;

  return (
    <div className="page-container page-narrow pt-safe">
      <BackLink href="/negocios/novo/informacoes" label="Informações" />
      <h1 className={cn("page-title", styles.title)}>Lotes</h1>
      <ProgressSteps current={6} total={PASSOS_NOVO_NEGOCIO} />

      <div className="summary-card glass-dark">
        <span className="card-icon-on-dark">
          <Warehouse size={18} />
        </span>
        <div>
          <p className={styles.fazendaNome}>{formatFazenda(data.fazendaNome)}</p>
          <p className={styles.meta}>
            {MODALIDADE_LABELS[data.modalidade]} · Rendimento, valor e carimbo são definidos por lote.
          </p>
        </div>
      </div>

      {erro && !negocio ? <div className="state-box state-error glass-panel">{erro}</div> : null}
      {!negocio && !erro ? <div className="state-box glass-panel">Carregando lotes...</div> : null}

      {negocio ? <LotesManager negocio={negocio} onChanged={recarregar} /> : null}

      <Button
        type="button"
        size="xl"
        className="w-full"
        disabled={!negocio || negocio.lotes.length === 0}
        onClick={() => router.push("/negocios/novo/gado")}
      >
        Próximo
      </Button>
    </div>
  );
}
