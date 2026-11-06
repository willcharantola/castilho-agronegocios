"use client";

import * as React from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Field } from "@/components/form/field";
import { MaskedNumberInput } from "@/components/form/masked-number-input";
import { OpcoesBotoes, opcoesDeLabels } from "@/components/form/opcoes-botoes";
import { TintedInput } from "@/components/form/tinted-input";
import { Button } from "@/components/ui/button";
import { fetchTiposGado } from "@/lib/api/tipos-gado";
import { formatCurrency } from "@/lib/format";
import { GENERO_LABELS, TIPO_LOTE_LABELS, VALOR_UNIDADE_LABELS } from "@/lib/labels";
import { mensagemDeErro } from "@/lib/offline/rede";
import type { CreateLoteInput, Genero, Lote, Modalidade, TipoGadoCatalogo, TipoLote } from "@/lib/api/types";
import styles from "./lote-form.module.css";

const OPCOES_TIPO_LOTE = opcoesDeLabels(TIPO_LOTE_LABELS);
const OPCOES_GENERO = opcoesDeLabels(GENERO_LABELS);

const vazioParaUndefined = (v: unknown) => (v === "" || v === null || Number.isNaN(v) ? undefined : v);

/** Campos por modalidade: nome só com pesagem, rendimento só em "arroba", quantidade só em "cabeca". */
function criarSchema(modalidade: Modalidade, nomesExistentes: string[]) {
  const comPesagem = modalidade !== "cabeca";
  return z
    .object({
      nome_lote: z.string().trim().max(30, "Máximo de 30 caracteres.").optional(),
      // R$ por arroba, kg ou cabeça (conforme a modalidade): cada lote tem o seu.
      valor_unidade: z.preprocess(
        vazioParaUndefined,
        z.coerce
          .number({ error: "Informe o valor." })
          .positive("Deve ser maior que zero.")
          .refine((v) => Math.round(v * 100) === v * 100, "Use no máximo 2 casas decimais.")
      ),
      rendimento_carcaca: z.preprocess(
        vazioParaUndefined,
        z.coerce
          .number({ error: "Informe o rendimento." })
          .min(0, "Deve ser entre 0 e 100.")
          .max(100, "Deve ser entre 0 e 100.")
          .refine((v) => Math.round(v * 100) === v * 100, "Use no máximo 2 casas decimais.")
          .optional()
      ),
      tipo_lote: z.enum(["Vaca", "Boi", "Novilha", "Garrote", "Bezerro", "Variados"], {
        error: "Selecione o tipo de lote.",
      }),
      genero: z.enum(["Macho", "Femea"], { error: "Selecione o gênero." }),
      // Opcionais: vazio vai como null.
      media_carimbo: z.string().trim().max(30, "Máximo de 30 caracteres.").optional(),
      ano_carimbo: z
        .string()
        .trim()
        .regex(/^(\d{4})?$/, "Informe o ano com 4 dígitos (ex: 2025).")
        .optional(),
      qtd_animais: z.preprocess(
        vazioParaUndefined,
        z.coerce.number().int("Deve ser um número inteiro.").min(1, "Deve ser pelo menos 1.").optional()
      ),
    })
    .superRefine((v, ctx) => {
      if (comPesagem) {
        const nome = v.nome_lote ?? "";
        if (!nome) ctx.addIssue({ code: "custom", path: ["nome_lote"], message: "Informe o nome do lote." });
        else if (nomesExistentes.includes(nome.toLowerCase())) {
          ctx.addIssue({ code: "custom", path: ["nome_lote"], message: "Já existe um lote com esse nome." });
        }
      }
      if (modalidade === "arroba" && v.rendimento_carcaca === undefined) {
        ctx.addIssue({ code: "custom", path: ["rendimento_carcaca"], message: "Informe o rendimento." });
      }
      if (modalidade === "cabeca" && v.qtd_animais === undefined) {
        ctx.addIssue({ code: "custom", path: ["qtd_animais"], message: "Informe a quantidade de animais." });
      }
    });
}
type FormSchema = ReturnType<typeof criarSchema>;

/**
 * Formulário do lote. Em "arroba"/"kg" é usado no modal "Adicionar lote" e na edição (com
 * "Excluir lote"); em "cabeca" é o formulário único do "Lote único" (sem nome nem
 * rendimento, com a quantidade de animais). O preço por unidade é de cada lote.
 * O nome do lote tem sugestões (Configurações → Tipos de gado): tocar em uma preenche o
 * campo, que continua livre.
 */
export function LoteForm({
  modalidade,
  lote,
  nomesExistentes = [],
  submitLabel,
  idPrefix = "lote-",
  onSubmit,
  onExcluir,
}: {
  modalidade: Modalidade;
  /** Lote em edição; omitido para cadastro novo. */
  lote?: Lote;
  /** Nomes dos outros lotes do negócio (para o nome ser único, ignorando maiúsculas). */
  nomesExistentes?: string[];
  submitLabel: string;
  idPrefix?: string;
  /** Lança erro para exibi-lo no formulário. */
  onSubmit: (input: CreateLoteInput) => Promise<void>;
  /** Mostra "Excluir lote"; lança erro para exibi-lo. */
  onExcluir?: () => Promise<void>;
}) {
  const [erro, setErro] = React.useState<string | null>(null);
  const [excluindo, setExcluindo] = React.useState(false);
  const schema = React.useMemo(
    () => criarSchema(modalidade, nomesExistentes.map((n) => n.toLowerCase())),
    [modalidade, nomesExistentes]
  );
  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<z.input<FormSchema>, unknown, z.output<FormSchema>>({
    resolver: zodResolver(schema),
    defaultValues: lote
      ? {
          nome_lote: lote.nome_lote,
          valor_unidade: lote.valor_unidade,
          rendimento_carcaca: lote.rendimento_carcaca,
          tipo_lote: lote.tipo_lote,
          genero: lote.genero,
          media_carimbo: lote.media_carimbo ?? "",
          ano_carimbo: lote.ano_carimbo ?? "",
          qtd_animais: modalidade === "cabeca" && lote.qtd_animais > 0 ? lote.qtd_animais : undefined,
        }
      : { media_carimbo: "", ano_carimbo: "" },
  });

  const porCabeca = modalidade === "cabeca";
  const qtd = Number(useWatch({ control, name: "qtd_animais" })) || 0;
  const valorUnidade = Number(useWatch({ control, name: "valor_unidade" })) || 0;
  const nomeAtual = (useWatch({ control, name: "nome_lote" }) ?? "").trim().toLowerCase();

  // Sugestões de nome: lista da empresa (guardada no aparelho para uso offline).
  const [sugestoes, setSugestoes] = React.useState<TipoGadoCatalogo[]>([]);
  React.useEffect(() => {
    if (porCabeca) return;
    let cancelado = false;
    fetchTiposGado()
      .then((tipos) => !cancelado && setSugestoes(tipos))
      // Sem a lista, o nome continua sendo digitado à mão.
      .catch(() => undefined);
    return () => {
      cancelado = true;
    };
  }, [porCabeca]);
  const id = (nome: string) => `${idPrefix}${nome}`;

  async function submit(v: z.output<FormSchema>) {
    setErro(null);
    try {
      await onSubmit({
        ...(porCabeca ? { qtd_animais: v.qtd_animais } : { nome_lote: v.nome_lote }),
        ...(modalidade === "arroba" ? { rendimento_carcaca: v.rendimento_carcaca } : {}),
        valor_unidade: v.valor_unidade,
        tipo_lote: v.tipo_lote as TipoLote,
        genero: v.genero as Genero,
        media_carimbo: v.media_carimbo || null,
        ano_carimbo: v.ano_carimbo || null,
      });
    } catch (err) {
      setErro(mensagemDeErro(err));
    }
  }

  async function excluir() {
    if (!onExcluir || !window.confirm("Excluir este lote?")) return;
    setErro(null);
    setExcluindo(true);
    try {
      await onExcluir();
    } catch (err) {
      setErro(mensagemDeErro(err, "Erro ao excluir o lote."));
    } finally {
      setExcluindo(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(submit)} className="form-stack">
      <div className="form-fields">
        {porCabeca ? null : (
          <Field label="Nome do lote" htmlFor={id("nome_lote")} error={errors.nome_lote?.message}>
            <TintedInput
              id={id("nome_lote")}
              tint="pink"
              maxLength={30}
              placeholder="Ex: Bois Nelore"
              {...register("nome_lote")}
            />
            {sugestoes.length > 0 ? (
              <div className={styles.sugestoes} role="group" aria-label="Sugestões de nome">
                {sugestoes.map((tipo) => (
                  <button
                    key={tipo.tipo_gado_id}
                    type="button"
                    className={styles.sugestao}
                    aria-pressed={nomeAtual === tipo.nome_gado.toLowerCase()}
                    onClick={() => setValue("nome_lote", tipo.nome_gado, { shouldValidate: true, shouldDirty: true })}
                  >
                    {tipo.nome_gado}
                  </button>
                ))}
              </div>
            ) : null}
          </Field>
        )}

        <Field
          label={VALOR_UNIDADE_LABELS[modalidade]}
          htmlFor={id("valor_unidade")}
          error={errors.valor_unidade?.message}
        >
          <Controller
            control={control}
            name="valor_unidade"
            render={({ field }) => (
              <MaskedNumberInput
                id={id("valor_unidade")}
                formato="moeda"
                name={field.name}
                value={field.value as number | string | undefined}
                onValueChange={field.onChange}
                onBlur={field.onBlur}
              />
            )}
          />
        </Field>

        <div className="form-row">
          {modalidade === "arroba" ? (
            <Field
              label="Rendimento de carcaça (%)"
              htmlFor={id("rendimento_carcaca")}
              error={errors.rendimento_carcaca?.message}
            >
              <Controller
                control={control}
                name="rendimento_carcaca"
                render={({ field }) => (
                  <MaskedNumberInput
                    id={id("rendimento_carcaca")}
                    formato="percentual"
                    name={field.name}
                    value={field.value as number | string | undefined}
                    onValueChange={field.onChange}
                    onBlur={field.onBlur}
                    placeholder="Ex: 52,5%"
                  />
                )}
              />
            </Field>
          ) : null}

          {porCabeca ? (
            <Field label="Quantidade de animais" htmlFor={id("qtd_animais")} error={errors.qtd_animais?.message}>
              <TintedInput
                id={id("qtd_animais")}
                tint="pink"
                type="number"
                inputMode="numeric"
                step="1"
                min="1"
                placeholder="Ex: 50"
                {...register("qtd_animais")}
              />
            </Field>
          ) : null}
        </div>

        <Field label="Tipo de lote" htmlFor={id("tipo_lote")} error={errors.tipo_lote?.message}>
          <Controller
            control={control}
            name="tipo_lote"
            render={({ field }) => (
              <OpcoesBotoes
                id={id("tipo_lote")}
                ariaLabel="Tipo de lote"
                opcoes={OPCOES_TIPO_LOTE}
                value={field.value}
                onChange={field.onChange}
              />
            )}
          />
        </Field>

        <Field label="Gênero" htmlFor={id("genero")} error={errors.genero?.message}>
          <Controller
            control={control}
            name="genero"
            render={({ field }) => (
              <OpcoesBotoes
                id={id("genero")}
                ariaLabel="Gênero"
                opcoes={OPCOES_GENERO}
                value={field.value}
                onChange={field.onChange}
              />
            )}
          />
        </Field>

        <div className="form-row">
          <Field label="Média do carimbo (opcional)" htmlFor={id("media_carimbo")} error={errors.media_carimbo?.message}>
            <TintedInput
              id={id("media_carimbo")}
              tint="pink"
              maxLength={30}
              placeholder="Ex: 8,9 e 10"
              {...register("media_carimbo")}
            />
          </Field>
          <Field label="Ano do carimbo (opcional)" htmlFor={id("ano_carimbo")} error={errors.ano_carimbo?.message}>
            <TintedInput
              id={id("ano_carimbo")}
              tint="pink"
              type="number"
              inputMode="numeric"
              placeholder="Ex: 2025"
              {...register("ano_carimbo")}
            />
          </Field>
        </div>

        {porCabeca ? (
          <p className="form-hint">
            Valor total (estimado): <b>{formatCurrency(valorUnidade * qtd)}</b>
          </p>
        ) : null}
      </div>

      {erro ? <p className="form-error">{erro}</p> : null}

      <Button type="submit" variant="brand" size="xl" className="w-full" disabled={isSubmitting || excluindo}>
        {isSubmitting ? "Salvando..." : submitLabel}
      </Button>
      {onExcluir ? (
        <Button
          type="button"
          variant="ghost"
          size="xl"
          className="w-full"
          onClick={excluir}
          disabled={isSubmitting || excluindo}
        >
          {excluindo ? "Excluindo..." : "Excluir lote"}
        </Button>
      ) : null}
    </form>
  );
}
