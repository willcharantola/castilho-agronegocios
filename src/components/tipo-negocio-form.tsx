"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { updateNegocio } from "@/lib/api/negocios";
import { TIPO_NEGOCIO_LABELS } from "@/lib/labels";
import { mensagemDeErro } from "@/lib/offline/rede";
import { cn } from "@/lib/utils";
import type { Negocio, TipoNegocio } from "@/lib/api/types";
import fieldBox from "@/components/form/field-box.module.css";
import styles from "./comissao-form.module.css";

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
  const [error, setError] = React.useState<string | null>(null);
  const [sucesso, setSucesso] = React.useState(false);

  async function atualizar(event: React.FormEvent) {
    event.preventDefault();
    setSucesso(false);
    setError(null);
    setSalvando(true);
    try {
      onUpdated(await updateNegocio(negocioId, { tipo_negocio: valor }));
      setSucesso(true);
    } catch (err) {
      setError(mensagemDeErro(err, "Erro ao atualizar."));
    } finally {
      setSalvando(false);
    }
  }

  return (
    <form onSubmit={atualizar} className={cn(styles.card, "glass-panel")}>
      <label htmlFor="tipo_negocio" className={styles.title}>
        Tipo de negócio
      </label>
      <div className={styles.row}>
        <Select
          value={valor}
          onValueChange={(novo: TipoNegocio | null) => {
            if (!novo) return;
            setValor(novo);
            setSucesso(false);
          }}
        >
          <SelectTrigger id="tipo_negocio" className={cn(fieldBox.box, fieldBox.pink, styles.input)}>
            <SelectValue>{(value: TipoNegocio | null) => (value ? TIPO_NEGOCIO_LABELS[value] : "Selecione")}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(TIPO_NEGOCIO_LABELS) as TipoNegocio[]).map((key) => (
              <SelectItem key={key} value={key}>
                {TIPO_NEGOCIO_LABELS[key]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button type="submit" variant="brand" className={styles.button} disabled={salvando || valor === tipoNegocio}>
          {salvando ? "Atualizando..." : "Atualizar"}
        </Button>
      </div>
      <p className={styles.hint}>Funrural e Senar são recalculados conforme o tipo.</p>
      {error ? <p className="form-error">{error}</p> : null}
      {sucesso ? <p className={styles.success}>Tipo de negócio atualizado.</p> : null}
    </form>
  );
}
