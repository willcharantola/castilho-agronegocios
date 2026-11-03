"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Warehouse } from "lucide-react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { BackLink } from "@/components/back-link";
import { ProgressSteps } from "@/components/progress-steps";
import { Field } from "@/components/form/field";
import { TintedInput } from "@/components/form/tinted-input";
import { MaskedNumberInput } from "@/components/form/masked-number-input";
import { OpcoesBotoes, opcoesDeLabels } from "@/components/form/opcoes-botoes";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MODALIDADE_LABELS, TIPO_GADO_LABELS, TIPO_NEGOCIO_LABELS } from "@/lib/labels";
import { PASSOS_NOVO_NEGOCIO, useNegocioFlow } from "@/lib/flows/negocio-flow";
import { salvarNegocioDoFluxo } from "@/lib/flows/criar-negocio";
import { mensagemDeErro } from "@/lib/offline/rede";
import { useIsAdmin } from "@/lib/permissoes";
import { cn } from "@/lib/utils";
import type { TipoNegocio } from "@/lib/api/types";
import fieldBox from "@/components/form/field-box.module.css";
import styles from "./page.module.css";

const vazioParaUndefined = (v: unknown) => (v === "" || v === null ? undefined : v);

// A modalidade é escolhida no passo anterior. Tipo de lote, valor da unidade, carimbo e
// rendimento são de cada lote (próxima tela). Horários de pesagem são registrados pela API.
const schema = z.object({
  tipo_gado: z.enum(["Gordo", "Reposicao"], { error: "Selecione o tipo de gado." }),
  // Sem valor padrão: o usuário precisa escolher (define Funrural e Senar).
  tipo_negocio: z.enum(["Desconto em folha", "Livre", "Funrural"], { error: "Selecione o tipo de negócio." }),
  data_negocio: z.string().min(1, "Informe a data do negócio."),
  porcentagem_comissao: z.preprocess(
    vazioParaUndefined,
    z.coerce
      .number({ error: "Valor inválido." })
      .min(0, "Deve ser entre 0 e 100.")
      .max(100, "Deve ser entre 0 e 100.")
      .optional()
  ),
  observacao: z.string().max(100).optional(),
});
type FormInput = z.input<typeof schema>;
type FormValues = z.output<typeof schema>;

const OPCOES_TIPO_GADO = opcoesDeLabels(TIPO_GADO_LABELS);

export default function NovoNegocioInformacoesPage() {
  const router = useRouter();
  const { data, update } = useNegocioFlow();
  // Comissão só para Admin: para Normal o campo não aparece e nada é enviado (a API ignoraria).
  const admin = useIsAdmin();
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormInput, unknown, FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      tipo_gado: data.tipoGado || undefined,
      tipo_negocio: data.tipoNegocio || undefined,
      data_negocio: data.dataNegocio || new Date().toISOString().slice(0, 10),
      porcentagem_comissao: data.porcentagemComissao ?? undefined,
      observacao: data.observacao,
    },
  });

  React.useEffect(() => {
    if (!data.pecuaristaId) router.replace("/negocios/novo");
    else if (!data.fazendaId) router.replace("/negocios/novo/fazenda");
    else if (!data.compradorId) router.replace("/negocios/novo/comprador");
    else if (!data.modalidade) router.replace("/negocios/novo/modalidade");
  }, [data.fazendaId, data.pecuaristaId, data.compradorId, data.modalidade, router]);

  async function onSubmit(values: FormValues) {
    if (!data.fazendaId || !data.pecuaristaId || !data.compradorId || !data.modalidade) return;
    setSubmitError(null);
    const informacoes = {
      tipoGado: values.tipo_gado,
      tipoNegocio: values.tipo_negocio,
      dataNegocio: values.data_negocio,
      porcentagemComissao: admin ? (values.porcentagem_comissao ?? null) : null,
      observacao: values.observacao ?? "",
    };
    try {
      // Cria o negócio (ou atualiza, se o usuário voltou a esta tela). Id negativo = na fila offline.
      const negocioId = await salvarNegocioDoFluxo({ ...data, ...informacoes });
      update({ ...informacoes, negocioId });
      router.push(data.modalidade === "cabeca" ? "/negocios/novo/lote-unico" : "/negocios/novo/lotes");
    } catch (err) {
      setSubmitError(mensagemDeErro(err));
    }
  }

  if (!data.fazendaId || !data.pecuaristaId || !data.compradorId || !data.modalidade) return null;

  return (
    <div className="page-container page-narrow pt-safe">
      <BackLink href="/negocios/novo/modalidade" />

      <ProgressSteps current={5} total={PASSOS_NOVO_NEGOCIO} />

      <div className={cn(styles.fazendaCard, "glass-dark")}>
        <div className={styles.fazendaCabecalho}>
          <span className="card-icon-on-dark">
            <Warehouse size={18} />
          </span>
          <div>
            <p className={styles.fazendaNome}>{data.fazendaNome}</p>
            <p>Pecuarista: {data.pecuaristaNome}</p>
            <p>Comprador: {data.compradorNome}</p>
            <p>Modalidade: {MODALIDADE_LABELS[data.modalidade]}</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="form-stack date-input-fix">
        <div className="form-fields">
          {submitError ? <p className="form-error">{submitError}</p> : null}

          <Field label="Tipo de Gado" htmlFor="tipo_gado" error={errors.tipo_gado?.message}>
            <Controller
              control={control}
              name="tipo_gado"
              render={({ field }) => (
                <OpcoesBotoes
                  id="tipo_gado"
                  ariaLabel="Tipo de Gado"
                  opcoes={OPCOES_TIPO_GADO}
                  value={field.value}
                  onChange={field.onChange}
                />
              )}
            />
          </Field>

          <Field label="Tipo de Negócio" htmlFor="tipo_negocio" error={errors.tipo_negocio?.message}>
            <Controller
              control={control}
              name="tipo_negocio"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="tipo_negocio" className={cn(fieldBox.box, fieldBox.pink)}>
                    <SelectValue>
                      {(value: TipoNegocio | null) => (value ? TIPO_NEGOCIO_LABELS[value] : "Selecione")}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(TIPO_NEGOCIO_LABELS) as TipoNegocio[]).map((key) => (
                      <SelectItem key={key} value={key}>
                        {TIPO_NEGOCIO_LABELS[key]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </Field>

          <Field label="Data do Negócio" htmlFor="data_negocio" error={errors.data_negocio?.message}>
            <TintedInput id="data_negocio" tint="pink" type="date" {...register("data_negocio")} />
          </Field>

          {admin ? (
            <Field
              label="Comissão % (opcional)"
              htmlFor="porcentagem_comissao"
              error={errors.porcentagem_comissao?.message as string | undefined}
            >
              <Controller
                control={control}
                name="porcentagem_comissao"
                render={({ field }) => (
                  <MaskedNumberInput
                    id="porcentagem_comissao"
                    formato="percentual"
                    name={field.name}
                    value={field.value as number | string | undefined}
                    onValueChange={field.onChange}
                    onBlur={field.onBlur}
                    placeholder="Ex: 5%"
                  />
                )}
              />
            </Field>
          ) : null}

          <Field label="Observação (opcional)" htmlFor="observacao" error={errors.observacao?.message}>
            <TintedInput id="observacao" tint="pink" {...register("observacao")} />
          </Field>
        </div>

        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Salvando..." : "Próximo"}
        </Button>
      </form>
    </div>
  );
}
