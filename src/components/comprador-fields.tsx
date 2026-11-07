import type { Control, FieldErrors, UseFormRegister } from "react-hook-form";
import { Building2, CreditCard, FileText, MapPin } from "lucide-react";
import { z } from "zod";
import { ComCopiar } from "@/components/form/botao-copiar";
import { IconField } from "@/components/form/icon-field";
import { MaskedTextField } from "@/components/form/masked-text-field";
import { TintedInput } from "@/components/form/tinted-input";
import { cnpjValido, INSCRICAO_ESTADUAL, mascaraCnpj, mascaraInscricaoEstadual } from "@/lib/documentos";

export const compradorSchema = z.object({
  nome_empresa: z.string().min(2, "Informe o nome da empresa.").max(50),
  cnpj: z.string().min(1, "Informe o CNPJ.").refine(cnpjValido, "CNPJ inválido. Confira os números."),
  // Mesmo formato da inscrição da fazenda (MS); a API valida igual.
  inscricao_estadual: z
    .string()
    .trim()
    .min(1, "Informe a inscrição estadual.")
    .regex(INSCRICAO_ESTADUAL, "Inscrição estadual inválida. Use o formato 00.000.000-0."),
  municipio: z.string().min(2, "Informe o município.").max(30),
});
export type CompradorFormValues = z.infer<typeof compradorSchema>;

export function CompradorFields({
  register,
  control,
  errors,
  autoFocus,
  copiavel,
}: {
  register: UseFormRegister<CompradorFormValues>;
  control: Control<CompradorFormValues>;
  errors: FieldErrors<CompradorFormValues>;
  autoFocus?: boolean;
  /** Botão de copiar ao lado do CNPJ e da inscrição estadual (detalhe do frigorífico). */
  copiavel?: boolean;
}) {
  return (
    <>
      <IconField icon={Building2} label="Nome da Empresa" htmlFor="nome_empresa" error={errors.nome_empresa?.message}>
        <TintedInput id="nome_empresa" tint="pink" placeholder="Ex: Frigorífico Boi Bom" autoFocus={autoFocus} {...register("nome_empresa")} />
      </IconField>

      <IconField icon={CreditCard} label="CNPJ" htmlFor="cnpj" error={errors.cnpj?.message}>
        <ComCopiar alvo={copiavel ? "cnpj" : undefined} rotulo="CNPJ">
          <MaskedTextField control={control} name="cnpj" mascara={mascaraCnpj} id="cnpj" placeholder="00.000.000/0000-00" />
        </ComCopiar>
      </IconField>

      <IconField
        icon={FileText}
        label="Inscrição Estadual"
        htmlFor="inscricao_estadual"
        error={errors.inscricao_estadual?.message}
      >
        <ComCopiar alvo={copiavel ? "inscricao_estadual" : undefined} rotulo="inscrição estadual">
          <MaskedTextField
            control={control}
            name="inscricao_estadual"
            mascara={mascaraInscricaoEstadual}
            id="inscricao_estadual"
            placeholder="00.000.000-0"
          />
        </ComCopiar>
      </IconField>

      <IconField icon={MapPin} label="Município" htmlFor="municipio" error={errors.municipio?.message}>
        <TintedInput id="municipio" tint="pink" placeholder="Ex: Campo Grande" {...register("municipio")} />
      </IconField>
    </>
  );
}
