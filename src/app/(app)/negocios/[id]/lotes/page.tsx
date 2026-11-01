"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { BackLink } from "@/components/back-link";
import { LotesManager } from "@/components/lotes-manager";
import { LoteUnicoForm } from "@/components/lote-unico-form";
import { MODALIDADE_LABELS } from "@/lib/labels";
import { useNegocioComPendencias } from "@/lib/flows/use-negocio-com-pendencias";
import { cn } from "@/lib/utils";
import styles from "../gado/gado-page.module.css";

/**
 * Lotes de um negócio já cadastrado: lista com adicionar/editar/excluir ("arroba"/"kg")
 * ou o formulário do lote único ("cabeca"). Editar rendimento ou valor da unidade faz a
 * API recalcular as cabeças, o lote e o negócio.
 */
export default function NegocioLotesPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { negocio, erro, recarregar } = useNegocioComPendencias(Number(params.id));
  const porCabeca = negocio?.modalidade === "cabeca";

  return (
    <div className={cn("page-container page-narrow", styles.page, "pt-safe")}>
      <BackLink href={`/negocios/${params.id}`} />
      <div>
        <h1 className="page-title">{porCabeca ? "Lote único" : "Lotes"}</h1>
        {negocio ? (
          <p className={styles.subtitle}>
            Modalidade: {MODALIDADE_LABELS[negocio.modalidade]} · {negocio.lotes.length} lote(s)
          </p>
        ) : null}
      </div>

      {!negocio && !erro ? <div className="state-box glass-panel">Carregando lotes...</div> : null}
      {erro && !negocio ? <div className="state-box state-error glass-panel">{erro}</div> : null}

      {negocio && porCabeca ? (
        <LoteUnicoForm
          negocio={negocio}
          submitLabel="Salvar"
          onSaved={async () => {
            await recarregar();
            router.push(`/negocios/${params.id}`);
          }}
        />
      ) : null}
      {negocio && !porCabeca ? <LotesManager negocio={negocio} onChanged={recarregar} /> : null}
    </div>
  );
}
