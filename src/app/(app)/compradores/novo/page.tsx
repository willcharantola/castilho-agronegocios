"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { BackLink } from "@/components/back-link";
import { CompradorFields, compradorSchema, type CompradorFormValues } from "@/components/comprador-fields";
import { Button } from "@/components/ui/button";
import { createComprador } from "@/lib/api/compradores";
import { ApiError } from "@/lib/api-client";
import { enviarOuEnfileirar } from "@/lib/offline/fila";
import { cn } from "@/lib/utils";
import styles from "./page.module.css";

/** Só aceita retorno para rotas internas (evita open redirect via ?returnTo=). */
function rotaInterna(returnTo: string | null) {
  return returnTo && returnTo.startsWith("/") && !returnTo.startsWith("//") ? returnTo : null;
}

function NovoCompradorForm() {
  const router = useRouter();
  const returnTo = rotaInterna(useSearchParams().get("returnTo"));
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CompradorFormValues>({ resolver: zodResolver(compradorSchema) });

  async function onSubmit(values: CompradorFormValues) {
    setSubmitError(null);
    try {
      // Sem conexão, fica salvo no aparelho e já pode ser escolhido num negócio.
      await enviarOuEnfileirar("comprador", values, (payload, uuid) =>
        createComprador({ ...(payload as CompradorFormValues), uuid_origem: uuid })
      );
      router.push(returnTo ?? "/compradores");
    } catch (err) {
      setSubmitError(err instanceof ApiError || err instanceof Error ? err.message : "Erro ao salvar.");
    }
  }

  return (
    <div className={cn(styles.page, "pt-safe")}>
      <BackLink href={returnTo ?? "/compradores"} />
      <h1 className={styles.title}>Cadastrar Comprador</h1>

      <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
        <div className={styles.fields}>
          {submitError ? <p className={styles.submitError}>{submitError}</p> : null}
          <CompradorFields register={register} errors={errors} autoFocus />
        </div>

        <Button type="submit" variant="brand" size="xl" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Salvando..." : "Salvar"}
        </Button>
      </form>
    </div>
  );
}

export default function NovoCompradorPage() {
  return (
    <React.Suspense>
      <NovoCompradorForm />
    </React.Suspense>
  );
}
