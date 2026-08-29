"use client";

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
import { useLoginFlow } from "@/lib/flows/login-flow";

const schema = z.object({
  email: z.string().min(1, "Informe seu e-mail.").email("Digite um e-mail válido."),
});
type FormValues = z.infer<typeof schema>;

export default function LoginEmailPage() {
  const router = useRouter();
  const { data, update } = useLoginFlow();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: data.email },
  });

  function onSubmit(values: FormValues) {
    update(values);
    router.push("/login/senha");
  }

  return (
    <AuthStepLayout
      backHref="/login"
      icon={Mail}
      title={
        <>
          Insira seu <span className="text-accent">e-mail.</span>
        </>
      }
      step={{ current: 1, total: 2 }}
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
