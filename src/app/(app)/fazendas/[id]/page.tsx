"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { FileText, Image, MapPin, Type, Warehouse } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { BackLink } from "@/components/back-link";
import { Field } from "@/components/form/field";
import { IconField } from "@/components/form/icon-field";
import { TintedInput } from "@/components/form/tinted-input";
import { Button } from "@/components/ui/button";
import { fetchFazenda, updateFazenda } from "@/lib/api/fazendas";
import type { Vendedor } from "@/lib/api/types";
import { ApiError } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import styles from "./page.module.css";

const schema = z.object({
  nome_fazenda: z.string().min(2, "Informe o nome da fazenda.").max(50),
  municipio: z.string().min(2, "Informe o município.").max(20),
  inscricao_estadual: z.string().min(1, "Informe a inscrição estadual.").max(12),
  // TODO: upload real de imagem (S3 + URL pré-assinada) ainda não especificado — por ora é uma URL colada.
  marca_url: z.string().max(500, "Máximo de 500 caracteres.").optional(),
  marca_escrita: z.string().max(10, "Máximo de 10 caracteres.").optional(),
});
type FormValues = z.infer<typeof schema>;

export default function EditarFazendaPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [loaded, setLoaded] = React.useState(false);
  const [vendedores, setVendedores] = React.useState<Vendedor[]>([]);
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
          marca_url: fazenda.marca_url ?? "",
          marca_escrita: fazenda.marca_escrita ?? "",
        });
        setVendedores((fazenda.vendedor_fazenda ?? []).map((a) => a.vendedor));
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
      await updateFazenda(params.id, {
        ...values,
        marca_url: values.marca_url || undefined,
        marca_escrita: values.marca_escrita || undefined,
      });
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

            <IconField icon={Image} label="Marca (URL da imagem)" htmlFor="marca_url" error={errors.marca_url?.message}>
              <TintedInput id="marca_url" tint="pink" type="url" placeholder="https://..." {...register("marca_url")} />
            </IconField>

            <IconField icon={Type} label="Marca escrita" htmlFor="marca_escrita" error={errors.marca_escrita?.message}>
              <TintedInput id="marca_escrita" tint="pink" maxLength={10} {...register("marca_escrita")} />
            </IconField>

            <Field label="Vendedores associados" htmlFor="vendedores">
              {vendedores.length === 0 ? (
                <p className={styles.state}>Nenhum vendedor associado a esta fazenda.</p>
              ) : (
                <ul>
                  {vendedores.map((v) => (
                    <li key={v.vendedor_id}>{v.nome_vendedor}</li>
                  ))}
                </ul>
              )}
            </Field>
          </div>

          <Button type="submit" variant="brand" size="xl" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Salvando..." : "Salvar"}
          </Button>
        </form>
      ) : null}
    </div>
  );
}
