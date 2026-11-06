"use client";

import * as React from "react";
import { DollarSign, FileText, TrendingUp, Users, type LucideIcon } from "lucide-react";
import { useAviso } from "@/components/aviso";
import { TintedInput } from "@/components/form/tinted-input";
import { formatCurrency, startOfMonth, toDateInputValue } from "@/lib/format";
import { cn } from "@/lib/utils";
import { fetchNegocio, fetchNegocios, fetchResumoNegocios } from "@/lib/api/negocios";
import { fetchFazendas } from "@/lib/api/fazendas";
import { gerarRomaneios } from "@/lib/relatorio-romaneio";
import type { Fazenda, Negocio, ResumoNegocios } from "@/lib/api/types";
import { valorRestrito } from "@/lib/permissoes";
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
  // Métricas do período; para usuário Normal a API devolve as três null ("-").
  const [resumo, setResumo] = React.useState<ResumoNegocios | null>(null);
  const [fazendas, setFazendas] = React.useState<Fazenda[]>([]);
  const [error, setError] = React.useState<string | null>(null);

  const [gerandoRelatorio, setGerandoRelatorio] = React.useState(false);
  const avisar = useAviso();

  React.useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNegocios(null);
    setResumo(null);
    setError(null);

    const filtros = { data_inicio: dataInicio || undefined, data_fim: dataFim || undefined };
    // A lista só serve ao relatório; os indicadores vêm do resumo.
    Promise.all([fetchNegocios(filtros), fetchResumoNegocios(filtros)])
      .then(([data, metricas]) => {
        if (cancelled) return;
        setNegocios(data);
        setResumo(metricas);
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

  function resetarPeriodo() {
    setDataInicio(toDateInputValue(startOfMonth(hoje)));
    setDataFim(toDateInputValue(hoje));
  }

  async function handleGerarRelatorio() {
    if (!negocios || negocios.length === 0) return;
    setGerandoRelatorio(true);
    try {
      // Romaneio de cada negócio do período (o romaneio precisa do detalhe: gados e pecuarista).
      const detalhes = await Promise.all(negocios.map((n) => fetchNegocio(n.negocio_id)));
      const { avisos } = await gerarRomaneios(detalhes, fazendasPorId);
      for (const aviso of avisos) avisar(aviso, "aviso");
    } catch (err) {
      avisar(
        err instanceof ApiError || err instanceof Error ? err.message : "Erro ao gerar relatório."
      , "aviso");
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
          value={resumo ? valorRestrito(resumo.negocios_realizados, true) : "—"}
        />
        <StatRow
          icon={DollarSign}
          label="Comissão total"
          value={resumo ? valorRestrito(resumo.comissao_total, true, formatCurrency) : "—"}
        />
        <StatRow
          icon={Users}
          label="Total de cabeças"
          value={resumo ? valorRestrito(resumo.total_cabecas, true) : "—"}
        />
      </div>

    
    </div>
  );
}
