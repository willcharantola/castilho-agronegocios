"use client";

import * as React from "react";
import { Search, Warehouse } from "lucide-react";
import { FazendaForm } from "@/components/fazenda-form";
import { PendenteBadge } from "@/components/offline/pendente-badge";
import { Button } from "@/components/ui/button";
import { fetchFazendas } from "@/lib/api/fazendas";
import { ApiError } from "@/lib/api-client";
import type { CreateFazendaInput, Fazenda } from "@/lib/api/types";
import { mesclarPendentes, useFazendasPendentes, type ComPendencia } from "@/lib/offline/pendentes";
import { cn } from "@/lib/utils";
import styles from "./adicionar-fazenda.module.css";

export type FazendaEscolhida =
  | { tipo: "nova"; dados: CreateFazendaInput }
  | { tipo: "existente"; fazenda: Fazenda };

/** Busca por nome entre as fazendas já cadastradas (inclusive as ainda só no aparelho). */
function VincularFazenda({
  ignorar,
  onSelect,
}: {
  /** Fazendas já vinculadas — não aparecem na lista. */
  ignorar: number[];
  onSelect: (fazenda: Fazenda) => void;
}) {
  const [fazendasServidor, setFazendas] = React.useState<Fazenda[] | null>(null);
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

  const buscaLower = busca.trim().toLowerCase();
  const filtradas = fazendas?.filter(
    (f) => !ignorar.includes(f.fazenda_id) && (buscaLower === "" || f.nome_fazenda.toLowerCase().includes(buscaLower))
  );

  return (
    <div className={styles.vincular}>
      <div className="search-box">
        <Search className="search-icon" size={18} />
        <input
          className="search-input glass-panel"
          placeholder="Buscar fazenda pelo nome..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          autoFocus
        />
      </div>

      {fazendas === null && !error ? <div className="state-box glass-panel">Carregando fazendas...</div> : null}
      {error && !fazendas ? <div className="state-box state-error glass-panel">{error}</div> : null}
      {filtradas && filtradas.length === 0 ? (
        <div className="state-box glass-panel">Nenhuma fazenda encontrada.</div>
      ) : null}

      {filtradas && filtradas.length > 0 ? (
        <div className="card-list">
          {filtradas.map((fazenda: ComPendencia<Fazenda>) => (
            <button
              key={fazenda.fazenda_id}
              type="button"
              onClick={() => onSelect(fazenda)}
              className={cn("list-card", styles.card, "glass-panel")}
            >
              <span className="card-icon">
                <Warehouse size={18} />
              </span>
              <div className="card-info">
                <p className="card-name">{fazenda.nome_fazenda}</p>
                <p className="card-meta">
                  Município: {fazenda.municipio} · I.E.: {fazenda.inscricao_estadual}
                </p>
                {fazenda.pendente ? <PendenteBadge pendente={fazenda.pendente} /> : null}
              </div>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/**
 * Adicionar uma fazenda a um pecuarista: cadastrar uma nova ou vincular uma já
 * cadastrada (a relação é N:N — a mesma fazenda pode ter vários pecuaristas).
 */
export function AdicionarFazenda({
  ignorar = [],
  onAdd,
  onCancel,
}: {
  ignorar?: number[];
  /** Lança erro para exibi-lo no formulário. */
  onAdd: (escolha: FazendaEscolhida) => Promise<void> | void;
  onCancel?: () => void;
}) {
  const [modo, setModo] = React.useState<"nova" | "existente">("nova");
  const [erroVinculo, setErroVinculo] = React.useState<string | null>(null);

  async function vincular(fazenda: Fazenda) {
    setErroVinculo(null);
    try {
      await onAdd({ tipo: "existente", fazenda });
    } catch (err) {
      setErroVinculo(err instanceof Error ? err.message : "Erro ao vincular.");
    }
  }

  return (
    <div className={cn(styles.painel, "glass-panel")}>
      <div className={styles.abas} role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={modo === "nova"}
          className={cn(styles.aba, modo === "nova" && styles.abaAtiva)}
          onClick={() => setModo("nova")}
        >
          Cadastrar nova fazenda
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={modo === "existente"}
          className={cn(styles.aba, modo === "existente" && styles.abaAtiva)}
          onClick={() => setModo("existente")}
        >
          Vincular fazenda já cadastrada
        </button>
      </div>

      {modo === "nova" ? (
        <FazendaForm submitLabel="Adicionar fazenda" onSubmit={(dados) => onAdd({ tipo: "nova", dados })} />
      ) : (
        <>
          {erroVinculo ? <p className="form-error">{erroVinculo}</p> : null}
          <VincularFazenda ignorar={ignorar} onSelect={vincular} />
        </>
      )}

      {onCancel ? (
        <Button type="button" variant="ghost" className="w-full" onClick={onCancel}>
          Cancelar
        </Button>
      ) : null}
    </div>
  );
}
