"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Search, Warehouse } from "lucide-react";
import { BackLink } from "@/components/back-link";
import { ProgressSteps } from "@/components/progress-steps";
import { cn } from "@/lib/utils";
import { fetchFazendas } from "@/lib/api/fazendas";
import type { Fazenda } from "@/lib/api/types";
import { ApiError } from "@/lib/api-client";
import { useNegocioFlow } from "@/lib/flows/negocio-flow";
import { PendenteBadge } from "@/components/offline/pendente-badge";
import { mesclarPendentes, useFazendasPendentes, type ComPendencia } from "@/lib/offline/pendentes";
import styles from "./page.module.css";

export default function NovoNegocioFazendaPage() {
  const router = useRouter();
  const { update } = useNegocioFlow();
  const [fazendasServidor, setFazendas] = React.useState<Fazenda[] | null>(null);
  // Inclui fazendas cadastradas offline ainda não sincronizadas (id negativo).
  const fazendasPendentes = useFazendasPendentes();
  const fazendas = React.useMemo(
    () => mesclarPendentes(fazendasServidor, fazendasPendentes),
    [fazendasServidor, fazendasPendentes]
  );
  const [error, setError] = React.useState<string | null>(null);
  const [busca, setBusca] = React.useState("");

  React.useEffect(() => {
    fetchFazendas()
      .then(setFazendas)
      .catch((err: unknown) => {
        setError(err instanceof ApiError || err instanceof Error ? err.message : "Erro ao carregar.");
      });
  }, []);

  function selecionar(fazenda: Fazenda) {
    update({
      fazendaId: fazenda.fazenda_id,
      fazendaNome: fazenda.nome_fazenda,
      pecuaristaId: null,
      pecuaristaNome: "",
      negocioId: null,
    });
    router.push("/negocios/novo/pecuarista");
  }

  const buscaLower = busca.trim().toLowerCase();
  const filtradas = fazendas?.filter(
    (f) => buscaLower === "" || f.nome_fazenda.toLowerCase().includes(buscaLower)
  );

  return (
    <div className="page-container page-wide pt-safe">
      <BackLink href="/" />
      <h1 className={cn("page-title", styles.title)}>Cadastrar Novo Negócio</h1>
      <ProgressSteps current={1} total={6} />

      <div className="search-box">
        <Search className="search-icon" size={18} />
        <input
          className="search-input glass-panel"
          placeholder="Buscar fazenda..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
      </div>

      {fazendas === null && !error ? (
        <div className="state-box glass-panel">Carregando fazendas...</div>
      ) : null}

      {error && !fazendas ? <div className="state-box state-error glass-panel">{error}</div> : null}

      {filtradas && filtradas.length === 0 ? (
        <div className="state-box glass-panel">
          {fazendas && fazendas.length > 0
            ? "Nenhuma fazenda encontrada para essa busca."
            : "Nenhuma fazenda cadastrada ainda. Cadastre uma fazenda antes de criar um negócio."}
        </div>
      ) : null}

      {filtradas && filtradas.length > 0 ? (
        <div className="card-list">
          {filtradas.map((fazenda: ComPendencia<Fazenda>) => (
            <button
              key={fazenda.fazenda_id}
              type="button"
              onClick={() => selecionar(fazenda)}
              className={cn("list-card", styles.card, "glass-panel")}
            >
                 <span className="card-icon">
                  {fazenda.marca_url ? (
                  <img src={fazenda.marca_url} alt={fazenda.nome_fazenda} className={styles.cardImage}/>
                  ) : (
                  <Warehouse size={18} />
                  )}
              </span>
              <div className="card-info">
                <p className="card-name">{fazenda.nome_fazenda}</p>
                <p className="card-meta">Município: {fazenda.municipio}</p>
                 <p className="card-meta">I.E.: {fazenda.inscricao_estadual}</p>
                {fazenda.pendente ? <PendenteBadge pendente={fazenda.pendente} /> : null}
              </div>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
