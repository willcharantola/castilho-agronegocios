"use client";

import { Dialog } from "@/components/ui/dialog";
import { GadoForm } from "@/components/gado-form";
import { editarGado } from "@/lib/flows/operacoes-lote";
import type { Gado, Modalidade, TipoGado } from "@/lib/api/types";
import type { LoteComPendencia } from "@/lib/offline/pendentes";

/**
 * Edição de uma cabeça em modal (peso e lote), usada na pesagem do negócio. Uma cabeça
 * cadastrada offline (id negativo) é editada direto na fila do aparelho.
 */
export function GadoEditDialog({
  gado,
  negocio,
  lotes,
  onClose,
  onSaved,
}: {
  /** Cabeça em edição; `null` fecha o modal. */
  gado: Gado | null;
  negocio: { negocio_id: number; modalidade: Modalidade; tipo_gado: TipoGado; valor_unidade: number };
  lotes: LoteComPendencia[];
  onClose: () => void;
  onSaved: () => Promise<void> | void;
}) {
  return (
    <Dialog open={gado !== null} onOpenChange={(open) => !open && onClose()} title="Editar cabeça">
      {gado ? (
        <GadoForm
          // Remonta o formulário ao trocar de cabeça, para recarregar os valores iniciais.
          key={gado.gado_id}
          idPrefix="editar-"
          modalidade={negocio.modalidade}
          tipoGado={negocio.tipo_gado}
          valorUnidade={negocio.valor_unidade}
          lotes={lotes}
          defaultValues={{ loteId: gado.lote_id, pesoTotal: gado.peso_total }}
          submitLabel="Salvar Alterações"
          submittingLabel="Salvando..."
          onSubmit={async ({ loteId, pesoTotal }) => {
            const lote = lotes.find((l) => l.lote_id === loteId);
            if (!lote) throw new Error("Lote não encontrado.");
            await editarGado(negocio, gado.gado_id, lote, pesoTotal);
            await onSaved();
            onClose();
          }}
        />
      ) : null}
    </Dialog>
  );
}
