"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AuthStepLayout } from "@/components/auth/auth-step-layout";
import { StepForm } from "@/components/auth/step-form";
import { Field } from "@/components/form/field";
import { PasswordField } from "@/components/form/password-field";
import { Button } from "@/components/ui/button";
import { useLoginFlow } from "@/lib/flows/login-flow";
import { login } from "@/lib/api/auth";
import { setSession } from "@/lib/api-client";
import styles from "./page.module.css";

const schema = z.object({
  senha: z.string().min(6, "A senha deve ter pelo menos 6 caracteres."),
});
type FormValues = z.infer<typeof schema>;

export default function LoginSenhaPage() {
  const router = useRouter();
  const { data } = useLoginFlow();
  const [loading, setLoading] = React.useState(false);
  const [authError, setAuthError] = React.useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  React.useEffect(() => {
    if (!data.email) router.replace("/login/email");
  }, [data.email, router]);

  async function onSubmit(values: FormValues) {
    setAuthError(null);
    setLoading(true);
    try {
      const { access_token, usuario } = await login(data.email, values.senha);
      setSession(access_token, usuario);
      router.push("/");
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : "Não foi possível entrar.");
      setLoading(false);
    }
  }

  return (
    <AuthStepLayout
      backHref="/login/email"
      icon={Lock}
      title={
        <>
          Insira sua <span className="text-accent">senha.</span>
        </>
      }
      step={{ current: 2, total: 2 }}
    >
      <StepForm
        onSubmit={handleSubmit(onSubmit)}
        fields={
          <>
            {authError ? <p className={styles.authError}>{authError}</p> : null}
            <Field label="Senha" htmlFor="senha" error={errors.senha?.message}>
              <PasswordField
                id="senha"
                placeholder="Insira sua senha"
                autoComplete="current-password"
                autoFocus
                {...register("senha")}
              />
              <Link href="/recuperar-senha" className={styles.forgotLink}>
                Esqueceu sua senha? <span className={styles.forgotHighlight}>Clique aqui.</span>
              </Link>
            </Field>
          </>
        }
        footer={
          <Button type="submit"  className={styles.button} disabled={loading}>
            {loading ? "Entrando..." : "Próximo"}
          </Button>
        }
      />
    </AuthStepLayout>
  );
}
