"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Beef, Warehouse } from "lucide-react";
import { useForm, Controller, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { BackLink } from "@/components/back-link";
import { ProgressSteps } from "@/components/progress-steps";
import { Field } from "@/components/form/field";
import { TintedInput } from "@/components/form/tinted-input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency, formatNumber, formatGenero } from "@/lib/format";
import { createGado } from "@/lib/api/gados";
import { fetchNegocio } from "@/lib/api/negocios";
import { ApiError } from "@/lib/api-client";
import { MESES_LABELS, MODALIDADE_LABELS } from "@/lib/labels";
import { useNegocioFlow } from "@/lib/flows/negocio-flow";
import { cn } from "@/lib/utils";
import type { NegocioDetail, Modalidade } from "@/lib/api/types";
import fieldBox from "@/components/form/field-box.module.css";
import styles from "./page.module.css";

const KG_PER_ARROBA = 15;

const schema = z.object({
  denominacao: z.string().min(2, "Informe a denominação.").max(20),
  genero: z.enum(["Macho", "Femea"], { error: "Selecione o gênero." }),
  peso_total: z.coerce.number({ error: "Informe o peso total." }).positive("Deve ser maior que zero."),
  data_pesagem: z.string().min(1, "Informe a data de pesagem."),
  rendimento_carcaca: z.coerce
    .number({ error: "Informe o rendimento de carcaça." })
    .min(0, "Deve ser entre 0 e 100.")
    .max(100, "Deve ser entre 0 e 100."),
  horario_pesagem: z.string().optional(),
  // Mês (1 a 12) e ano de referência definidos pelo cliente.
  carimbo: z.enum(["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"], { error: "Selecione o mês." }),
  ano_carimbo: z.string().regex(/^\d{4}$/, "Informe o ano com 4 dígitos (ex: 2025)."),
});
type FormInput = z.input<typeof schema>;
type FormValues = z.output<typeof schema>;

export default function NovoNegocioGadoPage() {
  const router = useRouter();
  const { data, reset } = useNegocioFlow();
  const [negocio, setNegocio] = React.useState<NegocioDetail | null>(null);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const {
    register,
    handleSubmit,
    control,
    reset: resetForm,
    getValues,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormInput, unknown, FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { data_pesagem: new Date().toISOString().slice(0, 10), horario_pesagem: "" },
  });

  const carregarNegocio = React.useCallback(() => {
    if (!data.negocioId) return Promise.resolve();
    return fetchNegocio(data.negocioId)
      .then(setNegocio)
      .catch((err: unknown) => {
        setLoadError(err instanceof ApiError || err instanceof Error ? err.message : "Erro ao carregar.");
      });
  }, [data.negocioId]);

  // Guarda o valor visto na primeira renderização — `concluir()` zera
  // `data.negocioId` de propósito antes de navegar para longe, e não
  // queremos que isso dispare este redirecionamento de volta ao passo 1.
  const negocioIdRef = React.useRef(data.negocioId);
  React.useEffect(() => {
    if (!negocioIdRef.current) {
      router.replace("/negocios/novo");
      return;
    }
    carregarNegocio();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pesoTotalRaw = useWatch({ control, name: "peso_total" });
  const pesoTotal = Number(pesoTotalRaw) || 0;
  // Agora é por animal (editável durante a pesagem), não mais herdado do negócio.
  const rendimentoCarcaca = Number(useWatch({ control, name: "rendimento_carcaca" })) || 0;
  const valorUnidade = negocio?.valor_unidade ?? 0;
  const modalidade = negocio?.modalidade;
  // Só "arroba" usa o rendimento no cálculo; nas demais modalidades sugerimos 100 (ainda editável).
  const rendimentoPadrao = modalidade === "arroba" ? "" : 100;

  React.useEffect(() => {
    if (modalidade && modalidade !== "arroba" && getValues("rendimento_carcaca") === undefined) {
      setValue("rendimento_carcaca", 100);
    }
  }, [modalidade, getValues, setValue]);

  let pesoCalculoEstimado = 0;
  let pesoArrobaEstimado = 0;
  let valorEstimado = 0;

  switch (modalidade) {
    case "arroba": {
      pesoCalculoEstimado = pesoTotal * (rendimentoCarcaca / 100);
      pesoArrobaEstimado =
        pesoCalculoEstimado > 0 ? Math.ceil(pesoCalculoEstimado / KG_PER_ARROBA) : 0;
      valorEstimado = pesoArrobaEstimado * valorUnidade;
      break;
    }
    case "kg": {
      valorEstimado = valorUnidade * pesoTotal;
      break;
    }
    case "cabeca": {
      valorEstimado = valorUnidade;
      break;
    }
  }

  async function onSubmit(values: FormValues) {
    if (!data.negocioId) return;
    setSubmitError(null);
    try {
      await createGado({
        negocio_id: data.negocioId,
        peso_total: values.peso_total,
        rendimento_carcaca: values.rendimento_carcaca,
        data_pesagem: new Date(values.data_pesagem).toISOString(),
        horario_pesagem: values.horario_pesagem || undefined,
        genero: values.genero,
        denominacao: values.denominacao,
        carimbo: Number(values.carimbo),
        ano_carimbo: values.ano_carimbo,
      });
      await carregarNegocio();
      resetForm({
        denominacao: "",
        genero: undefined,
        peso_total: "",
        rendimento_carcaca: rendimentoPadrao,
        data_pesagem: new Date().toISOString().slice(0, 10),
        horario_pesagem: "",
        carimbo: undefined,
        ano_carimbo: values.ano_carimbo,
      });
    } catch (err) {
      setSubmitError(err instanceof ApiError || err instanceof Error ? err.message : "Erro ao cadastrar.");
    }
  }

  function concluir() {
    const negocioId = data.negocioId;
    reset();
    if (negocioId) router.push(`/negocios/${negocioId}`);
  }

  if (!data.negocioId) return null;

  return (
    <div className={cn(styles.page, "pt-safe")}>
      <BackLink href={`/negocios/${data.negocioId}`} label="Ver negócio" />
      <h1 className={styles.title}>Cadastrar Novo Negócio</h1>
      <ProgressSteps current={5} total={5} />

      {loadError ? <div className={cn(styles.state, styles.stateError, "glass-panel")}>{loadError}</div> : null}

      {negocio ? (
        <div className={cn(styles.summary, "glass-dark")}>
          <div className={styles.summaryHeader}>
            <span className={styles.summaryIcon}>
              <Warehouse size={18} />
            </span>
            <div>
              <p className={styles.summaryFarm}>Fazenda {data.fazendaNome}</p>
              <p className={styles.summarySeller}>Vendedor: {negocio.vendedor.nome_vendedor}</p>
              <p className={styles.summarySeller}>Comprador: {negocio.comprador.nome_empresa}</p>
            </div>
          </div>
          <div className={styles.summaryStats}>
            <div>
              <p className={styles.summaryStatLabel}>Precificação</p>
              <p className={styles.summaryStatValue}>{negocio.tipo_precificacao}</p>
            </div>
            <div>
              <p className={styles.summaryStatLabel}>Valor p/ Un.</p>
              <p className={styles.summaryStatValue}>{formatCurrency(negocio.valor_unidade)}</p>
            </div>
            <div>
              <p className={styles.summaryStatLabel}>Modalidade</p>
              <p className={styles.summaryStatValue}>{MODALIDADE_LABELS[negocio.modalidade as Modalidade]}</p>
            </div>
          </div>
          <div className={styles.summaryFooter}>
            <span>
              Cabeças: <b>{negocio.qtd_animais ?? negocio.gados.length}</b>
            </span>
            <span>
              Valor médio p/ cabeça:{" "}
              <b>{negocio.valor_medio !== null ? formatCurrency(negocio.valor_medio) : "—"}</b>
            </span>
          </div>
        </div>
      ) : null}

      <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
        <div className={styles.row}>
          <Field label="Denominação" htmlFor="denominacao" error={errors.denominacao?.message}>
            <TintedInput id="denominacao" tint="pink" placeholder="Ex: Nelore" {...register("denominacao")} />
          </Field>
          <Field label="Gênero" htmlFor="genero" error={errors.genero?.message}>
            <Controller
              control={control}
              name="genero"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="genero" className={cn(fieldBox.box, fieldBox.pink)}>
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
          <Field label="Carimbo (mês)" htmlFor="carimbo" error={errors.carimbo?.message}>
            <Controller
              control={control}
              name="carimbo"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="carimbo" className={cn(fieldBox.box, fieldBox.pink)}>
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
          <Field label="Ano do Carimbo" htmlFor="ano_carimbo" error={errors.ano_carimbo?.message}>
            <TintedInput
              id="ano_carimbo"
              tint="pink"
              type="number"
              inputMode="numeric"
              placeholder="Ex: 2025"
              {...register("ano_carimbo")}
            />
          </Field>
        </div>

        <Field label="Peso Total" htmlFor="peso_total" error={errors.peso_total?.message}>
          <TintedInput
            id="peso_total"
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
          htmlFor="rendimento_carcaca"
          error={errors.rendimento_carcaca?.message}
        >
          <TintedInput
            id="rendimento_carcaca"
            tint="pink"
            type="number"
            inputMode="decimal"
            step="0.01"
            placeholder="Ex: 50"
            {...register("rendimento_carcaca")}
          />
        </Field>

        <div className={styles.row}>
          <Field label="Data de Pesagem" htmlFor="data_pesagem" error={errors.data_pesagem?.message}>
            <TintedInput id="data_pesagem" tint="pink" type="date" {...register("data_pesagem")} />
          </Field>
          <Field label="Horário (opcional)" htmlFor="horario_pesagem" error={errors.horario_pesagem?.message}>
            <TintedInput id="horario_pesagem" tint="pink" type="time" {...register("horario_pesagem")} />
          </Field>
        </div>

        {modalidade === "arroba" ? (
          <div className={styles.row}>
            <Field label="Peso p/ Cálculo" htmlFor="pesoCalculo">
              <TintedInput
                id="pesoCalculo"
                tint="none"
                value={pesoCalculoEstimado > 0 ? formatNumber(pesoCalculoEstimado) : ""}
                placeholder="—"
                disabled
                readOnly
                className={styles.readOnlyField}
              />
            </Field>
            <Field label="Peso da Arroba" htmlFor="pesoArroba">
              <TintedInput
                id="pesoArroba"
                tint="none"
                value={pesoArrobaEstimado > 0 ? formatNumber(pesoArrobaEstimado) : ""}
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
          <span className={styles.totalValue}>{formatCurrency(valorEstimado)}</span>
        </div>

        {submitError ? <p className={styles.submitError}>{submitError}</p> : null}

        <Button type="submit" variant="brand" size="xl" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Cadastrando..." : "Cadastrar"}
        </Button>
      </form>

      {negocio ? (
        <div className={styles.sessionList}>
          {negocio.gados.length > 0 ? (
            <>
              <p className={styles.sessionTitle}>Gado cadastrado neste negócio</p>
              <div className={styles.sessionItems}>
                {negocio.gados.map((gado) => (
                  <div key={gado.gado_id} className={styles.sessionRow}>
                    <span className={styles.sessionIcon}>
                      <Beef size={18} />
                    </span>
                    <div className={styles.sessionInfo}>
                      <p className={styles.sessionName}>{gado.denominacao}</p>
                      <p className={styles.sessionMeta}>
                        {formatGenero(gado.genero)} · Peso p/ cálculo: {formatNumber(gado.peso_calculo)}
                      </p>
                    </div>
                    <div className={styles.sessionAmount}>
                      <p className={styles.sessionAmountValue}>
                        {gado.valor_total !== null ? formatCurrency(gado.valor_total) : "—"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : null}
          <Button type="button" variant="ghost" size="xl" className={styles.finishButton} onClick={concluir}>
            Concluir
          </Button>
        </div>
      ) : null}
    </div>
  );
}
