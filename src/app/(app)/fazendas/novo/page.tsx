"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { FileText, MapPin, Warehouse } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { BackLink } from "@/components/back-link";
import { IconField } from "@/components/form/icon-field";
import { TintedInput } from "@/components/form/tinted-input";
import { Button } from "@/components/ui/button";
import { createFazenda } from "@/lib/api/fazendas";
import { ApiError } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import styles from "./page.module.css";

const schema = z.object({
  nome_fazenda: z.string().min(2, "Informe o nome da fazenda.").max(50),
  municipio: z.string().min(2, "Informe o município.").max(20),
  inscricao_estadual: z.string().min(1, "Informe a inscrição estadual.").max(12),
});
type FormValues = z.infer<typeof schema>;

export default function NovaFazendaPage() {
  const router = useRouter();
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(values: FormValues) {
    setSubmitError(null);
    try {
      await createFazenda(values);
      router.push("/fazendas");
    } catch (err) {
      setSubmitError(err instanceof ApiError || err instanceof Error ? err.message : "Erro ao salvar.");
    }
  }

  return (
    <div className={cn(styles.page, "pt-safe")}>
      <BackLink href="/fazendas" />
      <h1 className={styles.title}>Cadastrar Fazenda</h1>

      <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
        <div className={styles.fields}>
          {submitError ? <p className={styles.submitError}>{submitError}</p> : null}

          <IconField icon={Warehouse} label="Nome Fazenda" htmlFor="nome_fazenda" error={errors.nome_fazenda?.message}>
            <TintedInput id="nome_fazenda" tint="pink" placeholder="Ex: Fazenda Santa Maria" autoFocus {...register("nome_fazenda")} />
          </IconField>

          <IconField icon={MapPin} label="Município" htmlFor="municipio" error={errors.municipio?.message}>
            <TintedInput id="municipio" tint="pink" placeholder="Ex: Três Lagoas" {...register("municipio")} />
          </IconField>

          <IconField icon={FileText} label="Inscrição Estadual" htmlFor="inscricao_estadual" error={errors.inscricao_estadual?.message}>
            <TintedInput id="inscricao_estadual" tint="pink" placeholder="Ex: 234567891" {...register("inscricao_estadual")} />
          </IconField>
        </div>

        <Button type="submit" variant="brand" size="xl" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Salvando..." : "Salvar"}
        </Button>
      </form>
    </div>
  );
}
