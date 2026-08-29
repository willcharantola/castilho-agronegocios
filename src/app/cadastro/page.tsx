"use client";

import { useRouter } from "next/navigation";
import { UserPlus } from "lucide-react";
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
  nome: z.string().min(2, "Informe seu nome."),
  sobrenome: z.string().min(2, "Informe seu sobrenome."),
});
type FormValues = z.infer<typeof schema>;

export default function CadastroPage() {
  const router = useRouter();
  const { data, update } = useCadastroFlow();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { nome: data.nome, sobrenome: data.sobrenome },
  });

  function onSubmit(values: FormValues) {
    update(values);
    router.push("/cadastro/email");
  }

  return (
    <AuthStepLayout
      backHref="/login"
      icon={UserPlus}
      title={
        <>
          Insira seus <span className="text-accent">dados.</span>
        </>
      }
      step={{ current: 1, total: 3 }}
    >
      <StepForm
        onSubmit={handleSubmit(onSubmit)}
        fields={
          <>
            <Field label="Nome" htmlFor="nome" error={errors.nome?.message}>
              <TintedInput id="nome" placeholder="Seu nome" autoFocus {...register("nome")} />
            </Field>
            <Field label="Sobrenome" htmlFor="sobrenome" error={errors.sobrenome?.message}>
              <TintedInput
                id="sobrenome"
                placeholder="Seu sobrenome"
                {...register("sobrenome")}
              />
            </Field>
          </>
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
