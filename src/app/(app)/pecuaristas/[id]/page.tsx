"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { Banknote, CreditCard, User } from "lucide-react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { BackLink } from "@/components/back-link";
import { Field } from "@/components/form/field";
import { IconField } from "@/components/form/icon-field";
import { TintedInput } from "@/components/form/tinted-input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fetchPecuarista, updatePecuarista } from "@/lib/api/pecuaristas";
import { fetchFazendas } from "@/lib/api/fazendas";
import { FazendasChecklist } from "@/components/form/fazendas-checklist";
import type { Fazenda } from "@/lib/api/types";
import { ApiError } from "@/lib/api-client";
import { FISICO_JURIDICO_LABELS } from "@/lib/labels";
import { cn } from "@/lib/utils";
import fieldBox from "@/components/form/field-box.module.css";

const schema = z.object({
  nome_pecuarista: z.string().min(2, "Informe o nome do pecuarista.").max(50),
  fisico_juridico: z.enum(["fisico", "juridico"], { error: "Selecione o tipo de pessoa." }),
  cpf_cnpj: z.string().min(1, "Informe o CPF/CNPJ.").max(20),
  banco: z.string().min(1, "Informe o banco.").max(20),
  agencia: z.string().min(1, "Informe a agência.").max(5),
  conta: z.string().min(1, "Informe a conta.").max(10),
  chave_pix: z.string().min(1, "Informe a chave PIX.").max(50),
});
type FormValues = z.infer<typeof schema>;

export default function EditarPecuaristaPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [fazendas, setFazendas] = React.useState<Fazenda[]>([]);
  const [fazendaIds, setFazendaIds] = React.useState<number[]>([]);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [loaded, setLoaded] = React.useState(false);
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  React.useEffect(() => {
    let cancelled = false;
    Promise.all([fetchPecuarista(params.id), fetchFazendas()])
      .then(([pecuarista, fazendasData]) => {
        if (cancelled) return;
        reset({
          nome_pecuarista: pecuarista.nome_pecuarista,
          fisico_juridico: pecuarista.fisico_juridico,
          cpf_cnpj: pecuarista.cpf_cnpj,
          banco: pecuarista.banco,
          agencia: pecuarista.agencia,
          conta: pecuarista.conta,
          chave_pix: pecuarista.chave_pix,
        });
        setFazendas(fazendasData);
        setFazendaIds((pecuarista.pecuarista_fazenda ?? []).map((a) => a.fazenda_id));
        setLoaded(true);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setLoadError(err instanceof ApiError || err instanceof Error ? err.message : "Erro ao carregar.");
      });
    return () => {
      cancelled = true;
    };
  }, [params.id, reset]);

  async function onSubmit(values: FormValues) {
    if (fazendaIds.length === 0) {
      setSubmitError("Selecione ao menos uma fazenda.");
      return;
    }
    setSubmitError(null);
    try {
      await updatePecuarista(params.id, { ...values, fazenda_ids: fazendaIds });
      router.push("/pecuaristas");
    } catch (err) {
      setSubmitError(err instanceof ApiError || err instanceof Error ? err.message : "Erro ao salvar.");
    }
  }

  return (
    <div className="page-container page-narrow pt-safe">
      <BackLink href="/pecuaristas" />
      <h1 className="page-title">Editar Pecuarista</h1>

      {!loaded && !loadError ? <div className="state-box glass-panel">Carregando pecuarista...</div> : null}
      {loadError ? <div className="state-box state-error glass-panel">{loadError}</div> : null}

      {loaded ? (
        <>
          <form onSubmit={handleSubmit(onSubmit)} className="form-stack">
            <div className="form-fields">
              {submitError ? <p className="form-error">{submitError}</p> : null}

              <Field label="Fazendas do pecuarista" htmlFor="fazendas">
                <FazendasChecklist fazendas={fazendas} selected={fazendaIds} onChange={setFazendaIds} />
              </Field>

              <IconField icon={User} label="Nome Pecuarista" htmlFor="nome_pecuarista" error={errors.nome_pecuarista?.message}>
                <TintedInput id="nome_pecuarista" tint="pink" {...register("nome_pecuarista")} />
              </IconField>

              <Field label="Pessoa" htmlFor="fisico_juridico" error={errors.fisico_juridico?.message}>
                <Controller
                  control={control}
                  name="fisico_juridico"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="fisico_juridico" className={cn(fieldBox.box, fieldBox.pink)}>
                        <SelectValue>
                          {(value: "fisico" | "juridico" | null) =>
                            value ? FISICO_JURIDICO_LABELS[value] : "Selecione"
                          }
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fisico">{FISICO_JURIDICO_LABELS.fisico}</SelectItem>
                        <SelectItem value="juridico">{FISICO_JURIDICO_LABELS.juridico}</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </Field>

              <IconField icon={CreditCard} label="CPF/CNPJ" htmlFor="cpf_cnpj" error={errors.cpf_cnpj?.message}>
                <TintedInput id="cpf_cnpj" tint="pink" {...register("cpf_cnpj")} />
              </IconField>

              <IconField icon={Banknote} label="Banco" htmlFor="banco" error={errors.banco?.message}>
                <TintedInput id="banco" tint="pink" {...register("banco")} />
              </IconField>

              <div className="form-row">
                <Field label="Agência" htmlFor="agencia" error={errors.agencia?.message}>
                  <TintedInput id="agencia" tint="pink" {...register("agencia")} />
                </Field>
                <Field label="Conta" htmlFor="conta" error={errors.conta?.message}>
                  <TintedInput id="conta" tint="pink" {...register("conta")} />
                </Field>
              </div>

              <Field label="Chave Pix" htmlFor="chave_pix" error={errors.chave_pix?.message}>
                <TintedInput id="chave_pix" tint="pink" {...register("chave_pix")} />
              </Field>
            </div>

            <Button type="submit" variant="brand" size="xl" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Salvando..." : "Salvar Dados"}
            </Button>
          </form>
        </>
      ) : null}
    </div>
  );
}
