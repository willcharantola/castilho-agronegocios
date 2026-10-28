"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { BackLink } from "@/components/back-link";
import { ProgressSteps } from "@/components/progress-steps";
import { PecuaristaFields, pecuaristaSchema, type PecuaristaFormValues } from "@/components/pecuarista-fields";
import { Button } from "@/components/ui/button";
import { usePecuaristaFlow } from "@/lib/flows/pecuarista-flow";
import styles from "./page.module.css";

/** Etapa 1 de 2: dados do pecuarista. Nada é salvo até concluir a etapa 2. */
export default function NovoPecuaristaDadosPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data, update } = usePecuaristaFlow();
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<PecuaristaFormValues>({
    resolver: zodResolver(pecuaristaSchema),
    defaultValues: data.dados ?? undefined,
  });

  // ?returnTo= (ex.: vindo do cadastro de negócio) só é lido ao entrar no fluxo.
  const returnToParam = searchParams.get("returnTo");
  React.useEffect(() => {
    if (returnToParam) update({ returnTo: returnToParam });
  }, [returnToParam, update]);

  function onSubmit(values: PecuaristaFormValues) {
    update({ dados: values });
    router.push("/pecuaristas/novo/fazendas");
  }

  return (
    <div className="page-container page-narrow pt-safe">
      <BackLink href={data.returnTo ?? "/pecuaristas"} />
      <h1 className="page-title">Cadastrar Pecuarista</h1>
      <ProgressSteps current={1} total={2} />
      <p className={styles.subtitle}>Etapa 1 de 2 — Dados do pecuarista</p>

      <form onSubmit={handleSubmit(onSubmit)} className="form-stack">
        <div className="form-fields">
          <PecuaristaFields register={register} control={control} errors={errors} autoFocus />
        </div>

        <Button type="submit" variant="brand" size="xl" className="w-full">
          Próximo: fazendas
        </Button>
      </form>
    </div>
  );
}
