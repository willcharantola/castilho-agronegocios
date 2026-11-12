"use client";

import * as React from "react";
import { Eye, EyeOff } from "lucide-react";
import { useAviso } from "@/components/aviso";
import { Button } from "@/components/ui/button";
import {
  AJUDA_VISUALIZACAO,
  CampoResponsavel,
  VISUALIZACAO_LABELS,
  nomeDoUsuario,
  useResponsaveis,
} from "@/components/responsavel-fields";
import { updateNegocio } from "@/lib/api/negocios";
import type { Negocio, StatusVisualizacao } from "@/lib/api/types";
import { mensagemDeErro } from "@/lib/offline/rede";
import { cn } from "@/lib/utils";
import styles from "./acesso-negocio-form.module.css";

/** Selo "Público" / "Privado" (detalhe e listagem de negócios). */
export function SeloVisualizacao({ status }: { status: StatusVisualizacao | undefined }) {
  if (!status) return null;
  const Icone = status === "Publico" ? Eye : EyeOff;
  return (
    <span className={cn(styles.selo, status === "Publico" ? styles.seloPublico : styles.seloPrivado)}>
      <Icone size={14} aria-hidden />
      {VISUALIZACAO_LABELS[status]}
    </span>
  );
}

/**
 * Responsável e visualização de um negócio já sincronizado (só Admin; online). O status
 * alterna rápido sem mexer no responsável; trocar o responsável pede confirmação e não
 * mexe no status.
 */
export function AcessoNegocioForm({
  negocio,
  onUpdated,
}: {
  negocio: Pick<Negocio, "negocio_id" | "responsavel_id" | "responsavel" | "status_visualizacao">;
  onUpdated: (negocio: Negocio) => void;
}) {
  const avisar = useAviso();
  const { responsaveis } = useResponsaveis();
  const [salvando, setSalvando] = React.useState(false);
  const [responsavelId, setResponsavelId] = React.useState<number | null>(negocio.responsavel_id ?? null);
  const status = negocio.status_visualizacao ?? "Privado";
  const atualId = negocio.responsavel_id ?? null;

  async function salvar(input: { responsavel_id?: number; status_visualizacao?: StatusVisualizacao }, ok: string) {
    setSalvando(true);
    try {
      onUpdated(await updateNegocio(negocio.negocio_id, input));
      avisar(ok);
    } catch (err) {
      avisar(mensagemDeErro(err, "Erro ao atualizar."), "aviso");
    } finally {
      setSalvando(false);
    }
  }

  function alternarStatus() {
    const novo: StatusVisualizacao = status === "Publico" ? "Privado" : "Publico";
    void salvar({ status_visualizacao: novo }, `Negócio agora está ${VISUALIZACAO_LABELS[novo]}.`);
  }

  function trocarResponsavel() {
    if (responsavelId === null || responsavelId === atualId) return;
    const novo = responsaveis?.find((u) => u.usuario_id === responsavelId);
    const nome = novo ? nomeDoUsuario(novo) : "o usuário escolhido";
    const anterior = negocio.responsavel?.nome;
    const confirmado = window.confirm(
      `Trocar o responsável para ${nome}?` +
        (anterior ? ` ${anterior} deixará de ver este negócio.` : "") +
        " As pesagens já lançadas continuam no negócio.",
    );
    if (confirmado) void salvar({ responsavel_id: responsavelId }, "Responsável atualizado.");
  }

  return (
    <section className={cn(styles.card, "glass-panel")} aria-label="Acesso ao negócio">
      <div className={styles.cabecalho}>
        <div>
          <p className={styles.title}>Visualização</p>
          <p className={styles.hint}>{AJUDA_VISUALIZACAO[status]}</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={status === "Publico"}
          aria-label="Negócio público"
          className={cn(styles.toggle, status === "Publico" && styles.toggleLigado)}
          onClick={alternarStatus}
          disabled={salvando}
        >
          <span className={styles.toggleBola} />
        </button>
      </div>
      <SeloVisualizacao status={status} />

      <p className={styles.hint}>
        Responsável atual: <strong>{negocio.responsavel?.nome ?? "—"}</strong>
      </p>
      <CampoResponsavel id="responsavel_id" value={responsavelId} onChange={setResponsavelId} />
      <Button
        type="button"
        variant="brand"
        className={styles.atualizar}
        onClick={trocarResponsavel}
        disabled={salvando || responsavelId === null || responsavelId === atualId}
      >
        {salvando ? "Atualizando..." : "Trocar responsável"}
      </Button>
    </section>
  );
}
