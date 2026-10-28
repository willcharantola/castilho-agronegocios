"use client";

import { Banknote, CreditCard, User } from "lucide-react";
import { Controller, type Control, type FieldErrors, type UseFormRegister } from "react-hook-form";
import { z } from "zod";
import { Field } from "@/components/form/field";
import { IconField } from "@/components/form/icon-field";
import { TintedInput } from "@/components/form/tinted-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FISICO_JURIDICO_LABELS } from "@/lib/labels";
import { cn } from "@/lib/utils";
import fieldBox from "@/components/form/field-box.module.css";

/** Dados do pecuarista — limites das colunas de `vendedor`. */
export const pecuaristaSchema = z.object({
  nome_pecuarista: z.string().min(2, "Informe o nome do pecuarista.").max(50),
  fisico_juridico: z.enum(["fisico", "juridico"], { error: "Selecione o tipo de pessoa." }),
  cpf_cnpj: z.string().min(1, "Informe o CPF/CNPJ.").max(20),
  banco: z.string().min(1, "Informe o banco.").max(20),
  agencia: z.string().min(1, "Informe a agência.").max(10, "Máximo de 10 caracteres."),
  conta: z.string().min(1, "Informe a conta.").max(20, "Máximo de 20 caracteres."),
  chave_pix: z.string().min(1, "Informe a chave PIX.").max(50),
});
export type PecuaristaFormValues = z.infer<typeof pecuaristaSchema>;

/** Campos do pecuarista, compartilhados entre o cadastro (etapa 1) e a edição. */
export function PecuaristaFields({
  register,
  control,
  errors,
  autoFocus,
}: {
  register: UseFormRegister<PecuaristaFormValues>;
  control: Control<PecuaristaFormValues>;
  errors: FieldErrors<PecuaristaFormValues>;
  autoFocus?: boolean;
}) {
  return (
    <>
      <IconField icon={User} label="Nome Pecuarista" htmlFor="nome_pecuarista" error={errors.nome_pecuarista?.message}>
        <TintedInput
          id="nome_pecuarista"
          tint="pink"
          placeholder="Nome do pecuarista"
          autoFocus={autoFocus}
          {...register("nome_pecuarista")}
        />
      </IconField>

      <Field label="Pessoa" htmlFor="fisico_juridico" error={errors.fisico_juridico?.message}>
        <Controller
          control={control}
          name="fisico_juridico"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="fisico_juridico" className={cn(fieldBox.box, fieldBox.pink)}>
                <SelectValue>
                  {(value: "fisico" | "juridico" | null) => (value ? FISICO_JURIDICO_LABELS[value] : "Selecione")}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fisico">{FISICO_JURIDICO_LABELS.fisico}</SelectItem>
                <SelectItem value="juridico">{FISICO_JURIDICO_LABELS.juridico}</SelectItem>
              </SelectContent>
            </Select>
          )}
        />
      </Field>

      <IconField icon={CreditCard} label="CPF/CNPJ" htmlFor="cpf_cnpj" error={errors.cpf_cnpj?.message}>
        <TintedInput id="cpf_cnpj" tint="pink" placeholder="000.000.000-00" {...register("cpf_cnpj")} />
      </IconField>

      <IconField icon={Banknote} label="Banco" htmlFor="banco" error={errors.banco?.message}>
        <TintedInput id="banco" tint="pink" placeholder="Ex: Banco do Brasil" {...register("banco")} />
      </IconField>

      <div className="form-row">
        <Field label="Agência" htmlFor="agencia" error={errors.agencia?.message}>
          <TintedInput id="agencia" tint="pink" maxLength={10} {...register("agencia")} />
        </Field>
        <Field label="Conta" htmlFor="conta" error={errors.conta?.message}>
          <TintedInput id="conta" tint="pink" maxLength={20} {...register("conta")} />
        </Field>
      </div>

      <Field label="Chave Pix" htmlFor="chave_pix" error={errors.chave_pix?.message}>
        <TintedInput id="chave_pix" tint="pink" {...register("chave_pix")} />
      </Field>
    </>
  );
}
