"use client";

import * as React from "react";
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
  const [error, setError] = React.useState<string | null>(null);
  const [sucesso, setSucesso] = React.useState(false);
  const invalido = valor === undefined || valor <= 0;

  async function atualizar(event: React.FormEvent) {
    event.preventDefault();
    if (invalido) return;
    setSucesso(false);
    setError(null);
    setSalvando(true);
    try {
      onUpdated(await updateNegocio(negocioId, { valor_unidade: valor }));
      setSucesso(true);
    } catch (err) {
      setError(mensagemDeErro(err, "Erro ao atualizar."));
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
            setValor(novo);
            setSucesso(false);
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
      {error ? <p className="form-error">{error}</p> : null}
      {sucesso ? <p className={styles.success}>Valor atualizado: {formatCurrency(valor ?? 0)}.</p> : null}
    </form>
  );
}
