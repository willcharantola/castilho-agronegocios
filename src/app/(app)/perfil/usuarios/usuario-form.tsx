"use client";

import * as React from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Field } from "@/components/form/field";
import { PasswordField } from "@/components/form/password-field";
import { TintedInput } from "@/components/form/tinted-input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { NivelAcesso, Usuario } from "@/lib/api/types";
import { mensagemDeErro } from "@/lib/offline/rede";
import { useOnlineStatus } from "@/lib/offline/use-online-status";
import { SENHA_MAX, SENHA_MIN } from "@/lib/senha";
import { cn } from "@/lib/utils";
import fieldBox from "@/components/form/field-box.module.css";
import { NIVEL_LABELS } from "../usuarios-section";
import styles from "./usuario-form.module.css";

const camposBase = {
  nome: z.string().trim().min(1, "Informe o nome.").max(50, "Máximo de 50 caracteres."),
  sobrenome: z.string().trim().min(1, "Informe o sobrenome.").max(50, "Máximo de 50 caracteres."),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .max(254, "Máximo de 254 caracteres.")
    .pipe(z.email("Informe um e-mail válido.")),
  nivel_acesso: z.enum(["Admin", "Normal"], { error: "Selecione o nível de acesso." }),
  primeiro_acesso: z.boolean(),
};
const senhaValida = z
  .string()
  .min(SENHA_MIN, `A senha deve ter pelo menos ${SENHA_MIN} caracteres.`)
  .max(SENHA_MAX, `A senha deve ter no máximo ${SENHA_MAX} caracteres.`);

/** No cadastro a senha é obrigatória; na edição, em branco mantém a atual. */
const criarSchema = (edicao: boolean) =>
  z.object({ ...camposBase, senha: edicao ? z.union([z.literal(""), senhaValida]) : senhaValida });

export type UsuarioFormValues = z.output<ReturnType<typeof criarSchema>>;
type UsuarioFormInput = z.input<ReturnType<typeof criarSchema>>;

export function UsuarioForm({
  usuario,
  onSubmit,
  acoesExtras,
}: {
  /** Usuário em edição; omitido no cadastro. */
  usuario?: Usuario;
  /** Lança erro para exibi-lo no formulário (ex.: "E-mail já cadastrado."). */
  onSubmit: (values: UsuarioFormValues) => Promise<void>;
  /** Ex.: botão "Excluir usuário" na edição. */
  acoesExtras?: React.ReactNode;
}) {
  const edicao = !!usuario;
  const online = useOnlineStatus();
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const schema = React.useMemo(() => criarSchema(edicao), [edicao]);
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<UsuarioFormInput, unknown, UsuarioFormValues>({
    resolver: zodResolver(schema),
    defaultValues: usuario
      ? {
          nome: usuario.nome,
          sobrenome: usuario.sobrenome,
          email: usuario.email,
          nivel_acesso: usuario.nivel_acesso,
          senha: "",
          primeiro_acesso: usuario.primeiro_acesso,
        }
      : // "Primeiro acesso" não vem marcado: o administrador decide.
        { senha: "", primeiro_acesso: false },
  });

  async function enviar(values: UsuarioFormValues) {
    setSubmitError(null);
    try {
      await onSubmit(values);
    } catch (err) {
      setSubmitError(mensagemDeErro(err));
    }
  }

  return (
    <form onSubmit={handleSubmit(enviar)} className={styles.form}>
      <div className={styles.fields}>
        {submitError ? <p className={styles.submitError}>{submitError}</p> : null}

        <div className={styles.row}>
          <Field label="Nome" htmlFor="nome" error={errors.nome?.message}>
            <TintedInput id="nome" tint="pink" autoComplete="off" {...register("nome")} />
          </Field>
          <Field label="Sobrenome" htmlFor="sobrenome" error={errors.sobrenome?.message}>
            <TintedInput id="sobrenome" tint="pink" autoComplete="off" {...register("sobrenome")} />
          </Field>
        </div>

        <Field label="E-mail" htmlFor="email" error={errors.email?.message}>
          <TintedInput
            id="email"
            tint="pink"
            type="email"
            inputMode="email"
            autoComplete="off"
            autoCapitalize="none"
            placeholder="usuario@castilhoagro.com.br"
            {...register("email")}
          />
        </Field>

        <Field label="Nível de acesso" htmlFor="nivel_acesso" error={errors.nivel_acesso?.message}>
          <Controller
            control={control}
            name="nivel_acesso"
            render={({ field }) => (
              <Select value={field.value ?? null} onValueChange={field.onChange}>
                <SelectTrigger id="nivel_acesso" className={cn(fieldBox.box, fieldBox.pink)}>
                  <SelectValue>
                    {(value: NivelAcesso | null) => (value ? NIVEL_LABELS[value] : "Selecione")}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Admin">{NIVEL_LABELS.Admin}</SelectItem>
                  <SelectItem value="Normal">{NIVEL_LABELS.Normal}</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </Field>

        <Field label={edicao ? "Nova senha (opcional)" : "Senha"} htmlFor="senha" error={errors.senha?.message}>
          <PasswordField
            id="senha"
            tint="pink"
            autoComplete="new-password"
            placeholder={edicao ? "Nova senha" : "Senha inicial"}
            {...register("senha")}
          />
          {edicao ? <p className={styles.help}>Deixe em branco para manter a senha atual.</p> : null}
        </Field>

        <label className={styles.checkbox} htmlFor="primeiro_acesso">
          <input id="primeiro_acesso" type="checkbox" {...register("primeiro_acesso")} />
          <span>
            <span className={styles.checkboxLabel}>Primeiro acesso</span>
            <span className={styles.help}>Se marcado, o usuário deverá definir uma nova senha no primeiro login.</span>
          </span>
        </label>
      </div>

      {!online ? <p className={styles.help}>Indisponível sem internet.</p> : null}
      <Button type="submit" variant="brand" size="xl" className="w-full" disabled={isSubmitting || !online}>
        {isSubmitting ? "Salvando..." : edicao ? "Salvar alterações" : "Cadastrar usuário"}
      </Button>
      {acoesExtras}
    </form>
  );
}
