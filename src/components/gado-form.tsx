"use client";

import * as React from "react";
import { useForm, Controller, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Field } from "@/components/form/field";
import { TintedInput } from "@/components/form/tinted-input";
import { Button } from "@/components/ui/button";
import { OpcoesBotoes, type OpcaoBotao } from "@/components/form/opcoes-botoes";
import { formatCurrency, formatNumber, formatGenero, formatPercent } from "@/lib/format";
import { mensagemDeErro } from "@/lib/offline/rede";
import { RACAS_RENDIMENTO } from "@/lib/labels";
import { estimarValoresGado, rendimentoDaRaca } from "@/lib/calculo-gado";
import type { CreateGadoInput, Gado, Modalidade, RacaRendimento, RendimentosNegocio } from "@/lib/api/types";
import styles from "./gado-form.module.css";

const schema = z.object({
  // Categoria de rendimento: define qual percentual do negócio entra no cálculo.
  denominacao: z.enum(["Nelore", "Anelorado", "Angus", "Composto"], { error: "Escolha a categoria." }),
  genero: z.enum(["Macho", "Femea"], { error: "Selecione o gênero." }),
  peso_total: z.coerce.number({ error: "Informe o peso total." }).positive("Deve ser maior que zero."),
  data_pesagem: z.string().min(1, "Informe a data de pesagem."),
  // horario_pesagem não é informado: a API registra o horário no cadastro.
  ano_carimbo: z.string().regex(/^\d{4}$/, "Informe o ano com 4 dígitos (ex: 2025)."),
});
export type GadoFormInput = z.input<typeof schema>;
export type GadoFormValues = z.output<typeof schema>;

const hoje = () => new Date().toISOString().slice(0, 10);

/** Valores iniciais do formulário a partir de um gado já cadastrado (edição). */
export function gadoParaFormInput(gado: Gado): GadoFormInput {
  return {
    // Gado antigo com denominação fora das quatro categorias: obriga a escolher de novo.
    denominacao: RACAS_RENDIMENTO.includes(gado.denominacao) ? gado.denominacao : (undefined as never),
    genero: gado.genero,
    peso_total: gado.peso_total,
    data_pesagem: gado.data_pesagem.slice(0, 10),
    ano_carimbo: gado.ano_carimbo,
  };
}

/** Payload de POST/PATCH /gados (sem negocio_id). */
export function formValuesParaInput(values: GadoFormValues): Omit<CreateGadoInput, "negocio_id"> {
  return {
    peso_total: values.peso_total,
    data_pesagem: new Date(values.data_pesagem).toISOString(),
    genero: values.genero,
    denominacao: values.denominacao,
    ano_carimbo: values.ano_carimbo,
  };
}

/** Prévia de um gado (valores oficiais vêm da API) — também guardada para gados na fila offline. */
export function estimarGado(
  negocio: { modalidade: Modalidade; valor_unidade: number } & RendimentosNegocio,
  input: Pick<CreateGadoInput, "peso_total" | "denominacao">
) {
  const rendimento = rendimentoDaRaca(negocio, input.denominacao);
  const v = estimarValoresGado(negocio.modalidade, input.peso_total, rendimento, negocio.valor_unidade);
  return {
    rendimento_carcaca: rendimento,
    peso_calculo: v.pesoCalculo,
    peso_arroba: v.pesoArroba,
    valor_total: v.valorTotal,
  };
}

const OPCOES_GENERO: OpcaoBotao<"Macho" | "Femea">[] = [
  { value: "Macho", label: formatGenero("Macho") },
  { value: "Femea", label: formatGenero("Femea") },
];

/** Botões das quatro categorias; o percentual do negócio aparece só na modalidade "arroba". */
function opcoesCategoria(rendimentos: RendimentosNegocio, mostrarPercentual: boolean): OpcaoBotao<RacaRendimento>[] {
  return RACAS_RENDIMENTO.map((raca) => ({
    value: raca,
    label: raca,
    detalhe: mostrarPercentual ? formatPercent(rendimentoDaRaca(rendimentos, raca)) : undefined,
  }));
}

/**
 * Formulário de gado (campos, validação e cálculo em tempo real) compartilhado entre o
 * cadastro em /negocios/novo/gado, o modal de edição desse fluxo e as telas
 * /negocios/[id]/gado/novo e /negocios/[id]/gado/[gadoId]/editar.
 */
export function GadoForm({
  modalidade,
  valorUnidade,
  rendimentos,
  defaultValues,
  submitLabel,
  submittingLabel,
  resetAfterSubmit = false,
  idPrefix = "",
  onSubmit,
}: {
  modalidade: Modalidade;
  valorUnidade: number;
  /** Percentuais por categoria definidos no negócio (100 nas modalidades sem rendimento). */
  rendimentos: RendimentosNegocio;
  /** Valores do gado em edição; omitido para cadastro novo. */
  defaultValues?: GadoFormInput;
  submitLabel: string;
  submittingLabel: string;
  /**
   * Limpa o formulário após salvar (cadastro em sequência). Gênero fica sem seleção e o
   * ano vazio; a categoria é mantida (costuma se repetir no lote).
   */
  resetAfterSubmit?: boolean;
  /** Evita ids duplicados quando o formulário aparece duas vezes na tela (ex.: modal). */
  idPrefix?: string;
  /** Lança erro para exibi-lo no formulário. */
  onSubmit: (values: GadoFormValues) => Promise<void>;
}) {
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<GadoFormInput, unknown, GadoFormValues>({
    resolver: zodResolver(schema),
    defaultValues: defaultValues ?? { data_pesagem: hoje() },
  });

  const porArroba = modalidade === "arroba";
  const pesoTotal = Number(useWatch({ control, name: "peso_total" })) || 0;
  const categoria = useWatch({ control, name: "denominacao" });
  const rendimento = categoria ? rendimentoDaRaca(rendimentos, categoria) : 0;
  const { pesoCalculo, pesoArroba, valorTotal } = estimarValoresGado(modalidade, pesoTotal, rendimento, valorUnidade);

  async function submit(values: GadoFormValues) {
    setSubmitError(null);
    try {
      await onSubmit(values);
    } catch (err) {
      setSubmitError(mensagemDeErro(err));
      return;
    }
    if (resetAfterSubmit) {
      reset({
        denominacao: values.denominacao,
        genero: undefined,
        peso_total: "",
        data_pesagem: hoje(),
        ano_carimbo: "",
      });
    }
  }

  const id = (name: string) => `${idPrefix}${name}`;

  return (
    <form onSubmit={handleSubmit(submit)} className="form-fields date-input-fix">
      <Field label="Categoria" htmlFor={id("denominacao")} error={errors.denominacao?.message}>
        <Controller
          control={control}
          name="denominacao"
          render={({ field }) => (
            <OpcoesBotoes
              id={id("denominacao")}
              ariaLabel="Categoria"
              opcoes={opcoesCategoria(rendimentos, porArroba)}
              value={field.value}
              onChange={field.onChange}
            />
          )}
        />
      </Field>

      <Field label="Gênero" htmlFor={id("genero")} error={errors.genero?.message}>
        <Controller
          control={control}
          name="genero"
          render={({ field }) => (
            <OpcoesBotoes
              id={id("genero")}
              ariaLabel="Gênero"
              opcoes={OPCOES_GENERO}
              value={field.value}
              onChange={field.onChange}
            />
          )}
        />
      </Field>

      <div className={styles.row}>
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
        <Field label="Ano do Carimbo" htmlFor={id("ano_carimbo")} error={errors.ano_carimbo?.message}>
          <TintedInput
            id={id("ano_carimbo")}
            tint="pink"
            type="number"
            inputMode="numeric"
            placeholder="Ex: 2025"
            {...register("ano_carimbo")}
          />
        </Field>
      </div>

      <Field label="Data de Pesagem" htmlFor={id("data_pesagem")} error={errors.data_pesagem?.message}>
        <TintedInput id={id("data_pesagem")} tint="pink" type="date" {...register("data_pesagem")} />
      </Field>

      {porArroba ? (
        <div className={styles.row}>
          <Field label="Peso p/ Cálculo" htmlFor={id("pesoCalculo")}>
            <TintedInput
              id={id("pesoCalculo")}
              tint="none"
              value={pesoCalculo > 0 ? formatNumber(pesoCalculo) : ""}
              placeholder="—"
              disabled
              readOnly
              className={styles.readOnlyField}
            />
          </Field>
          <Field label="Peso da Arroba" htmlFor={id("pesoArroba")}>
            <TintedInput
              id={id("pesoArroba")}
              tint="none"
              value={pesoArroba > 0 ? formatNumber(pesoArroba) : ""}
              placeholder="—"
              disabled
              readOnly
              className={styles.readOnlyField}
            />
          </Field>
        </div>
      ) : null}

      <div className={styles.totalRow}>
        <span className={styles.totalLabel}>Valor Total (estimado)</span>
        <span className={styles.totalValue}>{formatCurrency(valorTotal)}</span>
      </div>

      {submitError ? <p className="form-error">{submitError}</p> : null}

      <Button type="submit" variant="brand" size="xl" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? submittingLabel : submitLabel}
      </Button>
    </form>
  );
}
