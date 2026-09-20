"use client";

import * as React from "react";
import Link from "next/link";
import { FileText, Search, Warehouse } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Fab } from "@/components/fab";
import { formatCurrency, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { fetchNegocios } from "@/lib/api/negocios";
import { fetchFazendas } from "@/lib/api/fazendas";
import { gerarRelatorioNegocios } from "@/lib/relatorio";
import type { Fazenda, Negocio } from "@/lib/api/types";
import { ApiError } from "@/lib/api-client";
import styles from "./page.module.css";

export default function NegociosPage() {
  const [negocios, setNegocios] = React.useState<Negocio[] | null>(null);
  const [fazendas, setFazendas] = React.useState<Fazenda[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [reloadKey, setReloadKey] = React.useState(0);

  const [busca, setBusca] = React.useState("");
  const [fazendaId, setFazendaId] = React.useState("");
  const [dataInicio, setDataInicio] = React.useState("");
  const [dataFim, setDataFim] = React.useState("");

  const [gerandoRelatorio, setGerandoRelatorio] = React.useState(false);
  const [relatorioError, setRelatorioError] = React.useState<string | null>(null);

  const fazendasPorId = React.useMemo(
    () => Object.fromEntries(fazendas.map((f) => [f.fazenda_id, f.nome_fazenda])),
    [fazendas]
  );

  React.useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNegocios(null);
    setError(null);

    Promise.all([
      fetchNegocios({
        fazenda_id: fazendaId ? Number(fazendaId) : undefined,
        data_inicio: dataInicio || undefined,
        data_fim: dataFim || undefined,
      }),
      fetchFazendas(),
    ])
      .then(([negociosData, fazendasData]) => {
        if (cancelled) return;
        setNegocios(negociosData);
        setFazendas(fazendasData);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof ApiError || err instanceof Error ? err.message : "Erro ao carregar.");
      });

    return () => {
      cancelled = true;
    };
  }, [reloadKey, fazendaId, dataInicio, dataFim]);

  const buscaLower = busca.trim().toLowerCase();
  const filtrados = negocios?.filter((negocio) => {
    if (buscaLower === "") return true;
    const fazendaNome = fazendasPorId[negocio.fazenda_id] ?? "";
    return (
      fazendaNome.toLowerCase().includes(buscaLower) ||
      negocio.marchante.toLowerCase().includes(buscaLower)
    );
  });

  async function handleGerarRelatorio() {
    if (!filtrados || filtrados.length === 0) return;
    setRelatorioError(null);
    setGerandoRelatorio(true);
    try {
      await gerarRelatorioNegocios(filtrados, fazendasPorId);
    } catch (err) {
      setRelatorioError(
        err instanceof ApiError || err instanceof Error ? err.message : "Erro ao gerar relatório."
      );
    } finally {
      setGerandoRelatorio(false);
    }
  }

  return (
    <div className={cn(styles.page, "pt-safe")}>
      <h1 className={styles.title}>Negócios Cadastrados</h1>

      <div className={styles.searchWrap}>
        <Search className={styles.searchIcon} size={18} />
        <input
          className={cn(styles.searchInput, "glass-panel")}
          placeholder="Buscar por fazenda ou marchante..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
      </div>

      <div className={styles.filters}>
        <div className={styles.filterGroup}>
          <span className={styles.filterLabel}>De</span>
          <input
            type="date"
            className={cn(styles.filterSelect, "glass-panel")}
            value={dataInicio}
            onChange={(e) => setDataInicio(e.target.value)}
          />
        </div>
        <div className={styles.filterGroup}>
          <span className={styles.filterLabel}>Até</span>
          <input
            type="date"
            className={cn(styles.filterSelect, "glass-panel")}
            value={dataFim}
            onChange={(e) => setDataFim(e.target.value)}
          />
        </div>
      </div>

      {negocios === null && !error ? (
        <div className={cn(styles.state, "glass-panel")}>Carregando negócios...</div>
      ) : null}

      {error ? (
        <div className={cn(styles.state, styles.stateError, "glass-panel")}>
          {error}
          <div>
            <Button
              className={styles.retryButton}
              variant="brand"
              onClick={() => setReloadKey((k) => k + 1)}
            >
              Tentar novamente
            </Button>
          </div>
        </div>
      ) : null}

      {filtrados && filtrados.length === 0 ? (
        <div className={cn(styles.state, "glass-panel")}>
          {negocios && negocios.length > 0
            ? "Nenhum negócio encontrado para essa busca/filtro."
            : "Nenhum negócio cadastrado ainda."}
        </div>
      ) : null}

      {filtrados && filtrados.length > 0 ? (
        <div className={styles.list}>
          {filtrados.map((negocio) => (
            <Link
              key={negocio.negocio_id}
              href={`/negocios/${negocio.negocio_id}`}
              className={cn(styles.card, "glass-panel")}
            >
              <span className={styles.cardIcon}>
                <Warehouse size={18} />
              </span>
              <div className={styles.cardInfo}>
                <p className={styles.cardFarm}>
                  {fazendasPorId[negocio.fazenda_id] ?? `Fazenda #${negocio.fazenda_id}`}
                </p>
                <p className={styles.cardMeta}>
                  Vendedor: {negocio.marchante} · {formatDate(negocio.data_negocio)}
                </p>
                <p className={styles.cardHeads}>Cabeças negociadas: {negocio.qtd_animais ?? "—"}</p>
              </div>
              <div className={styles.cardAmount}>
                <p className={styles.cardCommission}>{formatCurrency(negocio.comissao)}</p>
                <p className={styles.cardHeads}>Comissão</p>
              </div>
            </Link>
          ))}
        </div>
      ) : null}

      {relatorioError ? <p className={styles.relatorioError}>{relatorioError}</p> : null}

      <Fab
        icon={FileText}
        label="Gerar relatório"
        onClick={handleGerarRelatorio}
        disabled={gerandoRelatorio || !filtrados || filtrados.length === 0}
        disabledTitle={gerandoRelatorio ? "Gerando relatório..." : "Nenhum negócio para exportar"}
      />
    </div>
  );
}
