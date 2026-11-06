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
import { OpcoesBotoes, opcoesDeLabels } from "@/components/form/opcoes-botoes";
import { Button } from "@/components/ui/button";
import { toDateInputValue, formatFazenda } from "@/lib/format";
import { MODALIDADE_LABELS, TIPO_GADO_LABELS, TIPO_NEGOCIO_LABELS } from "@/lib/labels";
import { PASSOS_NOVO_NEGOCIO, useNegocioFlow } from "@/lib/flows/negocio-flow";
import { salvarNegocioDoFluxo } from "@/lib/flows/criar-negocio";
import { mensagemDeErro } from "@/lib/offline/rede";
import { cn } from "@/lib/utils";
import styles from "./page.module.css";

// A modalidade é escolhida no passo anterior. Valor da unidade, tipo de lote, carimbo e
// rendimento são de cada lote (próxima tela). Horários de pesagem são registrados pela API.
// A data do negócio não aparece no formulário: vai a data de hoje (ou a já salva no fluxo).
// A comissão é preenchida depois, no detalhe do negócio; aqui o negócio nasce sem ela.
const schema = z.object({
  tipo_gado: z.enum(["Gordo", "Reposicao"], { error: "Selecione o tipo de gado." }),
  // Sem valor padrão: o usuário precisa escolher (define Funrural e Senar).
  tipo_negocio: z.enum(["Desconto em folha", "Livre", "Funrural"], { error: "Selecione o tipo de negócio." }),
  observacao: z.string().max(100).optional(),
});
type FormInput = z.input<typeof schema>;
type FormValues = z.output<typeof schema>;

const OPCOES_TIPO_GADO = opcoesDeLabels(TIPO_GADO_LABELS);
const OPCOES_TIPO_NEGOCIO = opcoesDeLabels(TIPO_NEGOCIO_LABELS);

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
      tipo_negocio: data.tipoNegocio || undefined,
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
      dataNegocio: data.dataNegocio || toDateInputValue(new Date()),
      porcentagemComissao: null,
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
            <p className={styles.fazendaNome}>{formatFazenda(data.fazendaNome)}</p>
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
                <OpcoesBotoes
                  id="tipo_negocio"
                  ariaLabel="Tipo de Negócio"
                  opcoes={OPCOES_TIPO_NEGOCIO}
                  value={field.value}
                  onChange={field.onChange}
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
