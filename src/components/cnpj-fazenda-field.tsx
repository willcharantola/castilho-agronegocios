"use client";

import { Building2 } from "lucide-react";
import type { Control, FieldErrors } from "react-hook-form";
import { z } from "zod";
import { IconField } from "@/components/form/icon-field";
import { MaskedTextField } from "@/components/form/masked-text-field";
import { cnpjValido, INSCRICAO_ESTADUAL, mascaraCnpj, mascaraInscricaoEstadual } from "@/lib/documentos";

/** Campos de documento da fazenda: inscrição estadual (MS) obrigatória e CNPJ opcional. */
export const documentosFazendaSchema = {
  inscricao_estadual: z
    .string({ error: "Informe a inscrição estadual." })
    .trim()
    .min(1, "Informe a inscrição estadual.")
    .regex(INSCRICAO_ESTADUAL, "Inscrição estadual inválida. Use o formato 00.000.000-0."),
  cnpj: z
    .string()
    .trim()
    .refine((v) => v === "" || cnpjValido(v), "CNPJ inválido. Confira os números.")
    .optional(),
};

type ComDocumentos = { inscricao_estadual: string; cnpj?: string };

/** Inscrição estadual (00.000.000-0) e CNPJ opcional, com máscara, no cadastro e na edição da fazenda. */
export function DocumentosFazendaFields<T extends ComDocumentos>({
  control,
  errors,
  icone,
}: {
  control: Control<T>;
  errors: FieldErrors<T>;
  /** Ícone do campo da inscrição estadual. */
  icone: React.ComponentProps<typeof IconField>["icon"];
}) {
  // Os campos são iguais em todos os formulários de fazenda que usam este componente.
  const ctrl = control as unknown as Control<ComDocumentos>;
  const erros = errors as FieldErrors<ComDocumentos>;
  return (
    <>
      <IconField
        icon={icone}
        label="Inscrição Estadual"
        htmlFor="inscricao_estadual"
        error={erros.inscricao_estadual?.message}
      >
        <MaskedTextField
          control={ctrl}
          name="inscricao_estadual"
          mascara={mascaraInscricaoEstadual}
          id="inscricao_estadual"
          placeholder="00.000.000-0"
        />
      </IconField>

      <IconField icon={Building2} label="CNPJ (opcional)" htmlFor="cnpj" error={erros.cnpj?.message}>
        <MaskedTextField control={ctrl} name="cnpj" mascara={mascaraCnpj} id="cnpj" placeholder="00.000.000/0000-00" />
      </IconField>
    </>
  );
}
