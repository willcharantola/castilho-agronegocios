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
import { useRecuperarSenhaFlow } from "@/lib/flows/recuperar-senha-flow";

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

export default function NovaSenhaPage() {
  const router = useRouter();
  const { data, reset } = useRecuperarSenhaFlow();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  React.useEffect(() => {
    if (!data.codigo) router.replace("/recuperar-senha");
  }, [data.codigo, router]);

  function onSubmit() {
    reset();
    router.push("/login?status=reset-success");
  }

  return (
    <SimpleAuthLayout backHref="/recuperar-senha/codigo" title="Insira sua nova senha.">
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
            Redefinir
          </Button>
        }
      />
    </SimpleAuthLayout>
  );
}
