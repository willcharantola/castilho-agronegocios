import type { FieldErrors, UseFormRegister } from "react-hook-form";
import { Building2, CreditCard, MapPin, Phone, User } from "lucide-react";
import { z } from "zod";
import { IconField } from "@/components/form/icon-field";
import { TintedInput } from "@/components/form/tinted-input";

export const compradorSchema = z.object({
  nome_empresa: z.string().min(2, "Informe o nome da empresa.").max(50),
  cnpj: z.string().min(1, "Informe o CNPJ.").max(18),
  telefone: z.string().min(1, "Informe o telefone.").max(13),
  municipio: z.string().min(2, "Informe o município.").max(30),
  pessoa_contato: z.string().min(2, "Informe a pessoa de contato.").max(30),
});
export type CompradorFormValues = z.infer<typeof compradorSchema>;

export function CompradorFields({
  register,
  errors,
  autoFocus,
}: {
  register: UseFormRegister<CompradorFormValues>;
  errors: FieldErrors<CompradorFormValues>;
  autoFocus?: boolean;
}) {
  return (
    <>
      <IconField icon={Building2} label="Nome da Empresa" htmlFor="nome_empresa" error={errors.nome_empresa?.message}>
        <TintedInput id="nome_empresa" tint="pink" placeholder="Ex: Frigorífico Boi Bom" autoFocus={autoFocus} {...register("nome_empresa")} />
      </IconField>

      <IconField icon={CreditCard} label="CNPJ" htmlFor="cnpj" error={errors.cnpj?.message}>
        <TintedInput id="cnpj" tint="pink" placeholder="00.000.000/0000-00" {...register("cnpj")} />
      </IconField>

      <IconField icon={Phone} label="Telefone" htmlFor="telefone" error={errors.telefone?.message}>
        <TintedInput id="telefone" tint="pink" type="tel" placeholder="67999999999" {...register("telefone")} />
      </IconField>

      <IconField icon={MapPin} label="Município" htmlFor="municipio" error={errors.municipio?.message}>
        <TintedInput id="municipio" tint="pink" placeholder="Ex: Campo Grande" {...register("municipio")} />
      </IconField>

      <IconField icon={User} label="Pessoa de Contato" htmlFor="pessoa_contato" error={errors.pessoa_contato?.message}>
        <TintedInput id="pessoa_contato" tint="pink" {...register("pessoa_contato")} />
      </IconField>
    </>
  );
}
