"use client";

import * as React from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Field } from "@/components/form/field";
import { MaskedNumberInput } from "@/components/form/masked-number-input";
import { Button } from "@/components/ui/button";
import { CAMPO_RENDIMENTO, RACAS_RENDIMENTO } from "@/lib/labels";
import { mensagemDeErro } from "@/lib/offline/rede";
import type { RendimentosNegocio } from "@/lib/api/types";

const percentual = z.coerce
  .number({ error: "Informe o rendimento." })
  .min(0, "Deve ser entre 0 e 100.")
  .max(100, "Deve ser entre 0 e 100.")
  .refine((v) => Math.round(v * 100) === v * 100, "Use no máximo 2 casas decimais.");

const schema = z.object({
  porcentagem_rendimento_nelore: percentual,
  porcentagem_rendimento_anelorado: percentual,
  porcentagem_rendimento_angus: percentual,
  porcentagem_rendimento_composto: percentual,
});
type FormInput = z.input<typeof schema>;

/**
 * Rendimento de carcaça (%) de cada categoria — Nelore, Anelorado, Angus e Composto —
 * definido uma vez por negócio (modalidade "arroba"). O botão só habilita com os quatro
 * preenchidos.
 */
export function RendimentosForm({
  defaultValues,
  submitLabel,
  submittingLabel,
  onSubmit,
}: {
  defaultValues?: RendimentosNegocio | null;
  submitLabel: string;
  submittingLabel: string;
  /** Lança erro para exibi-lo no formulário. */
  onSubmit: (rendimentos: RendimentosNegocio) => Promise<void>;
}) {
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const {
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormInput, unknown, RendimentosNegocio>({
    resolver: zodResolver(schema),
    defaultValues: defaultValues ?? undefined,
  });
  const valores = useWatch({ control });
  const preenchidos = RACAS_RENDIMENTO.every((raca) => {
    const valor = valores[CAMPO_RENDIMENTO[raca]];
    return valor !== undefined && valor !== "" && !Number.isNaN(Number(valor));
  });

  async function submit(rendimentos: RendimentosNegocio) {
    setSubmitError(null);
    try {
      await onSubmit(rendimentos);
    } catch (err) {
      setSubmitError(mensagemDeErro(err));
    }
  }

  return (
    <form onSubmit={handleSubmit(submit)} className="form-stack">
      <div className="form-fields">
        {RACAS_RENDIMENTO.map((raca) => {
          const campo = CAMPO_RENDIMENTO[raca];
          return (
            <Field key={raca} label={`${raca} (%)`} htmlFor={campo} error={errors[campo]?.message}>
              <Controller
                control={control}
                name={campo}
                render={({ field }) => (
                  <MaskedNumberInput
                    id={campo}
                    formato="percentual"
                    name={field.name}
                    value={field.value as number | string | undefined}
                    onValueChange={field.onChange}
                    onBlur={field.onBlur}
                    placeholder="Ex: 52,5%"
                  />
                )}
              />
            </Field>
          );
        })}
      </div>

      {submitError ? <p className="form-error">{submitError}</p> : null}

      <Button type="submit" variant="brand" size="xl" className="w-full" disabled={!preenchidos || isSubmitting}>
        {isSubmitting ? submittingLabel : submitLabel}
      </Button>
    </form>
  );
}
