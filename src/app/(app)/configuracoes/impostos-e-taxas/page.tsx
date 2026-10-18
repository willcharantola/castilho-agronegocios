"use client";

import * as React from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { BackLink } from "@/components/back-link";
import { Field } from "@/components/form/field";
import { MaskedNumberInput } from "@/components/form/masked-number-input";
import { Button } from "@/components/ui/button";
import { getUsuario } from "@/lib/api-client";
import { fetchImpostos, updateImpostos } from "@/lib/api/configuracoes";
import { mensagemDeErro } from "@/lib/offline/rede";
import styles from "./page.module.css";

const aliquota = (nome: string) =>
  z
    .number({ error: `Informe a alíquota de ${nome}.` })
    .min(0, "Deve ser entre 0 e 100.")
    .max(100, "Deve ser entre 0 e 100.")
    .refine((v) => Math.abs(v * 100 - Math.round(v * 100)) < 1e-9, "Use no máximo 2 casas decimais.");

const schema = z.object({
  aliquota_funrural: aliquota("Funrural"),
  aliquota_senar: aliquota("Senar"),
});

type FormValues = z.infer<typeof schema>;

const CAMPOS = [
  { name: "aliquota_funrural", label: "Funrural (%)" },
  { name: "aliquota_senar", label: "Senar (%)" },
] as const;

export default function ImpostosETaxasPage() {
  // Só Admin altera (a API responde 403 aos demais); Normal vê em modo somente leitura.
  const admin = getUsuario()?.nivel_acesso === "Admin";
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [sucesso, setSucesso] = React.useState(false);
  const [loaded, setLoaded] = React.useState(false);
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  React.useEffect(() => {
    let cancelled = false;
    fetchImpostos()
      .then((impostos) => {
        if (cancelled) return;
        reset(impostos);
        setLoaded(true);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setLoadError(mensagemDeErro(err, "Erro ao carregar."));
      });
    return () => {
      cancelled = true;
    };
  }, [reset]);

  async function onSubmit(values: FormValues) {
    setSubmitError(null);
    setSucesso(false);
    try {
      reset(await updateImpostos(values));
      setSucesso(true);
    } catch (err) {
      setSubmitError(mensagemDeErro(err));
    }
  }

  return (
    <div className="page-container page-narrow pt-safe">
      <BackLink href="/configuracoes" />
      <h1 className="page-title">Impostos e taxas</h1>
      <p className={styles.subtitle}>
        Alíquotas aplicadas sobre o valor total dos negócios criados a partir de agora. Os negócios já
        cadastrados mantêm as alíquotas com que foram criados.
      </p>

      {!loaded && !loadError ? <div className="state-box glass-panel">Carregando alíquotas...</div> : null}
      {loadError ? <div className="state-box state-error glass-panel">{loadError}</div> : null}

      {loaded ? (
        <form onSubmit={handleSubmit(onSubmit)} className="form-stack">
          <div className="form-fields">
            {submitError ? <p className="form-error">{submitError}</p> : null}

            {CAMPOS.map(({ name, label }) => (
              <Field key={name} label={label} htmlFor={name} error={errors[name]?.message}>
                <Controller
                  control={control}
                  name={name}
                  render={({ field }) => (
                    <MaskedNumberInput
                      id={name}
                      formato="percentual"
                      name={field.name}
                      value={field.value}
                      onValueChange={(valor) => {
                        field.onChange(valor);
                        setSucesso(false);
                      }}
                      onBlur={field.onBlur}
                      disabled={!admin}
                    />
                  )}
                />
              </Field>
            ))}
          </div>

          {admin ? (
            <>
              <Button type="submit" variant="brand" size="xl" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? "Salvando..." : "Salvar"}
              </Button>
              {sucesso ? <p className={styles.success}>Alíquotas salvas.</p> : null}
            </>
          ) : (
            <p className={styles.hint}>Apenas administradores podem alterar.</p>
          )}
        </form>
      ) : null}
    </div>
  );
}
