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
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createNegocio } from "@/lib/api/negocios";
import { getUsuario, ApiError } from "@/lib/api-client";
import { MODALIDADE_LABELS, TIPO_GADO_LABELS, TIPO_LOTE_LABELS } from "@/lib/labels";
import { useNegocioFlow } from "@/lib/flows/negocio-flow";
import { cn } from "@/lib/utils";
import type { TipoLote } from "@/lib/api/types";
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
  tipo_gado: z.enum(["Gordo", "Magro"], { error: "Selecione o tipo de gado." }),
  valor_unidade: z.preprocess(
    vazioParaUndefined,
    z.coerce.number({ error: "Informe o valor por unidade." }).positive("Deve ser maior que zero.").optional()
  ),
  tipo_lote: z.enum(["Vaca", "Boi", "Novilha", "Garrote", "Bezerro", "Variados"], {
    error: "Selecione o tipo de lote.",
  }),
  data_negocio: z.string().min(1, "Informe a data do negócio."),
  comissao: z.preprocess(
    vazioParaUndefined,
    z.coerce.number({ error: "Valor inválido." }).nonnegative("Não pode ser negativa.").optional()
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
      valor_unidade: data.valorUnidade ?? undefined,
      tipo_lote: data.tipoLote || undefined,
      data_negocio: data.dataNegocio || new Date().toISOString().slice(0, 10),
      comissao: data.comissao ?? undefined,
      observacao: data.observacao,
    },
  });

  React.useEffect(() => {
    if (!data.fazendaId) router.replace("/negocios/novo");
    else if (!data.vendedorId) router.replace("/negocios/novo/vendedor");
    else if (!data.compradorId) router.replace("/negocios/novo/comprador");
    else if (!data.modalidade) router.replace("/negocios/novo/modalidade");
  }, [data.fazendaId, data.vendedorId, data.compradorId, data.modalidade, router]);

  async function onSubmit(values: FormValues) {
    if (!data.fazendaId || !data.vendedorId || !data.compradorId || !data.modalidade) return;
    const usuario = getUsuario();
    if (!usuario) {
      setSubmitError("Sessão inválida. Faça login novamente.");
      return;
    }
    setSubmitError(null);
    try {
      const negocio = await createNegocio({
        empresa_id: usuario.empresa_id,
        fazenda_id: data.fazendaId,
        vendedor_id: data.vendedorId,
        comprador_id: data.compradorId,
        modalidade: data.modalidade,
        tipo_gado: values.tipo_gado,
        tipo_lote: values.tipo_lote,
        data_negocio: new Date(values.data_negocio).toISOString(),
        comissao: values.comissao,
        // Na modalidade "cabeca" o valor por cabeça ainda não foi informado: a API exige o
        // campo (NOT NULL), então cria com 0 e a tela quantidade-cabecas o preenche via PATCH.
        valor_unidade: porCabeca ? 0 : (values.valor_unidade ?? 0),
        observacao: values.observacao || undefined,
      });
      update({
        tipoGado: values.tipo_gado,
        valorUnidade: porCabeca ? null : (values.valor_unidade ?? null),
        tipoLote: values.tipo_lote,
        dataNegocio: values.data_negocio,
        comissao: values.comissao ?? null,
        observacao: values.observacao ?? "",
        negocioId: negocio.negocio_id,
      });
      // "cabeca" pula todo o cadastro individual de gado.
      if (data.modalidade === "cabeca") {
        router.push("/negocios/novo/quantidade-cabecas");
      } else {
        router.push("/negocios/novo/gado");
      }
    } catch (err) {
      setSubmitError(err instanceof ApiError || err instanceof Error ? err.message : "Erro ao salvar.");
    }
  }

  if (!data.fazendaId || !data.vendedorId || !data.compradorId || !data.modalidade) return null;

  return (
    <div className={cn(styles.page, "pt-safe")}>
      <BackLink href="/negocios/novo/modalidade" />
      <h1 className={styles.title}>Cadastrar Novo Negócio</h1>
      <ProgressSteps current={5} total={6} />

      <div className={cn(styles.fazendaCard, "glass-dark")}>
        <span className={styles.fazendaIcon}>
          <Warehouse size={18} />
        </span>
        <p className={styles.fazendaNome}>{data.fazendaNome}</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
        <div className={styles.fields}>
          {submitError ? <p className={styles.submitError}>{submitError}</p> : null}

        
          <Field label="Comprador" htmlFor="comprador">
            <TintedInput id="comprador" tint="none" value={data.compradorNome} disabled readOnly />
          </Field>

          <div className={styles.row}>
            <Field label="Tipo de Gado" htmlFor="tipo_gado" error={errors.tipo_gado?.message}>
              <Controller
                control={control}
                name="tipo_gado"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="tipo_gado" className={cn(fieldBox.box, fieldBox.pink)}>
                      <SelectValue>
                        {(value: "Gordo" | "Magro" | null) => (value ? TIPO_GADO_LABELS[value] : "Selecione")}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Gordo">{TIPO_GADO_LABELS.Gordo}</SelectItem>
                      <SelectItem value="Magro">{TIPO_GADO_LABELS.Magro}</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>

            {/* Escolhida no passo anterior — só exibida aqui. */}
            <Field label="Modalidade" htmlFor="modalidade">
              <TintedInput id="modalidade" tint="none" value={MODALIDADE_LABELS[data.modalidade]} disabled readOnly />
            </Field>
          </div>

          {data.modalidade === "cabeca" ? null : (
            <Field
              label={VALOR_UNIDADE_LABELS[data.modalidade]}
              htmlFor="valor_unidade"
              error={errors.valor_unidade?.message}
            >
              <TintedInput
                id="valor_unidade"
                tint="pink"
                type="number"
                inputMode="decimal"
                step="0.01"
                placeholder="R$ 0,00"
                {...register("valor_unidade")}
              />
            </Field>
          )}

          <Field label="Tipo de Lote" htmlFor="tipo_lote" error={errors.tipo_lote?.message}>
            <Controller
              control={control}
              name="tipo_lote"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="tipo_lote" className={cn(fieldBox.box, fieldBox.pink)}>
                    <SelectValue>
                      {(value: TipoLote | null) => (value ? TIPO_LOTE_LABELS[value] : "Selecione")}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(TIPO_LOTE_LABELS) as Array<keyof typeof TIPO_LOTE_LABELS>).map((key) => (
                      <SelectItem key={key} value={key}>
                        {TIPO_LOTE_LABELS[key]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </Field>

          <div className={styles.row}>
            <Field label="Data do Negócio" htmlFor="data_negocio" error={errors.data_negocio?.message}>
              <TintedInput id="data_negocio" tint="pink" type="date" {...register("data_negocio")} />
            </Field>

            <Field label="Comissão (opcional)" htmlFor="comissao" error={errors.comissao?.message as string | undefined}>
              <TintedInput
                id="comissao"
                tint="pink"
                type="number"
                inputMode="decimal"
                step="0.01"
                placeholder="R$ 0,00"
                {...register("comissao")}
              />
            </Field>
          </div>

          <Field label="Observação (opcional)" htmlFor="observacao" error={errors.observacao?.message}>
            <TintedInput id="observacao" tint="pink" {...register("observacao")} />
          </Field>
        </div>

        <Button type="submit"  disabled={isSubmitting}>
          {isSubmitting ? "Salvando..." : "Próximo"}
        </Button>
      </form>
    </div>
  );
}
