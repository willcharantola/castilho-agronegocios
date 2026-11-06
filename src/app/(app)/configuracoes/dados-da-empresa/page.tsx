"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAviso } from "@/components/aviso";
import { BackLink } from "@/components/back-link";
import { Field } from "@/components/form/field";
import { MaskedTextField } from "@/components/form/masked-text-field";
import { TintedInput } from "@/components/form/tinted-input";
import { Button } from "@/components/ui/button";
import { getUsuario } from "@/lib/api-client";
import { fetchDadosEmpresa, updateDadosEmpresa } from "@/lib/api/configuracoes";
import { cnpjValido, mascaraCnpj } from "@/lib/documentos";
import { mensagemDeErro } from "@/lib/offline/rede";
import styles from "./page.module.css";

const texto = (mensagem: string, max: number) =>
  z.string().trim().min(1, mensagem).max(max, `Use no máximo ${max} caracteres.`);

const schema = z.object({
  nome: texto("Informe o nome da empresa.", 50),
  cnpj: z.string().min(1, "Informe o CNPJ.").refine(cnpjValido, "CNPJ inválido. Confira os números."),
  creci: texto("Informe o CRECI.", 20),
  banco: texto("Informe o banco.", 20),
  agencia: texto("Informe a agência.", 4),
  conta: texto("Informe a conta.", 10),
  chave_pix: texto("Informe a chave Pix.", 50),
});

type FormValues = z.infer<typeof schema>;

/** Campos de texto simples (o CNPJ, com máscara, fica à parte). */
const CAMPOS = [
  { name: "creci", label: "CRECI", maxLength: 20 },
  { name: "banco", label: "Banco", maxLength: 20 },
  { name: "agencia", label: "Agência", maxLength: 4, inputMode: "numeric" },
  { name: "conta", label: "Conta", maxLength: 10 },
  { name: "chave_pix", label: "Chave Pix", maxLength: 50 },
] as const;

export default function DadosDaEmpresaPage() {
  // Só Admin altera (a API responde 403 aos demais); Normal vê em modo somente leitura.
  const admin = getUsuario()?.nivel_acesso === "Admin";
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [loaded, setLoaded] = React.useState(false);
  const avisar = useAviso();
  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  React.useEffect(() => {
    let cancelled = false;
    fetchDadosEmpresa()
      .then((dados) => {
        if (cancelled) return;
        reset(dados);
        setLoaded(true);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setLoadError(mensagemDeErro(err, "Erro ao carregar."));
      });
    return () => {
      cancelled = true;
    };
  }, [reset]);

  async function onSubmit(values: FormValues) {
    try {
      reset(await updateDadosEmpresa(values));
      avisar("Dados da empresa salvos.");
    } catch (err) {
      avisar(mensagemDeErro(err), "aviso");
    }
  }

  return (
    <div className="page-container page-narrow pt-safe">
      <BackLink href="/configuracoes" />
      <h1 className="page-title">Dados da empresa</h1>

      {!loaded && !loadError ? <div className="state-box glass-panel">Carregando dados...</div> : null}
      {loadError ? <div className="state-box state-error glass-panel">{loadError}</div> : null}

      {loaded ? (
        <form onSubmit={handleSubmit(onSubmit)} className="form-stack">
          <div className="form-fields">
            <Field label="Nome da empresa" htmlFor="nome" error={errors.nome?.message}>
              <TintedInput id="nome" maxLength={50} disabled={!admin} {...register("nome")} />
            </Field>

            <Field label="CNPJ" htmlFor="cnpj" error={errors.cnpj?.message}>
              <MaskedTextField
                control={control}
                name="cnpj"
                mascara={mascaraCnpj}
                id="cnpj"
                tint="green"
                placeholder="00.000.000/0000-00"
                disabled={!admin}
              />
            </Field>

            {CAMPOS.map(({ name, label, ...props }) => (
              <Field key={name} label={label} htmlFor={name} error={errors[name]?.message}>
                <TintedInput id={name} disabled={!admin} {...props} {...register(name)} />
              </Field>
            ))}
          </div>

          {admin ? (
            <Button type="submit" variant="brand" size="xl" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Salvando..." : "Salvar"}
            </Button>
          ) : (
            <p className={styles.hint}>Apenas administradores podem alterar.</p>
          )}
        </form>
      ) : null}
    </div>
  );
}
