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
import styles from "./page.module.css";

export default function NovoNegocioFazendaPage() {
  const router = useRouter();
  const { update } = useNegocioFlow();
  const [fazendas, setFazendas] = React.useState<Fazenda[] | null>(null);
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
      vendedorId: null,
      marchante: "",
      negocioId: null,
    });
    router.push("/negocios/novo/vendedor");
  }

  const buscaLower = busca.trim().toLowerCase();
  const filtradas = fazendas?.filter(
    (f) => buscaLower === "" || f.nome_fazenda.toLowerCase().includes(buscaLower)
  );

  return (
    <div className={cn(styles.page, "pt-safe")}>
      <BackLink href="/" />
      <h1 className={styles.title}>Cadastrar Novo Negócio</h1>
      <ProgressSteps current={1} total={4} />
      <p className={styles.subtitle}>Selecione a fazenda com a qual deseja realizar o negócio</p>

      <div className={styles.searchWrap}>
        <Search className={styles.searchIcon} size={18} />
        <input
          className={cn(styles.searchInput, "glass-panel")}
          placeholder="Buscar fazenda..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
      </div>

      {fazendas === null && !error ? (
        <div className={cn(styles.state, "glass-panel")}>Carregando fazendas...</div>
      ) : null}

      {error ? <div className={cn(styles.state, styles.stateError, "glass-panel")}>{error}</div> : null}

      {filtradas && filtradas.length === 0 ? (
        <div className={cn(styles.state, "glass-panel")}>
          {fazendas && fazendas.length > 0
            ? "Nenhuma fazenda encontrada para essa busca."
            : "Nenhuma fazenda cadastrada ainda. Cadastre uma fazenda antes de criar um negócio."}
        </div>
      ) : null}

      {filtradas && filtradas.length > 0 ? (
        <div className={styles.list}>
          {filtradas.map((fazenda) => (
            <button
              key={fazenda.fazenda_id}
              type="button"
              onClick={() => selecionar(fazenda)}
              className={cn(styles.card, "glass-panel")}
            >
              <span className={styles.cardIcon}>
                <Warehouse size={18} />
              </span>
              <div className={styles.cardInfo}>
                <p className={styles.cardName}>{fazenda.nome_fazenda}</p>
                <p className={styles.cardMeta}>
                  Município: {fazenda.municipio} · I.E.: {fazenda.inscricao_estadual}
                </p>
              </div>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
