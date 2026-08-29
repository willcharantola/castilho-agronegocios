"use client";

import * as React from "react";
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
import { useCadastroFlow } from "@/lib/flows/cadastro-flow";

const schema = z
  .object({
    senha: z.string().min(6, "A senha deve ter pelo menos 6 caracteres."),
    confirmarSenha: z.string(),
  })
  .refine((values) => values.senha === values.confirmarSenha, {
    message: "As senhas não coincidem.",
    path: ["confirmarSenha"],
  });
type FormValues = z.infer<typeof schema>;

export default function CadastroSenhaPage() {
  const router = useRouter();
  const { data, reset } = useCadastroFlow();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  React.useEffect(() => {
    if (!data.email) router.replace("/cadastro/email");
  }, [data.email, router]);

  function onSubmit() {
    reset();
    router.push("/cadastro/sucesso");
  }

  return (
    <AuthStepLayout
      backHref="/cadastro/email"
      icon={Lock}
      title={
        <>
          Crie sua <span className="text-accent">senha.</span>
        </>
      }
      step={{ current: 3, total: 3 }}
    >
      <StepForm
        onSubmit={handleSubmit(onSubmit)}
        fields={
          <>
            <Field label="Senha" htmlFor="senha" error={errors.senha?.message}>
              <PasswordField
                id="senha"
                placeholder="Insira uma senha"
                autoComplete="new-password"
                autoFocus
                {...register("senha")}
              />
            </Field>
            <Field
              label="Confirme sua senha"
              htmlFor="confirmarSenha"
              error={errors.confirmarSenha?.message}
            >
              <PasswordField
                id="confirmarSenha"
                placeholder="Insira uma senha"
                autoComplete="new-password"
                {...register("confirmarSenha")}
              />
            </Field>
          </>
        }
        footer={
          <Button type="submit" variant="brand" size="xl" className="w-full">
            Cadastrar
          </Button>
        }
      />
    </AuthStepLayout>
  );
}
