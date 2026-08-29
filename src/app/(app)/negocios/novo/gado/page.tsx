"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Warehouse, Beef } from "lucide-react";
import { useForm, useWatch, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { BackLink } from "@/components/back-link";
import { Field } from "@/components/form/field";
import { TintedInput } from "@/components/form/tinted-input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useNegocioFlow, MODALIDADE_LABELS, type Modalidade } from "@/lib/flows/negocio-flow";
import fieldBox from "@/components/form/field-box.module.css";
import styles from "./page.module.css";

const KG_PER_ARROBA = 15;

/**
 * DEMO ONLY (see cadastro-gado-demo.md): "Peso p/ Cálculo", "Peso da Arroba" and
 * "Valor Total" are simulated client-side from local state, with no API call or
 * persistence. The real version should POST to /api/gados and recompute the
 * aggregates (cabeças, valor médio) from the database instead of local state.
 */
const schema = z.object({
  denominacao: z.string().min(2, "Informe a denominação."),
  genero: z.enum(["Macho", "Fêmea"], { error: "Selecione o gênero." }),
  valor: z.coerce.number().nonnegative().optional(),
  pesoTotal: z.coerce.number({ error: "Informe o peso total." }).positive("Deve ser maior que zero."),
});
type FormInput = z.input<typeof schema>;
type FormValues = z.output<typeof schema>;

export default function CadastroGadoPage() {
  const router = useRouter();
  const { data, update, reset } = useNegocioFlow();
  const {
    register,
    handleSubmit,
    control,
    reset: resetForm,
    formState: { errors },
  } = useForm<FormInput, unknown, FormValues>({ resolver: zodResolver(schema) });

  React.useEffect(() => {
    if (!data.fazenda) router.replace("/negocios/novo");
  }, [data.fazenda, router]);

  // Rendimento de carcaça comes from the negócio step already filled in this
  // wizard; fall back to a mocked 50% only if it's somehow unavailable.
  const rendimentoCarcaca = data.rendimentoCarcaca ?? 50;

  const pesoTotalRaw = useWatch({ control, name: "pesoTotal" });
  const pesoTotal = Number(pesoTotalRaw) || 0;
  const pesoCalculo = pesoTotal * (rendimentoCarcaca / 100);
  const pesoArroba = pesoCalculo > 0 ? pesoCalculo / KG_PER_ARROBA : 0;
  const valorTotal = pesoArroba * (data.valorArroba ?? 0);

  const cabecas = data.gados.length;
  const valorMedio = cabecas > 0 ? data.gados.reduce((sum, g) => sum + g.valorTotal, 0) / cabecas : 0;

  function onSubmit(values: FormValues) {
    const pesoCalculoFinal = values.pesoTotal * (rendimentoCarcaca / 100);
    const pesoArrobaFinal = pesoCalculoFinal / KG_PER_ARROBA;
    update({
      gados: [
        ...data.gados,
        {
          id: crypto.randomUUID(),
          denominacao: values.denominacao,
          genero: values.genero,
          valor: values.valor ?? null,
          pesoTotal: values.pesoTotal,
          pesoCalculo: pesoCalculoFinal,
          pesoArroba: pesoArrobaFinal,
          valorTotal: pesoArrobaFinal * (data.valorArroba ?? 0),
        },
      ],
    });
    // Only the user-entered fields reset — calculated fields fall back to 0
    // automatically once pesoTotal clears. Cabeças/valor médio (in the summary
    // card above) persist across submits, per the demo spec.
    resetForm({ denominacao: "", genero: undefined, valor: undefined, pesoTotal: undefined });
  }

  function finalizar() {
    reset();
    router.push("/home");
  }

  if (!data.fazenda) return null;

  return (
    <div className={cn(styles.page, "pt-safe")}>
      <BackLink href="/negocios/novo" />

      <div className={cn(styles.summary, "glass-dark")}>
        <div className={styles.summaryHeader}>
          <span className={styles.summaryIcon}>
            <Warehouse size={18} />
          </span>
          <div>
            <p className={styles.summaryFarm}>Fazenda {data.fazenda}</p>
            <p className={styles.summarySeller}>Vendedor: {data.vendedor}</p>
          </div>
        </div>
        <div className={styles.summaryStats}>
          <div>
            <p className={styles.summaryStatLabel}>Rend. de Carcaça</p>
            <p className={styles.summaryStatValue}>{formatNumber(data.rendimentoCarcaca ?? 0, 0)}%</p>
          </div>
          <div>
            <p className={styles.summaryStatLabel}>Valor p/ arroba</p>
            <p className={styles.summaryStatValue}>{formatCurrency(data.valorArroba ?? 0)}</p>
          </div>
          <div>
            <p className={styles.summaryStatLabel}>Modalidade</p>
            <p className={styles.summaryStatValue}>
              {data.modalidade ? MODALIDADE_LABELS[data.modalidade as Modalidade] : "—"}
            </p>
          </div>
        </div>
        <div className={styles.summaryFooter}>
          <span>
            Cabeças: <b>{cabecas}</b>
          </span>
          <span>
            Valor médio p/ cabeça: <b>{formatCurrency(valorMedio)}</b>
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
        <div className={styles.row}>
          <Field label="Denominação" htmlFor="denominacao" error={errors.denominacao?.message}>
            <TintedInput
              id="denominacao"
              tint="pink"
              placeholder="Ex: Nelore"
              {...register("denominacao")}
            />
          </Field>
          <Field label="Gênero" htmlFor="genero" error={errors.genero?.message}>
            <Controller
              control={control}
              name="genero"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="genero" className={cn(fieldBox.box, fieldBox.pink)}>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Macho">Macho</SelectItem>
                    <SelectItem value="Fêmea">Fêmea</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </Field>
        </div>

      

        <Field label="Peso Total" htmlFor="pesoTotal" error={errors.pesoTotal?.message}>
          <TintedInput
            id="pesoTotal"
            tint="pink"
            type="number"
            inputMode="decimal"
            step="0.01"
            placeholder="kg"
            {...register("pesoTotal")}
          />
        </Field>

        <div className={styles.row}>
          <Field label="Peso p/ Cálculo" htmlFor="pesoCalculo">
            <TintedInput
              id="pesoCalculo"
              tint="none"
              value={pesoCalculo > 0 ? formatNumber(pesoCalculo) : ""}
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
              value={pesoArroba > 0 ? formatNumber(pesoArroba) : ""}
              placeholder="—"
              disabled
              readOnly
              className={styles.readOnlyField}
            />
          </Field>
        </div>

        <div className={styles.totalRow}>
          <span className={styles.totalLabel}>Valor Total</span>
          <span className={styles.totalValue}>{formatCurrency(valorTotal)}</span>
        </div>

        <Button type="submit" variant="brand" size="xl" className="w-full">
          Cadastrar
        </Button>
      </form>

     
    </div>
  );
}
