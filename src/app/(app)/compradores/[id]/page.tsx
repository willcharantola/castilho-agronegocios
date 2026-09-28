"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { BackLink } from "@/components/back-link";
import { CompradorFields, compradorSchema, type CompradorFormValues } from "@/components/comprador-fields";
import { Button } from "@/components/ui/button";
import { fetchComprador, updateComprador } from "@/lib/api/compradores";
import { ApiError } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import styles from "./page.module.css";

export default function EditarCompradorPage() {
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
  } = useForm<CompradorFormValues>({ resolver: zodResolver(compradorSchema) });

  React.useEffect(() => {
    let cancelled = false;
    fetchComprador(params.id)
      .then((comprador) => {
        if (cancelled) return;
        reset({
          nome_empresa: comprador.nome_empresa,
          cnpj: comprador.cnpj,
          telefone: comprador.telefone,
          municipio: comprador.municipio,
          pessoa_contato: comprador.pessoa_contato,
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

  async function onSubmit(values: CompradorFormValues) {
    setSubmitError(null);
    try {
      await updateComprador(params.id, values);
      router.push("/compradores");
    } catch (err) {
      setSubmitError(err instanceof ApiError || err instanceof Error ? err.message : "Erro ao salvar.");
    }
  }

  return (
    <div className={cn(styles.page, "pt-safe")}>
      <BackLink href="/compradores" />
      <h1 className={styles.title}>Editar Comprador</h1>

      {!loaded && !loadError ? <div className={cn(styles.state, "glass-panel")}>Carregando comprador...</div> : null}
      {loadError ? <div className={cn(styles.state, styles.stateError, "glass-panel")}>{loadError}</div> : null}

      {loaded ? (
        <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
          <div className={styles.fields}>
            {submitError ? <p className={styles.submitError}>{submitError}</p> : null}
            <CompradorFields register={register} errors={errors} />
          </div>

          <Button type="submit" variant="brand" size="xl" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Salvando..." : "Salvar"}
          </Button>
        </form>
      ) : null}
    </div>
  );
}
