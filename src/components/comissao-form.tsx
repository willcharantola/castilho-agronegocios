"use client";

import * as React from "react";
import { MaskedNumberInput } from "@/components/form/masked-number-input";
import { useAviso } from "@/components/aviso";
import { Button } from "@/components/ui/button";
import { updateNegocio } from "@/lib/api/negocios";
import { calcularComissao, formatarCriterioComissao, type ModoComissao } from "@/lib/comissao";
import { mensagemDeErro } from "@/lib/offline/rede";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Negocio } from "@/lib/api/types";
import { COMISSAO_MASCARADA } from "@/lib/permissoes";
import styles from "./comissao-form.module.css";

const ROTULOS: Record<ModoComissao, string> = {
  por_arroba: "Comissão (R$ por arroba)",
  percentual: "Comissão (%)",
};

type ComissaoFormProps = {
  negocioId: number;
  /** Valor informado (R$/@ ou %, conforme `modo`), ou null se ainda não informado. */
  porcentagem: number | null;
  /** Valor em R$ calculado pela API. */
  comissao: number | null;
  /** Ver lib/comissao: muda com o tipo de gado e a modalidade do negócio. */
  modo: ModoComissao;
  /** Para a prévia (a mesma regra da API, só informativa). */
  tipoGado: string;
  modalidade: string;
  valorTotal: number | null;
  pesoTotalQuilos: number | null;
  /** Negócio ainda na fila offline com valor digitado antes da regra por arroba. */
  revisar?: boolean;
  /** false = comissão escondida pelo botão do olho. */
  visivel: boolean;
  onUpdated: (negocio: Pick<Negocio, "porcentagem_comissao" | "comissao">) => void;
};

/**
 * Inserir/atualizar a comissão de um negócio já cadastrado: R$ por arroba (gado Gordo em
 * arroba/kg) ou percentual (demais casos). O valor em R$ (`comissao`) é calculado pela API.
 * Só para Admin. Com a comissão escondida (botão do olho), mostra só a máscara: nem o
 * valor informado nem o calculado vão para o DOM.
 */
export function ComissaoForm(props: ComissaoFormProps) {
  if (!props.visivel) {
    return (
      <div className={cn(styles.card, "glass-panel")}>
        <p className={styles.title}>{ROTULOS[props.modo]}</p>
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
  modo,
  tipoGado,
  modalidade,
  valorTotal,
  pesoTotalQuilos,
  revisar,
  onUpdated,
}: ComissaoFormProps) {
  const [valor, setValor] = React.useState<number | undefined>(porcentagem ?? undefined);
  const [salvando, setSalvando] = React.useState(false);
  const avisar = useAviso();
  const [aviso, setAviso] = React.useState<string | null>(null);

  // Se a forma de cálculo mudar com o campo preenchido, o número digitado perde o sentido.
  const [modoAnterior, setModoAnterior] = React.useState(modo);
  if (modo !== modoAnterior) {
    setModoAnterior(modo);
    if (valor !== undefined) {
      setValor(undefined);
      setAviso("A comissão foi limpa porque a forma de cálculo mudou.");
    }
  }

  const informado = valor ?? NaN;
  const alterado = !Number.isNaN(informado) && informado !== porcentagem;
  const previa = alterado
    ? calcularComissao({
        tipoGado,
        modalidade,
        valorTotal: valorTotal ?? 0,
        pesoTotalQuilos: pesoTotalQuilos ?? 0,
        valorInformado: informado,
      })
    : null;

  async function atualizar(event: React.FormEvent) {
    event.preventDefault();
    // Mesma faixa do CHECK do banco (0 a 100) nos dois modos.
    if (Number.isNaN(informado) || informado < 0 || informado > 100) {
      avisar(
        modo === "por_arroba" ? "Informe um valor entre R$ 0,00 e R$ 100,00." : "Informe uma porcentagem entre 0 e 100.",
        "aviso"
      );
      return;
    }
    setAviso(null);
    setSalvando(true);
    try {
      const atualizado = await updateNegocio(negocioId, { porcentagem_comissao: informado });
      onUpdated(atualizado);
      avisar("Comissão atualizada.");
    } catch (err) {
      avisar(mensagemDeErro(err, "Erro ao atualizar."), "aviso");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <form onSubmit={atualizar} className={cn(styles.card, "glass-panel")}>
      <label htmlFor="comissao" className={styles.title}>
        {ROTULOS[modo]}
      </label>
      <div className={styles.row}>
        <MaskedNumberInput
          // Trocar a máscara (R$ ↔ %) recria o campo.
          key={modo}
          id="comissao"
          formato={modo === "por_arroba" ? "moeda" : "percentual"}
          placeholder={modo === "por_arroba" ? "Ex: R$ 2,00" : "Ex: 5%"}
          className={styles.input}
          value={valor}
          onValueChange={(novo) => {
            setValor(novo ?? undefined);
          }}
        />
        <Button type="submit" variant="brand" className={styles.button} disabled={salvando || !alterado}>
          {salvando ? "Atualizando..." : "Atualizar"}
        </Button>
      </div>
      {previa !== null ? (
        <p className={styles.hint}>
          Prévia: {formatCurrency(previa)}
          {modo === "por_arroba" ? " sobre o peso vivo das cabeças já pesadas" : " sobre o valor total do negócio"}
        </p>
      ) : null}
      {porcentagem !== null ? (
        <p className={styles.hint}>
          Atual: {formatarCriterioComissao(porcentagem, modo)}
          {comissao !== null ? ` · ${formatCurrency(comissao)}` : null}
        </p>
      ) : (
        <p className={styles.hint}>Nenhuma comissão definida para este negócio.</p>
      )}
      {revisar ? (
        <p className="form-error">
          Valor informado antes da regra por arroba: revise-o, pois agora ele vale como R$ por arroba.
        </p>
      ) : null}
      {aviso ? <p className="form-error">{aviso}</p> : null}
    </form>
  );
}
