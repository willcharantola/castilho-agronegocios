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
import { MODALIDADE_LABELS, TIPO_GADO_LABELS, TIPO_LOTE_LABELS, TIPO_NEGOCIO_LABELS } from "@/lib/labels";
import { useNegocioFlow } from "@/lib/flows/negocio-flow";
import { criarNegocioDoFluxo } from "@/lib/flows/criar-negocio";
import { mensagemDeErro } from "@/lib/offline/rede";
import { cn } from "@/lib/utils";
import type { TipoNegocio } from "@/lib/api/types";
import fieldBox from "@/components/form/field-box.module.css";
import styles from "./page.module.css";

const vazioParaUndefined = (v: unknown) => (v === "" || v === null ? undefined : v);

// A modalidade é escolhida no passo anterior (/negocios/novo/modalidade). Na modalidade
// "cabeca" o valor por cabeça é informado na tela seguinte (/negocios/novo/quantidade-cabecas)
// — por isso o campo é opcional aqui e só exigido (via superRefine) para "arroba"/"kg".
// Horários de pesagem não são informados pelo usuário: a API os registra sozinha.
const criarSchema = (porCabeca: boolean) =>
  z
    .object({
      tipo_gado: z.enum(["Gordo", "Reposicao"], { error: "Selecione o tipo de gado." }),
      tipo_lote: z.enum(["Vaca", "Boi", "Novilha", "Garrote", "Bezerro", "Variados"], {
        error: "Selecione o tipo de lote.",
      }),
      // Sem valor padrão: o usuário precisa escolher (define Funrural e Senar).
      tipo_negocio: z.enum(["Desconto em folha", "Livre", "Funrural"], { error: "Selecione o tipo de negócio." }),
      // Texto livre (ex.: "8,9 e 10"); só o tamanho da coluna (VARCHAR(30)) é limitado.
      media_carimbo: z
        .string({ error: "Informe a média do carimbo." })
        .trim()
        .min(1, "Informe a média do carimbo.")
        .max(30, "Máximo de 30 caracteres."),
      valor_unidade: z.preprocess(
        vazioParaUndefined,
        z.coerce.number({ error: "Informe o valor por unidade." }).positive("Deve ser maior que zero.").optional()
      ),
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
    })
    .superRefine((values, ctx) => {
      if (porCabeca) return;
      if (values.valor_unidade === undefined) {
        ctx.addIssue({ code: "custom", path: ["valor_unidade"], message: "Informe o valor por unidade." });
      }
    });
type FormSchema = ReturnType<typeof criarSchema>;
type FormInput = z.input<FormSchema>;
type FormValues = z.output<FormSchema>;

const VALOR_UNIDADE_LABELS = { arroba: "Valor por Arroba", kg: "Valor por Kg" } as const;

const OPCOES_TIPO_GADO = opcoesDeLabels(TIPO_GADO_LABELS);
const OPCOES_TIPO_LOTE = opcoesDeLabels(TIPO_LOTE_LABELS);

export default function NovoNegocioInformacoesPage() {
  const router = useRouter();
  const { data, update } = useNegocioFlow();
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const porCabeca = data.modalidade === "cabeca";
  const schema = React.useMemo(() => criarSchema(porCabeca), [porCabeca]);
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormInput, unknown, FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      tipo_gado: data.tipoGado || undefined,
      tipo_lote: data.tipoLote || undefined,
      tipo_negocio: data.tipoNegocio || undefined,
      media_carimbo: data.mediaCarimbo || undefined,
      valor_unidade: data.valorUnidade ?? undefined,
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
      tipoLote: values.tipo_lote,
      tipoNegocio: values.tipo_negocio,
      mediaCarimbo: values.media_carimbo,
      valorUnidade: porCabeca ? null : (values.valor_unidade ?? null),
      dataNegocio: values.data_negocio,
      porcentagemComissao: values.porcentagem_comissao ?? null,
      observacao: values.observacao ?? "",
    };
    update(informacoes);

    // "arroba": os rendimentos por categoria são obrigatórios na criação — o negócio é
    // criado na tela seguinte (com estas informações, mesmo que um anterior já exista).
    if (data.modalidade === "arroba") {
      update({ negocioId: null });
      router.push("/negocios/novo/rendimentos");
      return;
    }
    try {
      const negocioId = await criarNegocioDoFluxo({ ...data, ...informacoes });
      // Id temporário (negativo) enquanto o negócio estiver só no aparelho.
      update({ negocioId });
      // "cabeca" pula todo o cadastro individual de gado.
      router.push(porCabeca ? "/negocios/novo/quantidade-cabecas" : "/negocios/novo/gado");
    } catch (err) {
      setSubmitError(mensagemDeErro(err));
    }
  }

  if (!data.fazendaId || !data.pecuaristaId || !data.compradorId || !data.modalidade) return null;

  return (
    <div className="page-container page-narrow pt-safe">
      <BackLink href="/negocios/novo/modalidade" />

      <ProgressSteps current={5} total={7} />

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

          <Field label="Tipo de Lote" htmlFor="tipo_lote" error={errors.tipo_lote?.message}>
            <Controller
              control={control}
              name="tipo_lote"
              render={({ field }) => (
                <OpcoesBotoes
                  id="tipo_lote"
                  ariaLabel="Tipo de Lote"
                  opcoes={OPCOES_TIPO_LOTE}
                  value={field.value}
                  onChange={field.onChange}
                />
              )}
            />
          </Field>

          <div className="form-row">
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

            <Field label="Carimbo (média)" htmlFor="media_carimbo" error={errors.media_carimbo?.message}>
              <TintedInput
                id="media_carimbo"
                tint="pink"
                maxLength={30}
                placeholder="Ex: 8,9 e 10"
                {...register("media_carimbo")}
              />
            </Field>
          </div>

          {data.modalidade === "cabeca" ? null : (
            <Field
              label={VALOR_UNIDADE_LABELS[data.modalidade]}
              htmlFor="valor_unidade"
              error={errors.valor_unidade?.message}
            >
              <Controller
                control={control}
                name="valor_unidade"
                render={({ field }) => (
                  <MaskedNumberInput
                    id="valor_unidade"
                    formato="moeda"
                    name={field.name}
                    value={field.value as number | string | undefined}
                    onValueChange={field.onChange}
                    onBlur={field.onBlur}
                  />
                )}
              />
            </Field>
          )}

          <Field label="Data do Negócio" htmlFor="data_negocio" error={errors.data_negocio?.message}>
            <TintedInput id="data_negocio" tint="pink" type="date" {...register("data_negocio")} />
          </Field>

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
