"use client";

import { useRouter } from "next/navigation";
import { User, Warehouse, Percent } from "lucide-react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { BackLink } from "@/components/back-link";
import { IconField } from "@/components/form/icon-field";
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
import { useNegocioFlow, MODALIDADE_LABELS, type Modalidade } from "@/lib/flows/negocio-flow";
import { cn } from "@/lib/utils";
import fieldBox from "@/components/form/field-box.module.css";
import styles from "./page.module.css";

const schema = z.object({
  vendedor: z.string().min(2, "Informe o vendedor."),
  fazenda: z.string().min(2, "Informe a fazenda."),
  rendimentoCarcaca: z.coerce
    .number({ error: "Informe o rendimento de carcaça." })
    .min(0, "Deve ser entre 0 e 100.")
    .max(100, "Deve ser entre 0 e 100."),
  modalidade: z.enum(["arroba", "cabeca", "kg"], { error: "Selecione a modalidade." }),
  valorArroba: z.coerce
    .number({ error: "Informe o valor por arroba." })
    .positive("Deve ser maior que zero."),
});
type FormInput = z.input<typeof schema>;
type FormValues = z.output<typeof schema>;

export default function NovoNegocioPage() {
  const router = useRouter();
  const { data, update } = useNegocioFlow();
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<FormInput, unknown, FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      vendedor: data.vendedor,
      fazenda: data.fazenda,
      rendimentoCarcaca: data.rendimentoCarcaca ?? undefined,
      modalidade: data.modalidade || undefined,
      valorArroba: data.valorArroba ?? undefined,
    },
  });

  function onSubmit(values: FormValues) {
    update(values);
    router.push("/negocios/novo/gado");
  }

  return (
    <div className={cn(styles.page, "pt-safe")}>
      <BackLink href="/home" />
      <h1 className={styles.title}>Dados do negócio</h1>

      <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
        <div className={styles.fields}>
          <IconField
            icon={User}
            label="Vendedor"
            htmlFor="vendedor"
            error={errors.vendedor?.message}
          >
            <TintedInput
              id="vendedor"
              tint="pink"
              placeholder="Nome do vendedor"
              autoFocus
              {...register("vendedor")}
            />
          </IconField>

          <IconField
            icon={Warehouse}
            label="Fazenda"
            htmlFor="fazenda"
            error={errors.fazenda?.message}
          >
            <TintedInput
              id="fazenda"
              tint="pink"
              placeholder="Nome da fazenda"
              {...register("fazenda")}
            />
          </IconField>

          <IconField
            icon={Percent}
            label="Rendimento de Carcaça"
            htmlFor="rendimentoCarcaca"
            error={errors.rendimentoCarcaca?.message}
          >
            <TintedInput
              id="rendimentoCarcaca"
              tint="pink"
              type="number"
              inputMode="decimal"
              step="0.01"
              placeholder="Ex: 50"
              {...register("rendimentoCarcaca")}
            />
          </IconField>

          <div className={styles.row}>
            <Field label="Modalidade" htmlFor="modalidade" error={errors.modalidade?.message}>
              <Controller
                control={control}
                name="modalidade"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger
                      id="modalidade"
                      className={cn(fieldBox.box, fieldBox.pink)}
                    >
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(MODALIDADE_LABELS) as Modalidade[]).map((key) => (
                        <SelectItem key={key} value={key}>
                          {MODALIDADE_LABELS[key]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>

            <Field
              label="Valor por Arroba"
              htmlFor="valorArroba"
              error={errors.valorArroba?.message}
            >
              <TintedInput
                id="valorArroba"
                tint="pink"
                type="number"
                inputMode="decimal"
                step="0.01"
                placeholder="R$ 0,00"
                {...register("valorArroba")}
              />
            </Field>
          </div>
        </div>

        <Button type="submit" variant="brand" size="xl" className="w-full">
          Próximo
        </Button>
      </form>
    </div>
  );
}
