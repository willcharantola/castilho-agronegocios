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
import type { Modalidade, TipoLote } from "@/lib/api/types";
import fieldBox from "@/components/form/field-box.module.css";
import styles from "./page.module.css";

const vazioParaUndefined = (v: unknown) => (v === "" || v === null ? undefined : v);

const schema = z.object({
  tipo_gado: z.enum(["Gordo", "Magro"], { error: "Selecione o tipo de gado." }),
  modalidade: z.enum(["arroba", "kg", "cabeca"], { error: "Selecione a modalidade." }),
  valor_unidade: z.coerce.number({ error: "Informe o valor por unidade." }).positive("Deve ser maior que zero."),
  tipo_lote: z.enum(["Vaca", "Boi", "Novilha", "Garrote", "Bezerro", "Variados"], {
    error: "Selecione o tipo de lote.",
  }),
  // Domínio de valores ainda não definido — texto livre (varchar(10)), sem Select.
  tipo_precificacao: z.string().min(1, "Informe o tipo de precificação.").max(10, "Máximo de 10 caracteres."),
  data_negocio: z.string().min(1, "Informe a data do negócio."),
  hora_inicio_pesagem: z.string().min(1, "Informe a hora de início."),
  hora_fim_pesagem: z.string().min(1, "Informe a hora de fim."),
  comissao: z.preprocess(
    vazioParaUndefined,
    z.coerce.number({ error: "Valor inválido." }).nonnegative("Não pode ser negativa.").optional()
  ),
  observacao: z.string().max(100).optional(),
});
type FormInput = z.input<typeof schema>;
type FormValues = z.output<typeof schema>;

export default function NovoNegocioInformacoesPage() {
  const router = useRouter();
  const { data, update } = useNegocioFlow();
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
      modalidade: data.modalidade || undefined,
      valor_unidade: data.valorUnidade ?? undefined,
      tipo_lote: data.tipoLote || undefined,
      tipo_precificacao: data.tipoPrecificacao,
      hora_inicio_pesagem: data.horaInicioPesagem,
      hora_fim_pesagem: data.horaFimPesagem,
      data_negocio: data.dataNegocio || new Date().toISOString().slice(0, 10),
      comissao: data.comissao ?? undefined,
      observacao: data.observacao,
    },
  });

  React.useEffect(() => {
    if (!data.fazendaId) router.replace("/negocios/novo");
    else if (!data.vendedorId) router.replace("/negocios/novo/vendedor");
    else if (!data.compradorId) router.replace("/negocios/novo/comprador");
  }, [data.fazendaId, data.vendedorId, data.compradorId, router]);

  async function onSubmit(values: FormValues) {
    if (!data.fazendaId || !data.vendedorId || !data.compradorId) return;
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
        hora_inicio_pesagem: values.hora_inicio_pesagem,
        hora_fim_pesagem: values.hora_fim_pesagem,
        modalidade: values.modalidade,
        tipo_gado: values.tipo_gado,
        tipo_lote: values.tipo_lote,
        tipo_precificacao: values.tipo_precificacao,
        data_negocio: new Date(values.data_negocio).toISOString(),
        comissao: values.comissao,
        valor_unidade: values.valor_unidade,
        observacao: values.observacao || undefined,
      });
      update({
        tipoGado: values.tipo_gado,
        modalidade: values.modalidade,
        valorUnidade: values.valor_unidade,
        tipoLote: values.tipo_lote,
        tipoPrecificacao: values.tipo_precificacao,
        horaInicioPesagem: values.hora_inicio_pesagem,
        horaFimPesagem: values.hora_fim_pesagem,
        dataNegocio: values.data_negocio,
        comissao: values.comissao ?? null,
        observacao: values.observacao ?? "",
        negocioId: negocio.negocio_id,
      });
      router.push("/negocios/novo/gado");
    } catch (err) {
      setSubmitError(err instanceof ApiError || err instanceof Error ? err.message : "Erro ao salvar.");
    }
  }

  if (!data.fazendaId || !data.vendedorId || !data.compradorId) return null;

  return (
    <div className={cn(styles.page, "pt-safe")}>
      <BackLink href="/negocios/novo/comprador" />
      <h1 className={styles.title}>Cadastrar Novo Negócio</h1>
      <ProgressSteps current={4} total={5} />

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

            <Field label="Modalidade" htmlFor="modalidade" error={errors.modalidade?.message}>
              <Controller
                control={control}
                name="modalidade"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="modalidade" className={cn(fieldBox.box, fieldBox.pink)}>
                      <SelectValue>
                        {(value: Modalidade | null) => (value ? MODALIDADE_LABELS[value] : "Selecione")}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(MODALIDADE_LABELS) as Array<keyof typeof MODALIDADE_LABELS>).map((key) => (
                        <SelectItem key={key} value={key}>
                          {MODALIDADE_LABELS[key]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>
          </div>

            <Field
              label="Valor Un. (Arroba, Kg ou Cabeça)"
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

           
        

          <div className={styles.row}>

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

            <Field label="Tipo de Precificação" htmlFor="tipo_precificacao" error={errors.tipo_precificacao?.message}>
              <TintedInput id="tipo_precificacao" tint="pink" maxLength={10} {...register("tipo_precificacao")} />
            </Field>
          </div>

          <div className={styles.row}>
            <Field label="Hora Início Pesagem" htmlFor="hora_inicio_pesagem" error={errors.hora_inicio_pesagem?.message}>
              <TintedInput id="hora_inicio_pesagem" tint="pink" type="time" {...register("hora_inicio_pesagem")} />
            </Field>

            <Field label="Hora Fim Pesagem" htmlFor="hora_fim_pesagem" error={errors.hora_fim_pesagem?.message}>
              <TintedInput id="hora_fim_pesagem" tint="pink" type="time" {...register("hora_fim_pesagem")} />
            </Field>
          </div>

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
