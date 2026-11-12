"use client";

import * as React from "react";
import { Field } from "@/components/form/field";
import { OpcoesBotoes, type OpcaoBotao } from "@/components/form/opcoes-botoes";
import { fetchResponsaveis } from "@/lib/api/usuarios";
import type { OpcaoResponsavel, StatusVisualizacao } from "@/lib/api/types";
import { mensagemDeErro } from "@/lib/offline/rede";

export const VISUALIZACAO_LABELS: Record<StatusVisualizacao, string> = {
  Publico: "Público",
  Privado: "Privado",
};

export const AJUDA_VISUALIZACAO: Record<StatusVisualizacao, string> = {
  Publico: "O usuário responsável enxerga o negócio e registra a pesagem.",
  Privado: "Só os administradores enxergam o negócio.",
};

const OPCOES_VISUALIZACAO: OpcaoBotao<StatusVisualizacao>[] = (["Privado", "Publico"] as const).map((v) => ({
  value: v,
  label: VISUALIZACAO_LABELS[v],
  detalhe: AJUDA_VISUALIZACAO[v],
}));

/** Usuários da empresa que podem ser responsáveis (GET /usuarios/responsaveis, só Admin). */
export function useResponsaveis() {
  const [responsaveis, setResponsaveis] = React.useState<OpcaoResponsavel[] | null>(null);
  const [erro, setErro] = React.useState<string | null>(null);
  React.useEffect(() => {
    let cancelado = false;
    fetchResponsaveis()
      .then((dados) => {
        if (!cancelado) setResponsaveis(dados);
      })
      .catch((err: unknown) => {
        if (!cancelado) setErro(mensagemDeErro(err, "Não foi possível carregar os usuários."));
      });
    return () => {
      cancelado = true;
    };
  }, []);
  return { responsaveis, erro };
}

export function nomeDoUsuario(u: Pick<OpcaoResponsavel, "nome" | "sobrenome">) {
  return `${u.nome} ${u.sobrenome}`.trim();
}

/** Seletor "Usuário responsável" (um botão por usuário da empresa). */
export function CampoResponsavel({
  id,
  value,
  onChange,
  error,
}: {
  id: string;
  value: number | null | undefined;
  onChange: (usuarioId: number) => void;
  error?: string;
}) {
  const { responsaveis, erro } = useResponsaveis();
  const opcoes: OpcaoBotao<string>[] = (responsaveis ?? []).map((u) => ({
    value: String(u.usuario_id),
    label: nomeDoUsuario(u),
    detalhe: u.nivel_acesso === "Admin" ? "Administrador" : "Normal",
  }));
  return (
    <Field label="Usuário responsável" htmlFor={id} error={error ?? erro ?? undefined}>
      {responsaveis === null && !erro ? <p className="form-hint">Carregando usuários...</p> : null}
      {responsaveis ? (
        <OpcoesBotoes
          id={id}
          ariaLabel="Usuário responsável"
          opcoes={opcoes}
          value={value != null ? String(value) : null}
          onChange={(v) => onChange(Number(v))}
          grade
        />
      ) : null}
      <p className="form-hint">Usuário Normal só enxerga os negócios em que é responsável.</p>
    </Field>
  );
}

/** Seletor "Visualização" (Público / Privado), com a explicação de cada opção. */
export function CampoVisualizacao({
  id,
  value,
  onChange,
  error,
}: {
  id: string;
  value: StatusVisualizacao | null | undefined;
  onChange: (status: StatusVisualizacao) => void;
  error?: string;
}) {
  return (
    <Field label="Visualização" htmlFor={id} error={error}>
      <OpcoesBotoes id={id} ariaLabel="Visualização" opcoes={OPCOES_VISUALIZACAO} value={value} onChange={onChange} />
    </Field>
  );
}
