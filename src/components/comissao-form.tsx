"use client";

import * as React from "react";
import { MaskedNumberInput } from "@/components/form/masked-number-input";
import { Button } from "@/components/ui/button";
import { updateNegocio } from "@/lib/api/negocios";
import { mensagemDeErro } from "@/lib/offline/rede";
import { formatCurrency, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Negocio } from "@/lib/api/types";
import { COMISSAO_MASCARADA } from "@/lib/permissoes";
import styles from "./comissao-form.module.css";

/**
 * Inserir/atualizar o percentual de comissão de um negócio já cadastrado. O valor em R$
 * (`comissao`) é calculado pela API a partir do percentual e do valor total do negócio.
 * Só para Admin. Com a comissão escondida (botão do olho), mostra só a máscara: nem o
 * percentual nem o valor vão para o DOM.
 */
export function ComissaoForm(props: {
  negocioId: number;
  porcentagem: number | null;
  comissao: number | null;
  /** false = comissão escondida pelo botão do olho. */
  visivel: boolean;
  onUpdated: (negocio: Pick<Negocio, "porcentagem_comissao" | "comissao">) => void;
}) {
  if (!props.visivel) {
    return (
      <div className={cn(styles.card, "glass-panel")}>
        <p className={styles.title}>Comissão (%)</p>
        <p className={styles.hint}>
          {COMISSAO_MASCARADA} · Toque no olho no topo da página para ver e editar.
        </p>
      </div>
    );
  }
  return <ComissaoFormVisivel {...props} />;
}

function ComissaoFormVisivel({
  negocioId,
  porcentagem,
  comissao,
  onUpdated,
}: {
  negocioId: number;
  /** Percentual atual (0 a 100), ou null se ainda não informado. */
  porcentagem: number | null;
  /** Valor em R$ calculado pela API. */
  comissao: number | null;
  onUpdated: (negocio: Pick<Negocio, "porcentagem_comissao" | "comissao">) => void;
}) {
  const [valor, setValor] = React.useState<number | undefined>(porcentagem ?? undefined);
  const [salvando, setSalvando] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [sucesso, setSucesso] = React.useState(false);

  const percentual = valor ?? NaN;
  const alterado = !Number.isNaN(percentual) && percentual !== porcentagem;

  async function atualizar(event: React.FormEvent) {
    event.preventDefault();
    setSucesso(false);
    if (Number.isNaN(percentual) || percentual < 0 || percentual > 100) {
      setError("Informe uma porcentagem entre 0 e 100.");
      return;
    }
    setError(null);
    setSalvando(true);
    try {
      const atualizado = await updateNegocio(negocioId, { porcentagem_comissao: percentual });
      onUpdated(atualizado);
      setSucesso(true);
    } catch (err) {
      setError(mensagemDeErro(err, "Erro ao atualizar."));
    } finally {
      setSalvando(false);
    }
  }

  return (
    <form onSubmit={atualizar} className={cn(styles.card, "glass-panel")}>
      <label htmlFor="comissao" className={styles.title}>
        Comissão (%)
      </label>
      <div className={styles.row}>
        <MaskedNumberInput
          id="comissao"
          formato="percentual"
          placeholder="Ex: 5%"
          className={styles.input}
          value={valor}
          onValueChange={(novo) => {
            setValor(novo);
            setSucesso(false);
          }}
        />
        <Button type="submit" variant="brand" className={styles.button} disabled={salvando || !alterado}>
          {salvando ? "Atualizando..." : "Atualizar"}
        </Button>
      </div>
      {porcentagem !== null ? (
        <p className={styles.hint}>
          Atual: {formatPercent(porcentagem)}
          {comissao !== null ? ` · ${formatCurrency(comissao)} sobre o valor total do negócio` : null}
        </p>
      ) : (
        <p className={styles.hint}>Nenhuma comissão definida para este negócio.</p>
      )}
      {error ? <p className="form-error">{error}</p> : null}
      {sucesso ? <p className={styles.success}>Comissão atualizada.</p> : null}
    </form>
  );
}
