"use client";

import Link from "next/link";
import { Beef } from "lucide-react";
import { PendenteBadge } from "@/components/offline/pendente-badge";
import { formatCurrency, formatHora, formatNumber, formatPercent } from "@/lib/format";
import { GENERO_LABELS } from "@/lib/labels";
import type { ComPendencia, LoteComPendencia } from "@/lib/offline/pendentes";
import type { Gado } from "@/lib/api/types";
import { cn } from "@/lib/utils";
import styles from "./lista-gados.module.css";

/**
 * Cabeças do filtro ativo do carrossel (`loteFiltrado` null = "Geral", todas), uma por
 * linha. Com `editavel`, cada cabeça sincronizada abre a página de edição; com
 * `onGadoClick` (ex.: modal de edição na revisão do cadastro), qualquer cabeça, inclusive
 * as ainda na fila offline, chama a função.
 */
export function ListaGados({
  negocioId,
  lotes,
  loteFiltrado,
  editavel = false,
  onGadoClick,
}: {
  negocioId: number;
  lotes: LoteComPendencia[];
  loteFiltrado: LoteComPendencia | null;
  editavel?: boolean;
  onGadoClick?: (gado: ComPendencia<Gado>) => void;
}) {
  const cabecas = (loteFiltrado ? [loteFiltrado] : lotes).flatMap((lote) =>
    lote.gados.map((gado) => ({ gado, lote }))
  );

  if (cabecas.length === 0) {
    return (
      <div className="state-box glass-panel">
        {loteFiltrado ? "Nenhum gado cadastrado neste lote." : "Nenhum gado cadastrado neste negócio."}
      </div>
    );
  }

  return (
    <div className={styles.gadoList}>
      {cabecas.map(({ gado, lote }) => {
        const conteudo = (
          <>
            <span className={styles.gadoIcon}>
              <Beef size={18} />
            </span>
            <div className={styles.gadoInfo}>
              <p className={styles.gadoName}>{lote.nome_lote}</p>
              <p className={styles.gadoMeta}>Gênero: {GENERO_LABELS[lote.genero]}</p>
              <p className={styles.gadoMeta}>Rend.: {formatPercent(lote.rendimento_carcaca)}</p>
              <p className={styles.gadoMeta}>Peso p/ cálculo: {formatNumber(gado.peso_calculo)}</p>
              <p className={styles.gadoMeta}>
                {gado.horario_pesagem ? `Pesado às ${formatHora(gado.horario_pesagem)}` : null}
              </p>
              <p className={styles.gadoMeta}>Peso total: {formatNumber(gado.peso_total)}</p>
              <p className={styles.gadoMeta}>Peso da @: {formatNumber(gado.peso_arroba)}</p>
              {gado.pendente ? <PendenteBadge pendente={gado.pendente} /> : null}
            </div>
            <div className={styles.gadoAmount}>
              <p className={styles.gadoAmountValue}>
                {gado.valor_total !== null ? formatCurrency(gado.valor_total) : "—"}
              </p>
              <p className={styles.gadoMeta}>Valor da cabeça</p>
            </div>
          </>
        );
        if (onGadoClick) {
          // div com role="button": o conteúdo da linha tem blocos, que não cabem num <button>.
          return (
            <div
              key={gado.gado_id}
              role="button"
              tabIndex={0}
              className={cn(styles.gadoRow, styles.gadoRowLink, styles.gadoRowBotao)}
              aria-label={`Editar cabeça de ${formatNumber(gado.peso_total)} kg do ${lote.nome_lote}`}
              onClick={() => onGadoClick(gado)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onGadoClick(gado);
                }
              }}
            >
              {conteudo}
            </div>
          );
        }
        // Cabeças pendentes (só no aparelho) não abrem a página de edição: ela usa a API.
        return !editavel || gado.pendente || gado.gado_id <= 0 ? (
          <div key={gado.gado_id} className={styles.gadoRow}>
            {conteudo}
          </div>
        ) : (
          <Link
            key={gado.gado_id}
            href={`/negocios/${negocioId}/gado/${gado.gado_id}/editar`}
            className={cn(styles.gadoRow, styles.gadoRowLink)}
            aria-label={`Editar cabeça de ${formatNumber(gado.peso_total)} kg do ${lote.nome_lote}`}
          >
            {conteudo}
          </Link>
        );
      })}
    </div>
  );
}
