"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Mail } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AuthStepLayout } from "@/components/auth/auth-step-layout";
import { StepForm } from "@/components/auth/step-form";
import { Field } from "@/components/form/field";
import { TintedInput } from "@/components/form/tinted-input";
import { Button } from "@/components/ui/button";
import { useCadastroFlow } from "@/lib/flows/cadastro-flow";

const schema = z.object({
  email: z.string().min(1, "Informe seu e-mail.").email("Digite um e-mail válido."),
});
type FormValues = z.infer<typeof schema>;

export default function CadastroEmailPage() {
  const router = useRouter();
  const { data, update } = useCadastroFlow();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: data.email },
  });

  React.useEffect(() => {
    if (!data.nome) router.replace("/cadastro");
  }, [data.nome, router]);

  function onSubmit(values: FormValues) {
    update(values);
    router.push("/cadastro/senha");
  }

  return (
    <AuthStepLayout
      backHref="/cadastro"
      icon={Mail}
      title={
        <>
          Insira seu <span className="text-accent">e-mail.</span>
        </>
      }
      step={{ current: 2, total: 3 }}
    >
      <StepForm
        onSubmit={handleSubmit(onSubmit)}
        fields={
          <Field label="E-mail" htmlFor="email" error={errors.email?.message}>
            <TintedInput
              id="email"
              type="email"
              placeholder="Exemplo: nome@email.com"
              autoComplete="email"
              autoFocus
              {...register("email")}
            />
          </Field>
        }
        footer={
          <Button type="submit" variant="brand" size="xl" className="w-full">
            Próximo
          </Button>
        }
      />
    </AuthStepLayout>
  );
}
