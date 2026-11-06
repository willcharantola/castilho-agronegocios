"use client";

import * as React from "react";
import { useAviso } from "@/components/aviso";
import { Button } from "@/components/ui/button";
import { MaskedNumberInput } from "@/components/form/masked-number-input";
import { updateNegocio } from "@/lib/api/negocios";
import { formatCurrency } from "@/lib/format";
import { VALOR_UNIDADE_LABELS } from "@/lib/labels";
import { mensagemDeErro } from "@/lib/offline/rede";
import { cn } from "@/lib/utils";
import type { Modalidade, Negocio } from "@/lib/api/types";
import styles from "./comissao-form.module.css";

/**
 * Troca o valor da unidade (R$/@, R$/kg ou R$/cabeça) de um negócio já cadastrado. É um
 * só para todos os lotes: a API recalcula as cabeças, os lotes, a comissão e os impostos.
 */
export function ValorUnidadeForm({
  negocioId,
  modalidade,
  valorUnidade,
  onUpdated,
}: {
  negocioId: number;
  modalidade: Modalidade;
  valorUnidade: number;
  onUpdated: (negocio: Negocio) => void;
}) {
  const [valor, setValor] = React.useState<number | undefined>(valorUnidade);
  const [salvando, setSalvando] = React.useState(false);
  const avisar = useAviso();
  const invalido = valor === undefined || valor <= 0;

  async function atualizar(event: React.FormEvent) {
    event.preventDefault();
    if (invalido) return;
    setSalvando(true);
    try {
      onUpdated(await updateNegocio(negocioId, { valor_unidade: valor }));
      avisar(`Valor atualizado: ${formatCurrency(valor ?? 0)}.`);
    } catch (err) {
      avisar(mensagemDeErro(err, "Erro ao atualizar."), "aviso");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <form onSubmit={atualizar} className={cn(styles.card, "glass-panel")}>
      <label className={styles.title} htmlFor="valor_unidade">
        {VALOR_UNIDADE_LABELS[modalidade]}
      </label>
      <div className={styles.row}>
        <MaskedNumberInput
          id="valor_unidade"
          formato="moeda"
          className={styles.input}
          value={valor}
          onValueChange={(novo) => {
            setValor(novo ?? undefined);
          }}
        />
        <Button
          type="submit"
          variant="brand"
          className={styles.button}
          disabled={salvando || invalido || valor === valorUnidade}
        >
          {salvando ? "Atualizando..." : "Atualizar"}
        </Button>
      </div>
      <p className={styles.hint}>O mesmo valor vale para todos os lotes; as cabeças são recalculadas.</p>
    </form>
  );
}
