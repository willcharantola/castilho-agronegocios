"use client";

import * as React from "react";
import { FileText, MapPin, Type, Warehouse } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AvatarUpload } from "@/components/form/avatar-upload";
import { IconField } from "@/components/form/icon-field";
import { TintedInput } from "@/components/form/tinted-input";
import { Button } from "@/components/ui/button";
import { mensagemDeErro } from "@/lib/offline/rede";
import type { CreateFazendaInput } from "@/lib/api/types";

export const fazendaSchema = z.object({
  nome_fazenda: z.string().min(2, "Informe o nome da fazenda.").max(50),
  municipio: z.string().min(2, "Informe o município.").max(20),
  inscricao_estadual: z.string().min(1, "Informe a inscrição estadual.").max(12),
  // URL pública no S3, preenchida pelo AvatarUpload (opcional; null = sem imagem).
  marca_url: z.string().nullable().optional(),
  marca_escrita: z.string().max(10, "Máximo de 10 caracteres.").optional(),
});
type FormValues = z.infer<typeof fazendaSchema>;

/**
 * Cadastro de uma fazenda nova — sempre dentro de um pecuarista (etapa 2 do cadastro ou
 * "Adicionar fazenda"). Sem conexão o envio da marca fica bloqueado; ela pode ser
 * adicionada depois, na edição da fazenda.
 */
export function FazendaForm({
  submitLabel,
  onSubmit,
  onCancel,
}: {
  submitLabel: string;
  /** Lança erro para exibi-lo no formulário. */
  onSubmit: (fazenda: CreateFazendaInput) => Promise<void> | void;
  onCancel?: () => void;
}) {
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [enviandoMarca, setEnviandoMarca] = React.useState(false);
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(fazendaSchema) });

  async function submit(values: FormValues) {
    setSubmitError(null);
    try {
      await onSubmit({
        nome_fazenda: values.nome_fazenda,
        municipio: values.municipio,
        inscricao_estadual: values.inscricao_estadual,
        marca_url: values.marca_url ?? undefined,
        marca_escrita: values.marca_escrita || undefined,
      });
    } catch (err) {
      setSubmitError(mensagemDeErro(err));
    }
  }

  return (
    <form onSubmit={handleSubmit(submit)} className="form-stack">
      <div className="form-fields">
        {submitError ? <p className="form-error">{submitError}</p> : null}

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
          <TintedInput id="nome_fazenda" tint="pink" placeholder="Ex: Fazenda Santa Maria" {...register("nome_fazenda")} />
        </IconField>

        <IconField icon={MapPin} label="Município" htmlFor="municipio" error={errors.municipio?.message}>
          <TintedInput id="municipio" tint="pink" placeholder="Ex: Três Lagoas" {...register("municipio")} />
        </IconField>

        <IconField
          icon={FileText}
          label="Inscrição Estadual"
          htmlFor="inscricao_estadual"
          error={errors.inscricao_estadual?.message}
        >
          <TintedInput id="inscricao_estadual" tint="pink" placeholder="Ex: 234567891" {...register("inscricao_estadual")} />
        </IconField>

        <IconField icon={Type} label="Marca escrita" htmlFor="marca_escrita" error={errors.marca_escrita?.message}>
          <TintedInput id="marca_escrita" tint="pink" maxLength={10} {...register("marca_escrita")} />
        </IconField>
      </div>

      <Button type="submit" variant="brand" size="xl" className="w-full" disabled={isSubmitting || enviandoMarca}>
        {isSubmitting ? "Salvando..." : enviandoMarca ? "Enviando imagem..." : submitLabel}
      </Button>
      {onCancel ? (
        <Button type="button" variant="ghost" size="xl" className="w-full" onClick={onCancel}>
          Cancelar
        </Button>
      ) : null}
    </form>
  );
}
