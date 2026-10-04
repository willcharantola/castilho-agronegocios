"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Warehouse } from "lucide-react";
import { useForm, useWatch, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { BackLink } from "@/components/back-link";
import { ProgressSteps } from "@/components/progress-steps";
import { Field } from "@/components/form/field";
import { TintedInput } from "@/components/form/tinted-input";
import { MaskedNumberInput } from "@/components/form/masked-number-input";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/format";
import { updateNegocio } from "@/lib/api/negocios";
import { enviarOuEnfileirar, ehIdTemporario, referencia } from "@/lib/offline/fila";
import { mensagemDeErro } from "@/lib/offline/rede";
import { useNegocioFlow } from "@/lib/flows/negocio-flow";
import { cn } from "@/lib/utils";
import styles from "./page.module.css";

const schema = z.object({
  quantidade_cabecas: z.coerce
    .number({ error: "Informe a quantidade de cabeças." })
    .int("Deve ser um número inteiro.")
    .positive("Deve ser maior que zero."),
  valor_cabeca: z.coerce.number({ error: "Informe o valor por cabeça." }).positive("Deve ser maior que zero."),
});
type FormInput = z.input<typeof schema>;
type FormValues = z.output<typeof schema>;

/**
 * Modalidade "cabeca": fecha o negócio só com quantidade total e valor por cabeça,
 * sem cadastro individual de gado (nenhum registro em `gado` é criado — ponto em
 * aberto #1, solução provisória). A API recalcula valor_total = qtd × valor.
 */
export default function NovoNegocioQuantidadeCabecasPage() {
  const router = useRouter();
  const { data, reset } = useNegocioFlow();
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormInput, unknown, FormValues>({
    resolver: zodResolver(schema),
  });

  // Mesmo cuidado da tela de gado: `concluir` zera o fluxo antes de navegar, e isso
  // não deve disparar o redirecionamento de volta ao início.
  const negocioIdRef = React.useRef(data.negocioId);
  React.useEffect(() => {
    if (!negocioIdRef.current) router.replace("/negocios/novo");
    else if (data.modalidade && data.modalidade !== "cabeca") router.replace("/negocios/novo/gado");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const quantidadeRaw = useWatch({ control, name: "quantidade_cabecas" });
  const valorCabecaRaw = useWatch({ control, name: "valor_cabeca" });
  const quantidade = Number(quantidadeRaw) || 0;
  const valorCabeca = Number(valorCabecaRaw) || 0;
  const valorTotalEstimado = quantidade * valorCabeca;

  async function onSubmit(values: FormValues) {
    const negocioId = data.negocioId;
    if (!negocioId) return;
    setSubmitError(null);
    try {
      // Horários de pesagem, mais_pesado, mais_leve e valor_medio não se aplicam a
      // "cabeca" e não são enviados (permanecem NULL).
      // A API recalcula valor_total = qtd × valor. Offline (ou com o negócio ainda só no
      // aparelho), a atualização vai para a fila e é aplicada depois da criação do negócio.
      const envio = await enviarOuEnfileirar(
        "negocio_atualizacao",
        {
          ...(await referencia("negocio", negocioId)),
          qtd_animais: values.quantidade_cabecas,
          valor_unidade: values.valor_cabeca,
        },
        ({ negocio_id, ...campos }) => updateNegocio(negocio_id as number, campos)
      );
      reset();
      router.push(envio.sincronizado ? `/negocios/${negocioId}` : "/negocios");
    } catch (err) {
      setSubmitError(mensagemDeErro(err));
    }
  }

  if (!data.negocioId) return null;

  return (
    <div className={cn(styles.page, "pt-safe")}>
      <BackLink
        href={ehIdTemporario(data.negocioId) ? "/negocios" : `/negocios/${data.negocioId}`}
        label={ehIdTemporario(data.negocioId) ? "Negócios" : "Ver negócio"}
      />
      <h1 className={styles.title}>Cadastrar Novo Negócio</h1>
      <ProgressSteps current={6} total={6} />

      <div className={cn(styles.fazendaCard, "glass-dark")}>
        <span className={styles.fazendaIcon}>
          <Warehouse size={18} />
        </span>
        <div>
          <p className={styles.fazendaNome}>{data.fazendaNome}</p>
          <p className={styles.fazendaMeta}>Comprador: {data.compradorNome} · Por Cabeça</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
        <div className={styles.row}>
          <Field
            label="Quantidade de Cabeças"
            htmlFor="quantidade_cabecas"
            error={errors.quantidade_cabecas?.message}
          >
            <TintedInput
              id="quantidade_cabecas"
              tint="pink"
              type="number"
              inputMode="numeric"
              step="1"
              min="1"
              placeholder="Ex: 50"
              {...register("quantidade_cabecas")}
            />
          </Field>

          <Field label="Valor por Cabeça" htmlFor="valor_cabeca" error={errors.valor_cabeca?.message}>
            <Controller
              control={control}
              name="valor_cabeca"
              render={({ field }) => (
                <MaskedNumberInput
                  id="valor_cabeca"
                  formato="moeda"
                  name={field.name}
                  value={field.value as number | string | undefined}
                  onValueChange={field.onChange}
                  onBlur={field.onBlur}
                />
              )}
            />
          </Field>
        </div>

        <div className={styles.totalRow}>
          <span className={styles.totalLabel}>Valor Total (estimado)</span>
          <span className={styles.totalValue}>{formatCurrency(valorTotalEstimado)}</span>
        </div>

        {submitError ? <p className={styles.submitError}>{submitError}</p> : null}

        <Button type="submit" variant="brand" size="xl" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Salvando..." : "Concluir"}
        </Button>
      </form>
    </div>
  );
}
