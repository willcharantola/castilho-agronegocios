"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Warehouse } from "lucide-react";
import { BackLink } from "@/components/back-link";
import { ProgressSteps } from "@/components/progress-steps";
import { RendimentosForm } from "@/components/rendimentos-form";
import { updateNegocio } from "@/lib/api/negocios";
import { enviarOuEnfileirar, referencia } from "@/lib/offline/fila";
import { useNegocioFlow } from "@/lib/flows/negocio-flow";
import { criarNegocioDoFluxo } from "@/lib/flows/criar-negocio";
import { cn } from "@/lib/utils";
import styles from "./page.module.css";

/**
 * Passo 6, só na modalidade "arroba": rendimento de carcaça de cada categoria. O
 * negócio é criado aqui (os quatro percentuais são obrigatórios no banco).
 */
export default function NovoNegocioRendimentosPage() {
  const router = useRouter();
  const { data, update } = useNegocioFlow();

  React.useEffect(() => {
    if (!data.pecuaristaId || !data.fazendaId || !data.compradorId) router.replace("/negocios/novo");
    else if (data.modalidade !== "arroba") router.replace("/negocios/novo/modalidade");
    else if (!data.tipoNegocio) router.replace("/negocios/novo/informacoes");
  }, [data.pecuaristaId, data.fazendaId, data.compradorId, data.modalidade, data.tipoNegocio, router]);

  if (data.modalidade !== "arroba" || !data.tipoNegocio) return null;

  return (
    <div className="page-container page-narrow pt-safe">
      <BackLink href="/negocios/novo/informacoes" label="Informações" />
      <h1 className={cn("page-title", styles.title)}>Rendimentos por categoria</h1>
      <ProgressSteps current={6} total={7} />

      <div className="summary-card glass-dark">
        <span className="card-icon-on-dark">
          <Warehouse size={18} />
        </span>
        <div>
          <p className={styles.fazendaNome}>{data.fazendaNome}</p>
          <p className={styles.meta}>Rendimento de carcaça (%) usado no cálculo de cada cabeça.</p>
        </div>
      </div>

      <RendimentosForm
        defaultValues={data.rendimentos}
        submitLabel="Continuar"
        submittingLabel="Salvando..."
        onSubmit={async (rendimentos) => {
          if (data.negocioId) {
            // Voltou do cadastro das cabeças com o negócio já criado: atualiza os
            // percentuais (a API recalcula as cabeças já cadastradas). Offline, vai para a fila.
            await enviarOuEnfileirar(
              "negocio_atualizacao",
              { ...(await referencia("negocio", data.negocioId)), ...rendimentos },
              ({ negocio_id, ...campos }) => updateNegocio(negocio_id as number, campos)
            );
            update({ rendimentos });
          } else {
            const negocioId = await criarNegocioDoFluxo({ ...data, rendimentos });
            update({ rendimentos, negocioId });
          }
          router.push("/negocios/novo/gado");
        }}
      />
    </div>
  );
}
