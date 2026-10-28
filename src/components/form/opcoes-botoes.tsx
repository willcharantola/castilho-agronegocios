"use client";

import { cn } from "@/lib/utils";
import styles from "./opcoes-botoes.module.css";

export type OpcaoBotao<T extends string> = {
  value: T;
  label: string;
  /** Texto menor abaixo do rótulo (ex.: percentual de rendimento). */
  detalhe?: string;
};

/**
 * Botões lado a lado com seleção única (comportamento de radio) — substitui o Select quando
 * as opções são poucas. Quebram de linha quando não cabem na largura.
 */
export function OpcoesBotoes<T extends string>({
  id,
  ariaLabel,
  opcoes,
  value,
  onChange,
}: {
  id: string;
  ariaLabel: string;
  opcoes: OpcaoBotao<T>[];
  value: T | undefined | null;
  onChange: (value: T) => void;
}) {
  return (
    <div id={id} role="radiogroup" aria-label={ariaLabel} className={styles.opcoes}>
      {opcoes.map((opcao) => {
        const selecionada = value === opcao.value;
        return (
          <button
            key={opcao.value}
            type="button"
            role="radio"
            aria-checked={selecionada}
            className={cn(styles.opcao, selecionada && styles.selecionada)}
            onClick={() => onChange(opcao.value)}
          >
            <span className={styles.rotulo}>{opcao.label}</span>
            {opcao.detalhe ? <span className={styles.detalhe}>{opcao.detalhe}</span> : null}
          </button>
        );
      })}
    </div>
  );
}

/** Opções a partir de um mapa valor → rótulo (ex.: TIPO_LOTE_LABELS), na ordem das chaves. */
export function opcoesDeLabels<T extends string>(labels: Record<T, string>): OpcaoBotao<T>[] {
  return (Object.keys(labels) as T[]).map((value) => ({ value, label: labels[value] }));
}
