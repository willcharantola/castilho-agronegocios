"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { FileText, MapPin, Warehouse } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { BackLink } from "@/components/back-link";
import { IconField } from "@/components/form/icon-field";
import { TintedInput } from "@/components/form/tinted-input";
import { Button } from "@/components/ui/button";
import { fetchFazenda, updateFazenda } from "@/lib/api/fazendas";
import { ApiError } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import styles from "./page.module.css";

const schema = z.object({
  nome_fazenda: z.string().min(2, "Informe o nome da fazenda.").max(50),
  municipio: z.string().min(2, "Informe o município.").max(20),
  inscricao_estadual: z.string().min(1, "Informe a inscrição estadual.").max(12),
});
type FormValues = z.infer<typeof schema>;

export default function EditarFazendaPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [loaded, setLoaded] = React.useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  React.useEffect(() => {
    let cancelled = false;
    fetchFazenda(params.id)
      .then((fazenda) => {
        if (cancelled) return;
        reset({
          nome_fazenda: fazenda.nome_fazenda,
          municipio: fazenda.municipio,
          inscricao_estadual: fazenda.inscricao_estadual,
        });
        setLoaded(true);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setLoadError(err instanceof ApiError || err instanceof Error ? err.message : "Erro ao carregar.");
      });
    return () => {
      cancelled = true;
    };
  }, [params.id, reset]);

  async function onSubmit(values: FormValues) {
    setSubmitError(null);
    try {
      await updateFazenda(params.id, values);
      router.push("/fazendas");
    } catch (err) {
      setSubmitError(err instanceof ApiError || err instanceof Error ? err.message : "Erro ao salvar.");
    }
  }

  return (
    <div className={cn(styles.page, "pt-safe")}>
      <BackLink href="/fazendas" />
      <h1 className={styles.title}>Editar Fazenda</h1>

      {!loaded && !loadError ? <div className={cn(styles.state, "glass-panel")}>Carregando fazenda...</div> : null}
      {loadError ? <div className={cn(styles.state, styles.stateError, "glass-panel")}>{loadError}</div> : null}

      {loaded ? (
        <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
          <div className={styles.fields}>
            {submitError ? <p className={styles.submitError}>{submitError}</p> : null}

            <IconField icon={Warehouse} label="Nome Fazenda" htmlFor="nome_fazenda" error={errors.nome_fazenda?.message}>
              <TintedInput id="nome_fazenda" tint="pink" {...register("nome_fazenda")} />
            </IconField>

            <IconField icon={MapPin} label="Município" htmlFor="municipio" error={errors.municipio?.message}>
              <TintedInput id="municipio" tint="pink" {...register("municipio")} />
            </IconField>

            <IconField icon={FileText} label="Inscrição Estadual" htmlFor="inscricao_estadual" error={errors.inscricao_estadual?.message}>
              <TintedInput id="inscricao_estadual" tint="pink" {...register("inscricao_estadual")} />
            </IconField>
          </div>

          <Button type="submit" variant="brand" size="xl" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Salvando..." : "Salvar"}
          </Button>
        </form>
      ) : null}
    </div>
  );
}
