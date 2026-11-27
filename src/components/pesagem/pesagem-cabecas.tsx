"use client";

import * as React from "react";
import { Beef, Pencil, Warehouse } from "lucide-react";
import { BackLink } from "@/components/back-link";
import { Button } from "@/components/ui/button";
import { GadoForm } from "@/components/gado-form";
import { GadoEditDialog } from "@/components/gado-edit-dialog";
import { arroba, ChipsLotes, chipId, Detalhes, kg } from "@/components/negocio-carrossel";
import { PendenteBadge } from "@/components/offline/pendente-badge";
import { formatCurrency, formatNumber, formatFazenda } from "@/lib/format";
import { MODALIDADE_LABELS } from "@/lib/labels";
import { cadastrarGado } from "@/lib/flows/operacoes-lote";
import type { NegocioComPendencias } from "@/lib/offline/pendentes";
import { cn } from "@/lib/utils";
import type { Gado } from "@/lib/api/types";
import styles from "./pesagem-cabecas.module.css";

/**
 * Tela de pesagem (modalidades "arroba" e "kg"): resumo do negócio, formulário de cadastro em
 * sequência (o peso é limpo e o lote continua escolhido) e as cabeças já cadastradas, que abrem
 * no modal de edição. Usada no cadastro do negócio e ao adicionar cabeças a um negócio existente.
 */
export function PesagemCabecas({
  negocio,
  erro,
  recarregar,
  voltar,
  fazendaNome,
  compradorNome,
  ultimoLoteId,
  onLoteUsado,
  acao,
}: {
  negocio: NegocioComPendencias | null;
  erro: string | null;
  recarregar: () => Promise<void>;
  voltar: { href: string; label?: string };
  /** Nomes de reserva enquanto a API não devolve a fazenda/comprador do negócio. */
  fazendaNome?: string;
  compradorNome?: string;
  /** Último lote usado: fica pré-selecionado na próxima cabeça. */
  ultimoLoteId: number | null;
  onLoteUsado: (loteId: number) => void;
  /** Botão abaixo das cabeças (ex.: "Revisar e concluir", "Voltar ao negócio"). */
  acao: { label: string; onClick: () => void };
}) {
  const [gadoEmEdicao, setGadoEmEdicao] = React.useState<Gado | null>(null);
  // Filtro das cabeças cadastradas: 0 = "Geral", i = i-ésimo lote (como no detalhe do negócio).
  const [filtro, setFiltro] = React.useState(0);
  const idListaCabecas = `${React.useId()}-cabecas`;

  const cabecas = React.useMemo(
    () =>
      (negocio?.lotes ?? [])
        .flatMap((lote) => lote.gados.map((gado) => ({ gado, nomeLote: lote.nome_lote })))
        // Mais recente primeiro (a última pesagem logo abaixo do formulário): as ainda na
        // fila (id negativo) são as mais novas; ids locais e reais não se comparam entre si.
        .sort(
          (a, b) =>
            Number(b.gado.gado_id < 0) - Number(a.gado.gado_id < 0) ||
            Math.abs(b.gado.gado_id) - Math.abs(a.gado.gado_id),
        ),
    [negocio],
  );

  const lotes = negocio?.lotes ?? [];
  // Se o lote filtrado deixar de existir, volta ao último disponível.
  const indiceFiltro = Math.min(filtro, lotes.length);
  const loteFiltrado = indiceFiltro > 0 ? lotes[indiceFiltro - 1] : null;
  const cabecasFiltradas = loteFiltrado ? cabecas.filter(({ gado }) => loteFiltrado.gados.includes(gado)) : cabecas;
  // Calculados das cabeças listadas, para incluir as ainda na fila offline.
  const pesoTotal = cabecasFiltradas.reduce((soma, { gado }) => soma + gado.peso_total, 0);
  const pesoTotalArroba = cabecasFiltradas.reduce((soma, { gado }) => soma + gado.peso_arroba, 0);
  const resumoFiltro = [
    { label: "Cabeças", valor: String(cabecasFiltradas.length) },
    { label: "Peso total", valor: cabecasFiltradas.length > 0 ? kg(pesoTotal) : "—" },
    { label: "Peso médio", valor: cabecasFiltradas.length > 0 ? kg(pesoTotal / cabecasFiltradas.length) : "—" },
    // Na modalidade "kg" não há peso em arroba (a API grava 0).
    ...(negocio?.modalidade === "arroba"
      ? [
          {
            label: "Peso médio (@)",
            valor: cabecasFiltradas.length > 0 ? arroba(pesoTotalArroba / cabecasFiltradas.length) : "—",
          },
        ]
      : []),
  ];

  return (
    <div className={cn("page-narrow", styles.page, "pt-safe")}>
      <BackLink href={voltar.href} label={voltar.label} />

      {!negocio && !erro ? <div className="state-box glass-panel">Carregando negócio...</div> : null}
      {erro && !negocio ? <div className="state-box state-error glass-panel">{erro}</div> : null}

      {negocio ? (
        <div className={cn(styles.summary, "glass-dark")}>
          <div className="card-header">
            <span className="card-icon-on-dark">
              <Warehouse size={18} />
            </span>
            <div>
              <p className={styles.summaryFarm}>{formatFazenda(negocio.fazenda?.nome_fazenda ?? fazendaNome ?? "")}</p>
              <p className="card-meta-on-dark">Pecuarista: {negocio.pecuarista.nome_pecuarista}</p>
              <p className="card-meta-on-dark">Comprador: {negocio.comprador?.nome ?? compradorNome ?? "—"}</p>
            </div>
          </div>
          <div className={styles.summaryStats}>
            <div>
              <p className={styles.summaryStatLabel}>Modalidade</p>
              <p className={styles.summaryStatValue}>{MODALIDADE_LABELS[negocio.modalidade]}</p>
            </div>
            <div>
              <p className={styles.summaryStatLabel}>Lotes</p>
              <p className={styles.summaryStatValue}>{negocio.lotes.length}</p>
            </div>
          </div>
          <div className={styles.summaryFooter}>
            <span>
              Cabeças: <b>{cabecas.length}</b>
            </span>
            <span>
              Valor bruto: <b>{negocio.valor_total_bruto !== null ? formatCurrency(negocio.valor_total_bruto) : "—"}</b>
            </span>
          </div>
        </div>
      ) : null}

      {negocio && negocio.lotes.length > 0 && negocio.modalidade !== "cabeca" ? (
        <GadoForm
          // Remonta quando a lista de lotes muda (ex.: lote sincronizado ganhou id real).
          key={negocio.lotes.map((l) => l.lote_id).join(",")}
          modalidade={negocio.modalidade}
          tipoGado={negocio.tipo_gado}
          lotes={negocio.lotes}
          defaultValues={{ loteId: ultimoLoteId ?? (negocio.lotes.length === 1 ? negocio.lotes[0].lote_id : null) }}
          submitLabel="Cadastrar"
          submittingLabel="Cadastrando..."
          resetAfterSubmit
          onSubmit={async ({ loteId, pesoTotal }) => {
            const lote = negocio.lotes.find((l) => l.lote_id === loteId);
            if (!lote) throw new Error("Lote não encontrado.");
            // Sem conexão, a cabeça fica na fila e aparece na lista como pendente.
            const sincronizado = await cadastrarGado(negocio, lote, pesoTotal);
            onLoteUsado(loteId);
            if (sincronizado) await recarregar();
          }}
        />
      ) : null}

      {negocio ? (
        <div className={styles.sessionList}>
          {cabecas.length > 0 ? (
            <>
              <p className="section-title">Cabeças cadastradas</p>
              <ChipsLotes lotes={lotes} ativo={indiceFiltro} onAtivoChange={setFiltro} controlaId={idListaCabecas} />
              <Detalhes itens={resumoFiltro} />
              <div
                id={idListaCabecas}
                role="tabpanel"
                aria-labelledby={chipId(idListaCabecas, indiceFiltro)}
                className={styles.sessionItems}
              >
                {cabecasFiltradas.length === 0 ? (
                  <p className={styles.sessionEmpty}>Nenhuma cabeça cadastrada neste lote.</p>
                ) : null}
                {cabecasFiltradas.map(({ gado, nomeLote }) => (
                  <button
                    key={gado.gado_id}
                    type="button"
                    className={styles.sessionRow}
                    onClick={() => setGadoEmEdicao(gado)}
                    aria-label={`Editar cabeça de ${formatNumber(gado.peso_total)} kg do lote ${nomeLote}`}
                  >
                    <span className={styles.sessionIcon}>
                      <Beef size={18} />
                    </span>
                    <div className={styles.sessionInfo}>
                      <p className={styles.sessionName}>{nomeLote}</p>
                      <p className={styles.sessionMeta}>
                        Peso: {formatNumber(gado.peso_total)} kg · Arrobas: {formatNumber(gado.peso_arroba)}
                      </p>
                      {"pendente" in gado && gado.pendente ? <PendenteBadge pendente={gado.pendente} /> : null}
                    </div>
                    <div className={styles.sessionAmount}>
                      <p className={styles.sessionAmountValue}>
                        {gado.valor_total !== null ? formatCurrency(gado.valor_total) : "—"}
                      </p>
                    </div>
                    <Pencil size={16} className={styles.sessionEditIcon} aria-hidden />
                  </button>
                ))}
              </div>
            </>
          ) : null}
          <Button type="button" variant="ghost" size="xl" className={styles.finishButton} onClick={acao.onClick}>
            {acao.label}
          </Button>
        </div>
      ) : null}

      {negocio ? (
        <GadoEditDialog
          gado={gadoEmEdicao}
          negocio={negocio}
          lotes={negocio.lotes}
          onClose={() => setGadoEmEdicao(null)}
          onSaved={recarregar}
        />
      ) : null}
    </div>
  );
}
