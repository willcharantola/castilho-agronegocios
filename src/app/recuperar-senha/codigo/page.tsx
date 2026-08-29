"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { SimpleAuthLayout } from "@/components/auth/simple-auth-layout";
import { StepForm } from "@/components/auth/step-form";
import { OtpInput } from "@/components/form/otp-input";
import { Button } from "@/components/ui/button";
import { useRecuperarSenhaFlow } from "@/lib/flows/recuperar-senha-flow";

export default function RecuperarSenhaCodigoPage() {
  const router = useRouter();
  const { data, update } = useRecuperarSenhaFlow();
  const [codigo, setCodigo] = React.useState("");
  const [error, setError] = React.useState<string | undefined>();

  React.useEffect(() => {
    if (!data.email) router.replace("/recuperar-senha");
  }, [data.email, router]);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (codigo.length !== 4) {
      setError("Insira os 4 dígitos do código.");
      return;
    }
    update({ codigo });
    router.push("/recuperar-senha/nova-senha");
  }

  return (
    <SimpleAuthLayout
      backHref="/recuperar-senha"
      title={
        <>
          Insira o <span className="text-accent">código</span> que foi enviado no seu e-mail.
        </>
      }
    >
      <StepForm
        onSubmit={onSubmit}
        fields={<OtpInput value={codigo} onChange={setCodigo} error={error} />}
        footer={
          <Button type="submit" variant="brand" size="xl" className="w-full">
            Próximo
          </Button>
        }
      />
    </SimpleAuthLayout>
  );
}
