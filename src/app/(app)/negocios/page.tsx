"use client";

import * as React from "react";
import Link from "next/link";
import { FileText, Search, Warehouse } from "lucide-react";
import { useAviso } from "@/components/aviso";
import { Button } from "@/components/ui/button";
import { Fab } from "@/components/fab";
import { formatCurrency, formatDate, formatPercent, formatFazenda } from "@/lib/format";
import { cn } from "@/lib/utils";
import { fetchNegocio, fetchNegocios } from "@/lib/api/negocios";
import { fetchFazendas } from "@/lib/api/fazendas";
import { gerarRomaneios } from "@/lib/relatorio-romaneio";
import type { Fazenda, Negocio } from "@/lib/api/types";
import { ApiError } from "@/lib/api-client";
import { PendenteBadge } from "@/components/offline/pendente-badge";
import { idTemporario, usePendentes, useVersaoSincronizacao } from "@/lib/offline/fila";
import { mesclarPendentes, negocioDePendente, type ExibicaoNegocio } from "@/lib/offline/pendentes";
import { formatarCriterioComissao, modoDoNegocio } from "@/lib/comissao";
import { BotaoOlhoComissao, exibirComissao, useExibicaoComissao } from "@/lib/permissoes";
import styles from "./page.module.css";

export default function NegociosPage() {
  const [negociosServidor, setNegocios] = React.useState<Negocio[] | null>(null);
  // Negócios criados offline aparecem no topo, marcados como pendentes de sincronização
  // (com os nomes de fazenda/comprador guardados no aparelho ao cadastrar).
  const registrosPendentes = usePendentes("negocio");
  const negocios = React.useMemo(
    // A fila offline vem na ordem de sincronização (mais antigo primeiro); na tela, o
    // mais recente fica no topo, como na lista do servidor.
    () => mesclarPendentes(negociosServidor, registrosPendentes.map(negocioDePendente).reverse()),
    [negociosServidor, registrosPendentes]
  );
  const nomesPendentes = React.useMemo(
    () => Object.fromEntries(registrosPendentes.map((r) => [idTemporario(r), r.exibicao as ExibicaoNegocio])),
    [registrosPendentes]
  );
  const versaoSincronizacao = useVersaoSincronizacao();
  const [fazendas, setFazendas] = React.useState<Fazenda[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [reloadKey, setReloadKey] = React.useState(0);

  const [busca, setBusca] = React.useState("");
  const [fazendaId, setFazendaId] = React.useState("");
  const [dataInicio, setDataInicio] = React.useState("");
  const [dataFim, setDataFim] = React.useState("");

  // Comissão: "-" para Normal; para Admin começa escondida e o olho revela todas as linhas.
  const comissao = useExibicaoComissao();

  const [gerandoRelatorio, setGerandoRelatorio] = React.useState(false);
  const avisar = useAviso();

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
  }, [reloadKey, fazendaId, dataInicio, dataFim, versaoSincronizacao]);

  const buscaLower = busca.trim().toLowerCase();
  const filtrados = negocios?.filter((negocio) => {
    if (buscaLower === "") return true;
    const fazendaNome = nomesPendentes[negocio.negocio_id]?.fazendaNome ?? fazendasPorId[negocio.fazenda_id] ?? "";
    // Frigorífico ou pecuarista: o nome vem no comprador unificado da API.
    const compradorNome = nomesPendentes[negocio.negocio_id]?.compradorNome ?? negocio.comprador?.nome ?? "";
    return (
      fazendaNome.toLowerCase().includes(buscaLower) ||
      compradorNome.toLowerCase().includes(buscaLower)
    );
  });

  async function handleGerarRelatorio() {
    // Só negócios já no servidor: os pendentes ainda não têm valores calculados.
    const sincronizados = filtrados?.filter((n) => !n.pendente);
    if (!sincronizados || sincronizados.length === 0) return;
    setGerandoRelatorio(true);
    try {
      // O romaneio precisa de gados, pecuarista e dados bancários, que só vêm no detalhe.
      const detalhes = await Promise.all(sincronizados.map((n) => fetchNegocio(n.negocio_id)));
      const { avisos } = await gerarRomaneios(
        detalhes,
        Object.fromEntries(fazendas.map((f) => [f.fazenda_id, f]))
      );
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
      <div className="page-header-acoes">
        <h1 className="page-title">Negócios Cadastrados</h1>
        {comissao.admin ? <BotaoOlhoComissao visivel={comissao.visivel} onAlternar={comissao.alternar} /> : null}
      </div>

      <div className="search-box">
        <Search className="search-icon" size={18} />
        <input
          className="search-input glass-panel"
          placeholder="Buscar por fazenda ou comprador..."
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
        <div className="state-box glass-panel">Carregando negócios...</div>
      ) : null}

      {error && !negocios ? (
        <div className="state-box state-error glass-panel">
          {error}
          <div>
            <Button
              className="retry-button"
              variant="brand"
              onClick={() => setReloadKey((k) => k + 1)}
            >
              Tentar novamente
            </Button>
          </div>
        </div>
      ) : null}

      {filtrados && filtrados.length === 0 ? (
        <div className="state-box glass-panel">
          {negocios && negocios.length > 0
            ? "Nenhum negócio encontrado para essa busca/filtro."
            : "Nenhum negócio cadastrado ainda."}
        </div>
      ) : null}

      {filtrados && filtrados.length > 0 ? (
        <div className="card-list">
          {filtrados.map((negocio) => (
            <Link
              key={negocio.negocio_id}
              href={`/negocios/${negocio.negocio_id}`}
              // Pendente: ainda não existe no servidor, então não há tela de detalhe para abrir.
              aria-disabled={negocio.pendente ? true : undefined}
              onClick={negocio.pendente ? (e) => e.preventDefault() : undefined}
              className="list-card glass-panel"
            >
              <span className="card-icon">
                <Warehouse size={18} />
              </span>
              <div className="card-info">

                <p className="card-name">
                  {formatFazenda(
                    nomesPendentes[negocio.negocio_id]?.fazendaNome ??
                      fazendasPorId[negocio.fazenda_id] ??
                      `#${negocio.fazenda_id}`
                  )}
                </p>

                <p className="card-meta">
                  Comprador:{" "}
                  {nomesPendentes[negocio.negocio_id]?.compradorNome ?? negocio.comprador?.nome ?? "—"}
                </p>
                <p className="card-meta">{formatDate(negocio.data_negocio)}</p>

                 <p className="card-meta">
                  Comissão: {exibirComissao(negocio.comissao, comissao.exibicao, formatCurrency)}
                  {/* Critério (R$/@ ou %) só com o olho aberto: escondido fica só a máscara. */}
                  {comissao.exibicao === "visivel" && negocio.porcentagem_comissao !== null
                    ? ` (${formatarCriterioComissao(negocio.porcentagem_comissao, modoDoNegocio(negocio))})`
                    : null}
                  
                </p>

                <p className="card-meta">Cabeças negociadas: {negocio.qtd_animais ?? "—"}</p>
                <p className="card-meta">
                  Valor líquido:{" "}
                  {negocio.valor_total_liquido !== null ? formatCurrency(negocio.valor_total_liquido) : "—"}
                </p>
                {negocio.pendente ? <PendenteBadge pendente={negocio.pendente} /> : null}
              </div>
              <div className={styles.cardAmount}>
                 <p className={styles.cardCommission}>{negocio.valor_total_bruto !== null ? formatCurrency(negocio.valor_total_bruto) : "—"}</p>
                <p className={styles.cardHeads}>Valor bruto</p>

                
              </div>
            </Link>
          ))}
        </div>
      ) : null}

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
