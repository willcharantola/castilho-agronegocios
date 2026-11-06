"use client";

import * as React from "react";
import { useAviso } from "@/components/aviso";
import { Button } from "@/components/ui/button";
import { OpcoesBotoes, opcoesDeLabels } from "@/components/form/opcoes-botoes";
import { updateNegocio } from "@/lib/api/negocios";
import { TIPO_NEGOCIO_LABELS } from "@/lib/labels";
import { mensagemDeErro } from "@/lib/offline/rede";
import { cn } from "@/lib/utils";
import type { Negocio, TipoNegocio } from "@/lib/api/types";
import styles from "./comissao-form.module.css";

const OPCOES_TIPO_NEGOCIO = opcoesDeLabels(TIPO_NEGOCIO_LABELS);

/**
 * Troca o tipo de negócio de um negócio já cadastrado. A API recalcula Funrural e Senar
 * com as alíquotas gravadas no próprio negócio.
 */
export function TipoNegocioForm({
  negocioId,
  tipoNegocio,
  onUpdated,
}: {
  negocioId: number;
  tipoNegocio: TipoNegocio;
  onUpdated: (negocio: Negocio) => void;
}) {
  const [valor, setValor] = React.useState<TipoNegocio>(tipoNegocio);
  const [salvando, setSalvando] = React.useState(false);
  const avisar = useAviso();

  async function atualizar(event: React.FormEvent) {
    event.preventDefault();
    setSalvando(true);
    try {
      onUpdated(await updateNegocio(negocioId, { tipo_negocio: valor }));
      avisar("Tipo de negócio atualizado.");
    } catch (err) {
      avisar(mensagemDeErro(err, "Erro ao atualizar."), "aviso");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <form onSubmit={atualizar} className={cn(styles.card, "glass-panel")}>
      <p className={styles.title}>Tipo de negócio</p>
      <OpcoesBotoes
        id="tipo_negocio"
        ariaLabel="Tipo de negócio"
        opcoes={OPCOES_TIPO_NEGOCIO}
        value={valor}
        onChange={(novo) => {
          setValor(novo);
        }}
      />
      <Button type="submit" variant="brand" disabled={salvando || valor === tipoNegocio}>
        {salvando ? "Atualizando..." : "Atualizar"}
      </Button>
      <p className={styles.hint}>Funrural e Senar são recalculados conforme o tipo.</p>
    </form>
  );
}
