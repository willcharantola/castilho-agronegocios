"use client";

import { Banknote, CreditCard, User } from "lucide-react";
import { Controller, useWatch, type Control, type FieldErrors, type UseFormRegister } from "react-hook-form";
import { z } from "zod";
import { ComCopiar } from "@/components/form/botao-copiar";
import { Field } from "@/components/form/field";
import { IconField } from "@/components/form/icon-field";
import { MaskedTextField } from "@/components/form/masked-text-field";
import { TintedInput } from "@/components/form/tinted-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cnpjValido, cpfValido, mascaraCnpj, mascaraCpf } from "@/lib/documentos";
import { FISICO_JURIDICO_LABELS } from "@/lib/labels";
import { cn } from "@/lib/utils";
import fieldBox from "@/components/form/field-box.module.css";

/** Dados do pecuarista — limites das colunas de `vendedor`. */
export const pecuaristaSchema = z
  .object({
    nome_pecuarista: z.string().min(2, "Informe o nome do pecuarista.").max(50),
    fisico_juridico: z.enum(["fisico", "juridico"], {
      error: "Selecione o tipo de pessoa.",
    }),
    cpf_cnpj: z.string().min(1, "Informe o CPF/CNPJ.").max(20),
    // Opcionais: banco, agência e conta juntos ou nenhum (abaixo); a chave Pix é independente.
    banco: z.string().trim().max(20, "Máximo de 20 caracteres."),
    agencia: z.string().trim().max(10, "Máximo de 10 caracteres."),
    conta: z.string().trim().max(20, "Máximo de 20 caracteres."),
    chave_pix: z.string().trim().max(50, "Máximo de 50 caracteres."),
  })
  // Mesma regra da API: conta pela metade não é aceita.
  .superRefine((v, ctx) => {
    const campos = [
      ["banco", "o banco"],
      ["agencia", "a agência"],
      ["conta", "a conta"],
    ] as const;
    const faltando = campos.filter(([campo]) => v[campo] === "");
    if (faltando.length === 0 || faltando.length === campos.length) return;
    for (const [campo, nome] of faltando) {
      ctx.addIssue({
        code: "custom",
        path: [campo],
        message: `Informe ${nome}: banco, agência e conta vão juntos (ou deixe os três em branco).`,
      });
    }
  })
  // Pessoa física → CPF; jurídica → CNPJ (com dígitos verificadores, como a API).
  .superRefine((v, ctx) => {
    if (!v.cpf_cnpj) return;
    if (v.fisico_juridico === "fisico" && !cpfValido(v.cpf_cnpj)) {
      ctx.addIssue({
        code: "custom",
        path: ["cpf_cnpj"],
        message: "CPF inválido. Confira os números.",
      });
    }
    if (v.fisico_juridico === "juridico" && !cnpjValido(v.cpf_cnpj)) {
      ctx.addIssue({
        code: "custom",
        path: ["cpf_cnpj"],
        message: "CNPJ inválido. Confira os números.",
      });
    }
  });
export type PecuaristaFormValues = z.infer<typeof pecuaristaSchema>;

/** Campos do pecuarista, compartilhados entre o cadastro (etapa 1) e a edição. */
export function PecuaristaFields({
  register,
  control,
  errors,
  autoFocus,
  copiavel,
}: {
  register: UseFormRegister<PecuaristaFormValues>;
  control: Control<PecuaristaFormValues>;
  errors: FieldErrors<PecuaristaFormValues>;
  autoFocus?: boolean;
  /** Botão de copiar ao lado do CPF/CNPJ e da chave Pix (detalhe do pecuarista). */
  copiavel?: boolean;
}) {
  const pessoa = useWatch({ control, name: "fisico_juridico" });
  const juridica = pessoa === "juridico";
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

      <IconField
        icon={CreditCard}
        label={pessoa ? (juridica ? "CNPJ" : "CPF") : "CPF/CNPJ"}
        htmlFor="cpf_cnpj"
        error={errors.cpf_cnpj?.message}
      >
        {/* A máscara segue o tipo de pessoa; trocar o tipo reformata o que já foi digitado. */}
        <ComCopiar alvo={copiavel ? "cpf_cnpj" : undefined} rotulo={juridica ? "CNPJ" : "CPF"}>
          <MaskedTextField
            key={juridica ? "cnpj" : "cpf"}
            control={control}
            name="cpf_cnpj"
            mascara={juridica ? mascaraCnpj : mascaraCpf}
            id="cpf_cnpj"
            placeholder={juridica ? "00.000.000/0000-00" : "000.000.000-00"}
          />
        </ComCopiar>
      </IconField>

      <IconField icon={Banknote} label="Banco (opcional)" htmlFor="banco" error={errors.banco?.message}>
        <TintedInput id="banco" tint="pink" placeholder="Ex: Banco do Brasil" {...register("banco")} />
      </IconField>

      <div className="form-row">
        <Field label="Agência (opcional)" htmlFor="agencia" error={errors.agencia?.message}>
          <TintedInput id="agencia" tint="pink" maxLength={10} {...register("agencia")} />
        </Field>
        <Field label="Conta (opcional)" htmlFor="conta" error={errors.conta?.message}>
          <TintedInput id="conta" tint="pink" maxLength={20} {...register("conta")} />
        </Field>
      </div>

      <Field label="Chave Pix (opcional)" htmlFor="chave_pix" error={errors.chave_pix?.message}>
        <ComCopiar alvo={copiavel ? "chave_pix" : undefined} rotulo="chave Pix">
          <TintedInput id="chave_pix" tint="pink" {...register("chave_pix")} />
        </ComCopiar>
      </Field>
    </>
  );
}
