"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { SimpleAuthLayout } from "@/components/auth/simple-auth-layout";
import { StepForm } from "@/components/auth/step-form";
import { Field } from "@/components/form/field";
import { TintedInput } from "@/components/form/tinted-input";
import { Button } from "@/components/ui/button";
import { useRecuperarSenhaFlow } from "@/lib/flows/recuperar-senha-flow";

const schema = z.object({
  email: z.string().min(1, "Informe seu e-mail.").email("Digite um e-mail válido."),
});
type FormValues = z.infer<typeof schema>;

export default function RecuperarSenhaPage() {
  const router = useRouter();
  const { data, update } = useRecuperarSenhaFlow();
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
    router.push("/recuperar-senha/codigo");
  }

  return (
    <SimpleAuthLayout
      backHref="/login/senha"
      title="Esqueceu sua senha?"
      subtitle="Vamos te ajudar a redefini-la."
    >
      <StepForm
        onSubmit={handleSubmit(onSubmit)}
        fields={
          <Field label="Digite seu e-mail" htmlFor="email" error={errors.email?.message}>
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
    </SimpleAuthLayout>
  );
}
