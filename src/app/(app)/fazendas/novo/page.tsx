"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { FileText, MapPin, Type, Warehouse } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { BackLink } from "@/components/back-link";
import { AvatarUpload } from "@/components/form/avatar-upload";
import { IconField } from "@/components/form/icon-field";
import { TintedInput } from "@/components/form/tinted-input";
import { Button } from "@/components/ui/button";
import { createFazenda } from "@/lib/api/fazendas";
import { ApiError } from "@/lib/api-client";
import { enviarOuEnfileirar } from "@/lib/offline/fila";
import { cn } from "@/lib/utils";
import styles from "./page.module.css";

const schema = z.object({
  nome_fazenda: z.string().min(2, "Informe o nome da fazenda.").max(50),
  municipio: z.string().min(2, "Informe o município.").max(20),
  inscricao_estadual: z.string().min(1, "Informe a inscrição estadual.").max(12),
  // URL pública no S3, preenchida pelo AvatarUpload (opcional; null = sem imagem).
  marca_url: z.string().nullable().optional(),
  marca_escrita: z.string().max(10, "Máximo de 10 caracteres.").optional(),
});
type FormValues = z.infer<typeof schema>;

export default function NovaFazendaPage() {
  const router = useRouter();
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [enviandoMarca, setEnviandoMarca] = React.useState(false);
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(values: FormValues) {
    setSubmitError(null);
    try {
      // Sem conexão, fica salva no aparelho e aparece na lista como pendente.
      await enviarOuEnfileirar(
        "fazenda",
        {
          ...values,
          marca_url: values.marca_url ?? undefined,
          marca_escrita: values.marca_escrita || undefined,
        },
        (payload, uuid) => createFazenda({ ...(payload as typeof values), uuid_origem: uuid })
      );
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

          <Controller
            control={control}
            name="marca_url"
            render={({ field }) => (
              <AvatarUpload
                id="marca_url"
                value={field.value ?? null}
                onChange={field.onChange}
                onUploadingChange={setEnviandoMarca}
                disabled={isSubmitting}
              />
            )}
          />

          <IconField icon={Warehouse} label="Nome Fazenda" htmlFor="nome_fazenda" error={errors.nome_fazenda?.message}>
            <TintedInput id="nome_fazenda" tint="pink" placeholder="Ex: Fazenda Santa Maria" autoFocus {...register("nome_fazenda")} />
          </IconField>

          <IconField icon={MapPin} label="Município" htmlFor="municipio" error={errors.municipio?.message}>
            <TintedInput id="municipio" tint="pink" placeholder="Ex: Três Lagoas" {...register("municipio")} />
          </IconField>

          <IconField icon={FileText} label="Inscrição Estadual" htmlFor="inscricao_estadual" error={errors.inscricao_estadual?.message}>
            <TintedInput id="inscricao_estadual" tint="pink" placeholder="Ex: 234567891" {...register("inscricao_estadual")} />
          </IconField>


          <IconField icon={Type} label="Marca escrita" htmlFor="marca_escrita" error={errors.marca_escrita?.message}>
            <TintedInput id="marca_escrita" tint="pink" maxLength={10} {...register("marca_escrita")} />
          </IconField>
        </div>

        <Button type="submit" variant="brand" size="xl" className="w-full" disabled={isSubmitting || enviandoMarca}>
          {isSubmitting ? "Salvando..." : enviandoMarca ? "Enviando imagem..." : "Salvar"}
        </Button>
      </form>
    </div>
  );
}
