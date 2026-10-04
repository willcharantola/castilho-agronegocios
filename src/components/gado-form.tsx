"use client";

import * as React from "react";
import { useForm, Controller, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Field } from "@/components/form/field";
import { TintedInput } from "@/components/form/tinted-input";
import { MaskedNumberInput } from "@/components/form/masked-number-input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency, formatNumber, formatGenero } from "@/lib/format";
import { mensagemDeErro } from "@/lib/offline/rede";
import { MESES_LABELS } from "@/lib/labels";
import { estimarValoresGado } from "@/lib/calculo-gado";
import { cn } from "@/lib/utils";
import type { CreateGadoInput, Gado, Modalidade } from "@/lib/api/types";
import fieldBox from "@/components/form/field-box.module.css";
import styles from "./gado-form.module.css";

const schema = z.object({
  denominacao: z.string().min(2, "Informe a denominação.").max(20),
  genero: z.enum(["Macho", "Femea"], { error: "Selecione o gênero." }),
  peso_total: z.coerce.number({ error: "Informe o peso total." }).positive("Deve ser maior que zero."),
  data_pesagem: z.string().min(1, "Informe a data de pesagem."),
  rendimento_carcaca: z.coerce
    .number({ error: "Informe o rendimento de carcaça." })
    .min(0, "Deve ser entre 0 e 100.")
    .max(100, "Deve ser entre 0 e 100."),
  // horario_pesagem não é informado: a API registra o horário no cadastro.
  // Mês (1 a 12) e ano de referência definidos pelo cliente.
  carimbo: z.enum(["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"], { error: "Selecione o mês." }),
  ano_carimbo: z.string().regex(/^\d{4}$/, "Informe o ano com 4 dígitos (ex: 2025)."),
});
export type GadoFormInput = z.input<typeof schema>;
export type GadoFormValues = z.output<typeof schema>;

const hoje = () => new Date().toISOString().slice(0, 10);

/** Só "arroba" usa o rendimento no cálculo; nas demais sugerimos 100 (ainda editável). */
const rendimentoPadrao = (modalidade: Modalidade) => (modalidade === "arroba" ? "" : 100);

/** Valores iniciais do formulário a partir de um gado já cadastrado (edição). */
export function gadoParaFormInput(gado: Gado): GadoFormInput {
  return {
    denominacao: gado.denominacao,
    genero: gado.genero,
    peso_total: gado.peso_total,
    data_pesagem: gado.data_pesagem.slice(0, 10),
    rendimento_carcaca: gado.rendimento_carcaca,
    carimbo: String(gado.carimbo) as GadoFormInput["carimbo"],
    ano_carimbo: gado.ano_carimbo,
  };
}

/** Payload de POST/PATCH /gados (sem negocio_id). */
export function formValuesParaInput(values: GadoFormValues): Omit<CreateGadoInput, "negocio_id"> {
  return {
    peso_total: values.peso_total,
    rendimento_carcaca: values.rendimento_carcaca,
    data_pesagem: new Date(values.data_pesagem).toISOString(),
    genero: values.genero,
    denominacao: values.denominacao,
    carimbo: Number(values.carimbo),
    ano_carimbo: values.ano_carimbo,
  };
}

/**
 * Formulário de gado (campos, validação e cálculo em tempo real) compartilhado entre o
 * cadastro em /negocios/novo/gado, o modal de edição desse fluxo e as telas
 * /negocios/[id]/gado/novo e /negocios/[id]/gado/[gadoId]/editar.
 */
export function GadoForm({
  modalidade,
  valorUnidade,
  defaultValues,
  submitLabel,
  submittingLabel,
  resetAfterSubmit = false,
  idPrefix = "",
  onSubmit,
}: {
  modalidade: Modalidade;
  valorUnidade: number;
  /** Valores do gado em edição; omitido para cadastro novo. */
  defaultValues?: GadoFormInput;
  submitLabel: string;
  submittingLabel: string;
  /**
   * Limpa o formulário após salvar (cadastro em sequência). Gênero, carimbo e ano voltam
   * a "Selecione"/vazio; o rendimento de carcaça é mantido (costuma se repetir no lote).
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
    defaultValues: defaultValues ?? {
      data_pesagem: hoje(),
      rendimento_carcaca: rendimentoPadrao(modalidade),
    },
  });

  const pesoTotal = Number(useWatch({ control, name: "peso_total" })) || 0;
  const rendimento = Number(useWatch({ control, name: "rendimento_carcaca" })) || 0;
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
        denominacao: "",
        genero: undefined,
        peso_total: "",
        rendimento_carcaca: values.rendimento_carcaca,
        data_pesagem: hoje(),
        carimbo: undefined,
        ano_carimbo: "",
      });
    }
  }

  const id = (name: string) => `${idPrefix}${name}`;

  return (
    <form onSubmit={handleSubmit(submit)} className={styles.form}>
      <div className={styles.row}>
        <Field label="Denominação" htmlFor={id("denominacao")} error={errors.denominacao?.message}>
          <TintedInput id={id("denominacao")} tint="pink" placeholder="Ex: Nelore" {...register("denominacao")} />
        </Field>
        <Field label="Gênero" htmlFor={id("genero")} error={errors.genero?.message}>
          <Controller
            control={control}
            name="genero"
            render={({ field }) => (
              // `?? null`: com `undefined` o Select do base-ui vira não controlado e
              // continua exibindo a última opção mesmo após o reset do formulário.
              <Select value={field.value ?? null} onValueChange={field.onChange}>
                <SelectTrigger id={id("genero")} className={cn(fieldBox.box, fieldBox.pink)}>
                  <SelectValue>
                    {(value: "Macho" | "Femea" | null) => (value ? formatGenero(value) : "Selecione")}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Macho">Macho</SelectItem>
                  <SelectItem value="Femea">{formatGenero("Femea")}</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </Field>
      </div>

      <div className={styles.row}>
        <Field label="Carimbo (mês)" htmlFor={id("carimbo")} error={errors.carimbo?.message}>
          <Controller
            control={control}
            name="carimbo"
            render={({ field }) => (
              <Select value={field.value ?? null} onValueChange={field.onChange}>
                <SelectTrigger id={id("carimbo")} className={cn(fieldBox.box, fieldBox.pink)}>
                  <SelectValue>
                    {(value: string | null) => (value ? MESES_LABELS[Number(value) - 1] : "Selecione")}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {MESES_LABELS.map((mes, index) => (
                    <SelectItem key={mes} value={String(index + 1)}>
                      {mes}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
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

      <Field
        label="Rendimento de Carcaça (%)"
        htmlFor={id("rendimento_carcaca")}
        error={errors.rendimento_carcaca?.message}
      >
        <Controller
          control={control}
          name="rendimento_carcaca"
          render={({ field }) => (
            <MaskedNumberInput
              id={id("rendimento_carcaca")}
              formato="percentual"
              name={field.name}
              value={field.value as number | string | undefined}
              onValueChange={field.onChange}
              onBlur={field.onBlur}
              placeholder="Ex: 50%"
            />
          )}
        />
      </Field>

      <Field label="Data de Pesagem" htmlFor={id("data_pesagem")} error={errors.data_pesagem?.message}>
        <TintedInput id={id("data_pesagem")} tint="pink" type="date" {...register("data_pesagem")} />
      </Field>

      {modalidade === "arroba" ? (
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

      {submitError ? <p className={styles.submitError}>{submitError}</p> : null}

      <Button type="submit" variant="brand" size="xl" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? submittingLabel : submitLabel}
      </Button>
    </form>
  );
}
