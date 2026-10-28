"use client";

import * as React from "react";
import { DollarSign, FileText, TrendingUp, Users, type LucideIcon } from "lucide-react";
import { Fab } from "@/components/fab";
import { TintedInput } from "@/components/form/tinted-input";
import { formatCurrency, startOfMonth, toDateInputValue } from "@/lib/format";
import { cn } from "@/lib/utils";
import { fetchNegocio, fetchNegocios } from "@/lib/api/negocios";
import { fetchFazendas } from "@/lib/api/fazendas";
import { gerarRomaneios } from "@/lib/relatorio-romaneio";
import type { Fazenda, Negocio } from "@/lib/api/types";
import { ApiError } from "@/lib/api-client";
import styles from "./page.module.css";

function StatRow({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className={cn(styles.row, "glass-panel")}>
      <span className="card-icon">
        <Icon size={20} />
      </span>
      <p className={styles.rowLabel}>{label}</p>
      <p className={styles.rowValue}>{value}</p>
    </div>
  );
}

/**
 * Mesmos indicadores da home, mas com o período editável e exportação em
 * relatório. A home mostra sempre o mês corrente, sem filtros, para ficar
 * mais limpa.
 */
export default function DashboardPage() {
  const hoje = React.useMemo(() => new Date(), []);
  const [dataInicio, setDataInicio] = React.useState(() => toDateInputValue(startOfMonth(hoje)));
  const [dataFim, setDataFim] = React.useState(() => toDateInputValue(hoje));

  const [negocios, setNegocios] = React.useState<Negocio[] | null>(null);
  const [fazendas, setFazendas] = React.useState<Fazenda[]>([]);
  const [error, setError] = React.useState<string | null>(null);

  const [gerandoRelatorio, setGerandoRelatorio] = React.useState(false);
  const [relatorioError, setRelatorioError] = React.useState<string | null>(null);
  const [relatorioAvisos, setRelatorioAvisos] = React.useState<string[]>([]);

  React.useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNegocios(null);
    setError(null);

    fetchNegocios({ data_inicio: dataInicio || undefined, data_fim: dataFim || undefined })
      .then((data) => {
        if (!cancelled) setNegocios(data);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof ApiError || err instanceof Error ? err.message : "Erro ao carregar.");
      });

    return () => {
      cancelled = true;
    };
  }, [dataInicio, dataFim]);

  React.useEffect(() => {
    // Só serve para dar nome às fazendas no relatório — falha silenciosa,
    // o relatório cai no fallback "Fazenda #id".
    fetchFazendas().then(setFazendas).catch(() => {});
  }, []);

  const fazendasPorId = React.useMemo(
    () => Object.fromEntries(fazendas.map((f) => [f.fazenda_id, f])),
    [fazendas]
  );

  // `comissao` é o valor em R$ já calculado pela API para cada negócio.
  const comissaoTotal = negocios?.reduce((sum, n) => sum + (n.comissao ?? 0), 0) ?? null;
  const cabecasTotal = negocios?.reduce((sum, n) => sum + (n.qtd_animais ?? 0), 0) ?? null;

  function resetarPeriodo() {
    setDataInicio(toDateInputValue(startOfMonth(hoje)));
    setDataFim(toDateInputValue(hoje));
  }

  async function handleGerarRelatorio() {
    if (!negocios || negocios.length === 0) return;
    setRelatorioError(null);
    setRelatorioAvisos([]);
    setGerandoRelatorio(true);
    try {
      // Romaneio de cada negócio do período (o romaneio precisa do detalhe: gados e pecuarista).
      const detalhes = await Promise.all(negocios.map((n) => fetchNegocio(n.negocio_id)));
      const { avisos } = await gerarRomaneios(detalhes, fazendasPorId);
      setRelatorioAvisos(avisos);
    } catch (err) {
      setRelatorioError(
        err instanceof ApiError || err instanceof Error ? err.message : "Erro ao gerar relatório."
      );
    } finally {
      setGerandoRelatorio(false);
    }
  }

  return (
    <div className={cn("page-container page-wide", styles.page, "pt-safe")}>
      <h1 className="page-title">Dashboard</h1>

      <div className={styles.filterRow}>
        <div className={cn("date-input-fix", styles.filterField)}>
          <label htmlFor="dataInicio" className={styles.filterLabel}>
            De
          </label>
          <TintedInput
            id="dataInicio"
            tint="none"
            type="date"
            value={dataInicio}
            max={dataFim || toDateInputValue(hoje)}
            onChange={(e) => setDataInicio(e.target.value)}
          />
        </div>
        <div className={cn("date-input-fix", styles.filterField)}>
          <label htmlFor="dataFim" className={styles.filterLabel}>
            Até
          </label>
          <TintedInput
            id="dataFim"
            tint="none"
            type="date"
            value={dataFim}
            min={dataInicio || undefined}
            max={toDateInputValue(hoje)}
            onChange={(e) => setDataFim(e.target.value)}
          />
        </div>
        <button type="button" className={styles.filterReset} onClick={resetarPeriodo}>
          Este mês
        </button>
      </div>

      {error ? <p className="report-error">{error}</p> : null}

      <div className="card-list">
        <StatRow
          icon={TrendingUp}
          label="Negócios realizados"
          value={negocios ? String(negocios.length) : "—"}
        />
        <StatRow
          icon={DollarSign}
          label="Comissão total"
          value={comissaoTotal !== null ? formatCurrency(comissaoTotal) : "—"}
        />
        <StatRow
          icon={Users}
          label="Total de cabeças"
          value={cabecasTotal !== null ? String(cabecasTotal) : "—"}
        />
      </div>

      {relatorioError ? <p className="report-error">{relatorioError}</p> : null}
      {relatorioAvisos.map((aviso) => (
        <p key={aviso} className="report-notice">
          {aviso}
        </p>
      ))}

    
    </div>
  );
}
