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
import styles from "./page.module.css";

const schema = z.object({
  senha: z.string().min(6, "A senha deve ter pelo menos 6 caracteres."),
});
type FormValues = z.infer<typeof schema>;

export default function LoginSenhaPage() {
  const router = useRouter();
  const { data } = useLoginFlow();
  const [loading, setLoading] = React.useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  React.useEffect(() => {
    if (!data.email) router.replace("/login/email");
  }, [data.email, router]);

  function onSubmit() {
    setLoading(true);
    // No backend wired up yet — simulate the request so the flow feels real.
    setTimeout(() => router.push("/home"), 500);
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
        }
        footer={
          <Button type="submit" variant="brand" size="xl" className="w-full" disabled={loading}>
            {loading ? "Entrando..." : "Próximo"}
          </Button>
        }
      />
    </AuthStepLayout>
  );
}
