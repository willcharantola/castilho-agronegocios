"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Banknote, CreditCard, User, Warehouse } from "lucide-react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { BackLink } from "@/components/back-link";
import { Field } from "@/components/form/field";
import { IconField } from "@/components/form/icon-field";
import { TintedInput } from "@/components/form/tinted-input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createVendedor } from "@/lib/api/vendedores";
import { ApiError } from "@/lib/api-client";
import { FISICO_JURIDICO_LABELS } from "@/lib/labels";
import { useVendedorFlow } from "@/lib/flows/vendedor-flow";
import { cn } from "@/lib/utils";
import fieldBox from "@/components/form/field-box.module.css";
import styles from "./page.module.css";

const schema = z.object({
  nome_vendedor: z.string().min(2, "Informe o nome do vendedor.").max(50),
  fisico_juridico: z.enum(["fisico", "juridico"], { error: "Selecione o tipo de pessoa." }),
  cpf_cnpj: z.string().min(1, "Informe o CPF/CNPJ.").max(20),
  banco: z.string().min(1, "Informe o banco.").max(20),
  agencia: z.string().min(1, "Informe a agência.").max(5),
  conta: z.string().min(1, "Informe a conta.").max(10),
  chave_pix: z.string().min(1, "Informe a chave PIX.").max(50),
});
type FormValues = z.infer<typeof schema>;

export default function NovoVendedorDadosPage() {
  const router = useRouter();
  const { data, reset } = useVendedorFlow();
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  // Guarda o valor visto na primeira renderização — `reset()` no submit
  // zera `data.fazendaId` de propósito antes de navegar para longe, e não
  // queremos que isso dispare este redirecionamento de volta ao passo 1.
  const fazendaIdRef = React.useRef(data.fazendaId);
  React.useEffect(() => {
    if (!fazendaIdRef.current) router.replace("/vendedores/novo");
  }, [router]);

  async function onSubmit(values: FormValues) {
    if (!data.fazendaId) return;
    setSubmitError(null);
    try {
      await createVendedor({ fazenda_id: data.fazendaId, ...values });
      const returnTo = data.returnTo;
      reset();
      router.push(returnTo ?? "/vendedores");
    } catch (err) {
      setSubmitError(err instanceof ApiError || err instanceof Error ? err.message : "Erro ao salvar.");
    }
  }

  if (!data.fazendaId) return null;

  return (
    <div className={cn(styles.page, "pt-safe")}>
      <BackLink href="/vendedores/novo" />
      <h1 className={styles.title}>Cadastrar Vendedor</h1>

      <div className={cn(styles.fazendaCard, "glass-dark")}>
        <span className={styles.fazendaIcon}>
          <Warehouse size={18} />
        </span>
        <p className={styles.fazendaNome}>{data.fazendaNome}</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
        <div className={styles.fields}>
          {submitError ? <p className={styles.submitError}>{submitError}</p> : null}

          <IconField icon={User} label="Nome Vendedor" htmlFor="nome_vendedor" error={errors.nome_vendedor?.message}>
            <TintedInput id="nome_vendedor" tint="pink" placeholder="Nome do vendedor" autoFocus {...register("nome_vendedor")} />
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
            <TintedInput id="cpf_cnpj" tint="pink" placeholder="000.000.000-00" {...register("cpf_cnpj")} />
          </IconField>

          <IconField icon={Banknote} label="Banco" htmlFor="banco" error={errors.banco?.message}>
            <TintedInput id="banco" tint="pink" placeholder="Ex: Banco do Brasil" {...register("banco")} />
          </IconField>

          <div className={styles.row}>
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
          {isSubmitting ? "Salvando..." : "Salvar"}
        </Button>
      </form>
    </div>
  );
}
