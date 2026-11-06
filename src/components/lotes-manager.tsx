"use client";

import * as React from "react";
import { Layers, Pencil, Plus } from "lucide-react";
import { LoteForm } from "@/components/lote-form";
import { PendenteBadge } from "@/components/offline/pendente-badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { formatCurrency, formatPercent } from "@/lib/format";
import { GENERO_LABELS, TIPO_LOTE_LABELS, VALOR_UNIDADE_LABELS } from "@/lib/labels";
import { criarLote, editarLote, excluirLote } from "@/lib/flows/operacoes-lote";
import type { LoteComPendencia, NegocioComPendencias } from "@/lib/offline/pendentes";
import { cn } from "@/lib/utils";
import styles from "./lotes-manager.module.css";

/**
 * Lotes de um negócio com pesagem ("arroba"/"kg"): botão "Adicionar lote" (abre o
 * formulário em modal) e a lista dos cadastrados — tocar em um lote abre o mesmo
 * formulário em modo edição, com "Salvar" e "Excluir lote".
 */
export function LotesManager({
  negocio,
  onChanged,
}: {
  negocio: NegocioComPendencias;
  /** Depois de criar/editar/excluir (recarregar dados do servidor). */
  onChanged: () => Promise<void> | void;
}) {
  // undefined: modal fechado; null: novo lote; lote: edição.
  const [emEdicao, setEmEdicao] = React.useState<LoteComPendencia | null | undefined>(undefined);
  const { modalidade } = negocio;
  const lotes = negocio.lotes;

  const nomesDosOutros = React.useMemo(
    () => lotes.filter((l) => l.lote_id !== emEdicao?.lote_id).map((l) => l.nome_lote),
    [lotes, emEdicao]
  );

  async function concluir() {
    await onChanged();
    setEmEdicao(undefined);
  }

  return (
    <div className={styles.lotes}>
      <Button type="button" variant="brand" size="xl" className="w-full" onClick={() => setEmEdicao(null)}>
        <Plus size={18} aria-hidden /> Adicionar lote
      </Button>

      {lotes.length === 0 ? (
        <div className="state-box glass-panel">Adicione pelo menos um lote para continuar.</div>
      ) : (
        <div className="card-list">
          {lotes.map((lote) => (
            <button
              key={lote.lote_id}
              type="button"
              className={cn("list-card", "glass-panel", styles.item)}
              onClick={() => setEmEdicao(lote)}
              aria-label={`Editar lote ${lote.nome_lote}`}
            >
              <span className="card-icon">
                <Layers size={18} />
              </span>
              <div className="card-info">
                <p className="card-name">{lote.nome_lote}</p>
                <p className="card-meta">
                  {TIPO_LOTE_LABELS[lote.tipo_lote]} · {GENERO_LABELS[lote.genero]}
                </p>
                <p className="card-meta">
                  {VALOR_UNIDADE_LABELS[modalidade]}: {formatCurrency(lote.valor_unidade)}
                </p>
                {modalidade === "arroba" ? (
                  <p className="card-meta">Rend.: {formatPercent(lote.rendimento_carcaca)}</p>
                ) : null}
                <p className="card-meta">
                  {lote.gados.length} {lote.gados.length === 1 ? "cabeça pesada" : "cabeças pesadas"}
                </p>
                {lote.pendente ? <PendenteBadge pendente={lote.pendente} /> : null}
              </div>
              <Pencil size={16} className={styles.editar} aria-hidden />
            </button>
          ))}
        </div>
      )}

      <Dialog
        open={emEdicao !== undefined}
        onOpenChange={(open) => !open && setEmEdicao(undefined)}
        title={emEdicao ? "Editar lote" : "Adicionar lote"}
      >
        {emEdicao !== undefined ? (
          <LoteForm
            key={emEdicao?.lote_id ?? "novo"}
            modalidade={modalidade}
            lote={emEdicao ?? undefined}
            nomesExistentes={nomesDosOutros}
            submitLabel={emEdicao ? "Salvar" : "Adicionar lote"}
            onSubmit={async (input) => {
              if (emEdicao) await editarLote(negocio, emEdicao.lote_id, input);
              else await criarLote(negocio, input);
              await concluir();
            }}
            onExcluir={
              emEdicao
                ? async () => {
                    await excluirLote(negocio, emEdicao);
                    await concluir();
                  }
                : undefined
            }
          />
        ) : null}
      </Dialog>
    </div>
  );
}
