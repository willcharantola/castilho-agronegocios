"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { SimpleAuthLayout } from "@/components/auth/simple-auth-layout";
import { StepForm } from "@/components/auth/step-form";
import { Field } from "@/components/form/field";
import { PasswordField } from "@/components/form/password-field";
import { Button } from "@/components/ui/button";
import { definirSenhaPrimeiroAcesso } from "@/lib/api/auth";
import { clearSession, getToken, getUsuario, updateUsuarioLocal } from "@/lib/api-client";
import { mensagemDeErro } from "@/lib/offline/rede";
import { SENHA_MIN } from "@/lib/senha";
import styles from "./page.module.css";

const schema = z
  .object({
    senha: z.string().min(SENHA_MIN, `A senha deve ter pelo menos ${SENHA_MIN} caracteres.`),
    confirmarSenha: z.string(),
  })
  .refine((values) => values.senha === values.confirmarSenha, {
    message: "As senhas não coincidem.",
    path: ["confirmarSenha"],
  });
type FormValues = z.infer<typeof schema>;

/**
 * Troca obrigatória de senha no primeiro login. Sem "Voltar": o usuário só sai daqui
 * definindo a senha ou saindo da conta. A API também bloqueia as demais rotas até lá.
 */
export default function PrimeiroAcessoPage() {
  const router = useRouter();
  const [pronto, setPronto] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  React.useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    if (getUsuario()?.primeiro_acesso === false) {
      router.replace("/");
      return;
    }
    // Lendo a sessão do localStorage (sistema externo) ao montar — seguro.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPronto(true);
  }, [router]);

  async function onSubmit(values: FormValues) {
    setSubmitError(null);
    try {
      const usuario = await definirSenhaPrimeiroAcesso(values.senha);
      updateUsuarioLocal({ ...usuario, primeiro_acesso: false });
      router.replace("/");
    } catch (err) {
      // Ex.: "A nova senha deve ser diferente da senha atual." (regra da API)
      setSubmitError(mensagemDeErro(err));
    }
  }

  function sair() {
    clearSession();
    router.replace("/login");
  }

  if (!pronto) return null;

  return (
    <SimpleAuthLayout
      title="Defina sua nova senha"
      subtitle="Este é o seu primeiro acesso. Crie uma senha pessoal para continuar."
    >
      <StepForm
        onSubmit={handleSubmit(onSubmit)}
        fields={
          <>
            {submitError ? <p className={styles.error}>{submitError}</p> : null}
            <Field label="Nova senha" htmlFor="senha" error={errors.senha?.message}>
              <PasswordField
                id="senha"
                placeholder="Insira a nova senha"
                autoComplete="new-password"
                autoFocus
                {...register("senha")}
              />
            </Field>
            <Field label="Confirmar nova senha" htmlFor="confirmarSenha" error={errors.confirmarSenha?.message}>
              <PasswordField
                id="confirmarSenha"
                placeholder="Repita a nova senha"
                autoComplete="new-password"
                {...register("confirmarSenha")}
              />
            </Field>
          </>
        }
        footer={
          <>
            <Button type="submit" variant="brand" size="xl" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Salvando..." : "Salvar"}
            </Button>
            <button type="button" className={styles.sair} onClick={sair}>
              Sair
            </button>
          </>
        }
      />
    </SimpleAuthLayout>
  );
}
