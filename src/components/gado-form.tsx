"use client";

import * as React from "react";
import { useForm, Controller, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Field } from "@/components/form/field";
import { TintedInput } from "@/components/form/tinted-input";
import { Button } from "@/components/ui/button";
import { OpcoesBotoes, type OpcaoBotao } from "@/components/form/opcoes-botoes";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/format";
import { mensagemDeErro } from "@/lib/offline/rede";
import { GENERO_LABELS, TIPO_LOTE_LABELS } from "@/lib/labels";
import { estimarValoresGado } from "@/lib/calculo-gado";
import type { Lote, Modalidade, TipoGado } from "@/lib/api/types";
import styles from "./gado-form.module.css";

const schema = z.object({
  lote: z.string({ error: "Escolha o lote." }).min(1, "Escolha o lote."),
  peso_total: z.coerce.number({ error: "Informe o peso total." }).positive("Deve ser maior que zero."),
  // Data e horário da pesagem não são informados: são registrados automaticamente.
});
type GadoFormInput = z.input<typeof schema>;
type GadoFormOutput = z.output<typeof schema>;

export type GadoFormValues = { loteId: number; pesoTotal: number };

/** "Boi · Macho · Rend. 53,5%" — subtítulo do botão do lote. */
export function resumoLote(lote: Pick<Lote, "tipo_lote" | "genero" | "rendimento_carcaca">, modalidade: Modalidade) {
  const partes = [TIPO_LOTE_LABELS[lote.tipo_lote], GENERO_LABELS[lote.genero]];
  if (modalidade === "arroba") partes.push(`Rend. ${formatPercent(lote.rendimento_carcaca)}`);
  return partes.join(" · ");
}

/**
 * Formulário da cabeça (lote + peso total, com prévia do cálculo pelo lote escolhido),
 * compartilhado entre a pesagem do novo negócio, o modal de edição e as telas
 * /negocios/[id]/gado/novo e /negocios/[id]/gado/[gadoId]/editar.
 */
export function GadoForm({
  modalidade,
  tipoGado,
  lotes,
  defaultValues,
  submitLabel,
  submittingLabel,
  resetAfterSubmit = false,
  idPrefix = "",
  onSubmit,
}: {
  modalidade: Modalidade;
  /** Tipo de gado do negócio: em "kg", define a arroba da prévia (÷ 15 ou ÷ 30). */
  tipoGado: TipoGado;
  /** Lotes do negócio, em grade, seleção única (a prévia usa o preço do lote escolhido). */
  lotes: Lote[];
  /** Cabeça em edição, ou o lote pré-selecionado (o último usado) no cadastro. */
  defaultValues?: { loteId?: number | null; pesoTotal?: number };
  submitLabel: string;
  submittingLabel: string;
  /** Limpa o peso após salvar (cadastro em sequência); o lote continua selecionado. */
  resetAfterSubmit?: boolean;
  /** Evita ids duplicados quando o formulário aparece duas vezes na tela (ex.: modal). */
  idPrefix?: string;
  /** Lança erro para exibi-lo no formulário. */
  onSubmit: (values: GadoFormValues) => Promise<void>;
}) {
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const loteInicial = defaultValues?.loteId;
  const {
    register,
    handleSubmit,
    control,
    reset,
    setFocus,
    formState: { errors, isSubmitting },
  } = useForm<GadoFormInput, unknown, GadoFormOutput>({
    resolver: zodResolver(schema),
    defaultValues: {
      // Pré-seleção só se o lote ainda existir (ex.: último usado foi excluído).
      lote: loteInicial != null && lotes.some((l) => l.lote_id === loteInicial) ? String(loteInicial) : undefined,
      peso_total: defaultValues?.pesoTotal ?? "",
    },
  });

  const loteSelecionado = useWatch({ control, name: "lote" });
  const loteEscolhido = lotes.find((l) => String(l.lote_id) === loteSelecionado);
  const pesoTotal = Number(useWatch({ control, name: "peso_total" })) || 0;
  const previa = loteEscolhido
    ? estimarValoresGado(
        modalidade,
        pesoTotal,
        loteEscolhido.rendimento_carcaca,
        loteEscolhido.valor_unidade,
        tipoGado
      )
    : { pesoCalculo: 0, pesoArroba: 0, valorTotal: 0 };

  const opcoes: OpcaoBotao<string>[] = lotes.map((lote) => ({
    value: String(lote.lote_id),
    label: lote.nome_lote,
    detalhe: `${resumoLote(lote, modalidade)} · ${formatCurrency(lote.valor_unidade)}`,
  }));

  async function submit(values: GadoFormOutput) {
    setSubmitError(null);
    try {
      await onSubmit({ loteId: Number(values.lote), pesoTotal: values.peso_total });
    } catch (err) {
      setSubmitError(mensagemDeErro(err));
      return;
    }
    if (resetAfterSubmit) {
      reset({ lote: values.lote, peso_total: "" });
      setFocus("peso_total");
    }
  }

  const id = (name: string) => `${idPrefix}${name}`;

  return (
    <form onSubmit={handleSubmit(submit)} className="form-fields">
      <Field label="Lote" htmlFor={id("lote")} error={errors.lote?.message}>
        <Controller
          control={control}
          name="lote"
          render={({ field }) => (
            <OpcoesBotoes
              id={id("lote")}
              ariaLabel="Lote"
              opcoes={opcoes}
              value={field.value}
              onChange={field.onChange}
              grade
            />
          )}
        />
      </Field>

      <Field label="Peso Total" htmlFor={id("peso_total")} error={errors.peso_total?.message}>
        <TintedInput
          id={id("peso_total")}
          tint="pink"
          type="number"
          inputMode="decimal"
          step="0.01"
          placeholder="kg"
          {...register("peso_total")}
        />
      </Field>

      <div className={styles.row}>
        <Field label="Peso p/ Cálculo" htmlFor={id("pesoCalculo")}>
          <TintedInput
            id={id("pesoCalculo")}
            tint="none"
            value={previa.pesoCalculo > 0 ? formatNumber(previa.pesoCalculo) : ""}
            placeholder="—"
            disabled
            readOnly
            className={styles.readOnlyField}
          />
        </Field>
        <Field label="Arrobas" htmlFor={id("pesoArroba")}>
          <TintedInput
            id={id("pesoArroba")}
            tint="none"
            value={previa.pesoArroba > 0 ? formatNumber(previa.pesoArroba) : ""}
            placeholder="—"
            disabled
            readOnly
            className={styles.readOnlyField}
          />
        </Field>
      </div>

      <div className={styles.totalRow}>
        <span className={styles.totalLabel}>Valor (estimado)</span>
        <span className={styles.totalValue}>{formatCurrency(previa.valorTotal)}</span>
      </div>

      {submitError ? <p className="form-error">{submitError}</p> : null}

      <Button type="submit" variant="brand" size="xl" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? submittingLabel : submitLabel}
      </Button>
    </form>
  );
}
