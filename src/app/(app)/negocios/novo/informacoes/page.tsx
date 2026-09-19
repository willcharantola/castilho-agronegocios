"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Warehouse } from "lucide-react";
import { useForm, Controller, useWatch } from "react-hook-form";
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

const schema = z.object({
 
  comprador: z.string().min(1, "Informe o comprador.").max(50),
  tipo_gado: z.enum(["Gordo", "Magro"], { error: "Selecione o tipo de gado." }),
  modalidade: z.enum(["arroba", "kg", "cabeca"], { error: "Selecione a modalidade." }),
  valor_arroba: z.coerce.number({ error: "Informe o valor por unidade." }).positive("Deve ser maior que zero."),
  rendimento_carcaca: z.coerce
    .number({ error: "Informe o rendimento de carcaça." })
    .min(0, "Deve ser entre 0 e 100.")
    .max(100, "Deve ser entre 0 e 100."),
  tipo_lote: z.enum(["Vaca", "Boi", "Novilha", "Garrote", "Bezerro", "Variados"], {
    error: "Selecione o tipo de lote.",
  }),
  data_negocio: z.string().min(1, "Informe a data do negócio."),
  comissao: z.coerce.number({ error: "Informe a comissão." }).nonnegative("Não pode ser negativa."),
  observacao: z.string().min(1, "Informe uma observação.").max(100),
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
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormInput, unknown, FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
     
      comprador: data.comprador,
      tipo_gado: data.tipoGado || undefined,
      modalidade: data.modalidade || undefined,
      valor_arroba: data.valorArroba ?? undefined,
      rendimento_carcaca: data.rendimentoCarcaca ?? undefined,
      tipo_lote: data.tipoLote || undefined,
      data_negocio: data.dataNegocio || new Date().toISOString().slice(0, 10),
      comissao: data.comissao ?? undefined,
      observacao: data.observacao,
    },
  });

  React.useEffect(() => {
    if (!data.fazendaId) router.replace("/negocios/novo");
  }, [data.fazendaId, router]);

  const modalidade = useWatch({ control, name: "modalidade" });
  const isArroba = modalidade === "arroba";

  React.useEffect(() => {
    if (!isArroba) setValue("rendimento_carcaca", 100);
  }, [isArroba, setValue]);

  async function onSubmit(values: FormValues) {
    if (!data.fazendaId) return;
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
        marchante: "valor do marchante", // retirar 
        comprador: values.comprador,
        modalidade: values.modalidade,
        tipo_gado: values.tipo_gado,
        tipo_lote: values.tipo_lote,
        tipo_precificacao: "valor precificacao", // retirar
        rendimento_carcaca: values.rendimento_carcaca,
        data_negocio: new Date(values.data_negocio).toISOString(),
        comissao: values.comissao,
        valor_arroba: values.valor_arroba,
        observacao: values.observacao,
      });
      update({
     
        comprador: values.comprador,
        tipoGado: values.tipo_gado,
        modalidade: values.modalidade,
        valorArroba: values.valor_arroba,
        rendimentoCarcaca: values.rendimento_carcaca,
        tipoLote: values.tipo_lote,
        dataNegocio: values.data_negocio,
        comissao: values.comissao,
        observacao: values.observacao,
        negocioId: negocio.negocio_id,
      });
      router.push("/negocios/novo/gado");
    } catch (err) {
      setSubmitError(err instanceof ApiError || err instanceof Error ? err.message : "Erro ao salvar.");
    }
  }

  if (!data.fazendaId) return null;

  return (
    <div className={cn(styles.page, "pt-safe")}>
      <BackLink href="/negocios/novo/vendedor" />
      <h1 className={styles.title}>Cadastrar Novo Negócio</h1>
      <ProgressSteps current={3} total={4} />

      <div className={cn(styles.fazendaCard, "glass-dark")}>
        <span className={styles.fazendaIcon}>
          <Warehouse size={18} />
        </span>
        <p className={styles.fazendaNome}>{data.fazendaNome}</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
        <div className={styles.fields}>
          {submitError ? <p className={styles.submitError}>{submitError}</p> : null}

        
          <Field label="Comprador" htmlFor="comprador" error={errors.comprador?.message}>
            <TintedInput id="comprador" tint="pink" placeholder="Nome do comprador" {...register("comprador")} />
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
              htmlFor="valor_arroba"
              error={errors.valor_arroba?.message}
            >
              <TintedInput
                id="valor_arroba"
                tint="pink"
                type="number"
                inputMode="decimal"
                step="0.01"
                placeholder="R$ 0,00"
                {...register("valor_arroba")}
              />
            </Field>

           
        

          <div className={styles.row}>

             <Field
              label="Rendimento de carcaça"
              htmlFor="rendimento_carcaca"
              error={errors.rendimento_carcaca?.message}
            >
              <TintedInput
                id="rendimento_carcaca"
                tint={isArroba ? "pink" : "none"}
                type="number"
                inputMode="decimal"
                step="0.01"
                placeholder="Ex: 50"
                disabled={!isArroba}
                readOnly={!isArroba}
                {...register("rendimento_carcaca")}
              />
            </Field>

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

          </div>

          <div className={styles.row}>
            <Field label="Data do Negócio" htmlFor="data_negocio" error={errors.data_negocio?.message}>
              <TintedInput id="data_negocio" tint="pink" type="date" {...register("data_negocio")} />
            </Field>

            <Field label="Comissão" htmlFor="comissao" error={errors.comissao?.message}>
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

          <Field label="Observação" htmlFor="observacao" error={errors.observacao?.message}>
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
