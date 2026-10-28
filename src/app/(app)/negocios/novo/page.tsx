"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, User } from "lucide-react";
import { BackLink } from "@/components/back-link";
import { ProgressSteps } from "@/components/progress-steps";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { fetchPecuaristas } from "@/lib/api/pecuaristas";
import type { Pecuarista } from "@/lib/api/types";
import { FISICO_JURIDICO_LABELS } from "@/lib/labels";
import { ApiError } from "@/lib/api-client";
import { useNegocioFlow } from "@/lib/flows/negocio-flow";
import { PendenteBadge } from "@/components/offline/pendente-badge";
import { mesclarPendentes, usePecuaristasPendentes, type ComPendencia } from "@/lib/offline/pendentes";
import styles from "./page.module.css";

/** Passo 1: pecuarista. A lista de fazendas do passo seguinte é a dele. */
export default function NovoNegocioPecuaristaPage() {
  const router = useRouter();
  const { data, update } = useNegocioFlow();
  const [pecuaristasServidor, setPecuaristas] = React.useState<Pecuarista[] | null>(null);
  // Inclui pecuaristas cadastrados offline ainda não sincronizados (id negativo).
  const pecuaristasPendentes = usePecuaristasPendentes();
  const pecuaristas = React.useMemo(
    () => mesclarPendentes(pecuaristasServidor, pecuaristasPendentes),
    [pecuaristasServidor, pecuaristasPendentes]
  );
  const [error, setError] = React.useState<string | null>(null);
  const [busca, setBusca] = React.useState("");

  React.useEffect(() => {
    fetchPecuaristas()
      .then(setPecuaristas)
      .catch((err: unknown) => {
        setError(err instanceof ApiError || err instanceof Error ? err.message : "Erro ao carregar.");
      });
  }, []);

  function selecionar(pecuarista: Pecuarista) {
    update({
      pecuaristaId: pecuarista.pecuarista_id,
      pecuaristaNome: pecuarista.nome_pecuarista,
      // Outro pecuarista → a fazenda escolhida antes pode não ser dele.
      ...(pecuarista.pecuarista_id !== data.pecuaristaId ? { fazendaId: null, fazendaNome: "" } : {}),
      negocioId: null,
    });
    router.push("/negocios/novo/fazenda");
  }

  const buscaLower = busca.trim().toLowerCase();
  const filtrados = pecuaristas?.filter(
    (p) => buscaLower === "" || p.nome_pecuarista.toLowerCase().includes(buscaLower)
  );

  return (
    <div className="page-container page-wide pt-safe">
      <BackLink href="/" />
      <h1 className={cn("page-title", styles.title)}>Cadastrar Novo Negócio</h1>
      <ProgressSteps current={1} total={7} />

      <div className="search-box">
        <Search className="search-icon" size={18} />
        <input
          className="search-input glass-panel"
          placeholder="Buscar pecuarista..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
      </div>

      {pecuaristas === null && !error ? (
        <div className="state-box glass-panel">Carregando pecuaristas...</div>
      ) : null}

      {error && !pecuaristas ? <div className="state-box state-error glass-panel">{error}</div> : null}

      {filtrados && filtrados.length === 0 ? (
        <div className="state-box glass-panel">
          {pecuaristas && pecuaristas.length > 0
            ? "Nenhum pecuarista encontrado para essa busca."
            : "Nenhum pecuarista cadastrado ainda."}
        </div>
      ) : null}

      {filtrados && filtrados.length > 0 ? (
        <div className="card-list">
          {filtrados.map((pecuarista: ComPendencia<Pecuarista>) => (
            <button
              key={pecuarista.pecuarista_id}
              type="button"
              onClick={() => selecionar(pecuarista)}
              className={cn("list-card", styles.card, "glass-dark")}
            >
              <span className="card-icon-on-dark">
                <User size={18} />
              </span>
              <div className="card-info">
                <p className={styles.cardName}>{pecuarista.nome_pecuarista}</p>
                <p className="card-meta-on-dark">Pessoa: {FISICO_JURIDICO_LABELS[pecuarista.fisico_juridico]}</p>
                <p className="card-meta-on-dark">CPF/CNPJ: {pecuarista.cpf_cnpj}</p>
                {pecuarista.pendente ? <PendenteBadge pendente={pecuarista.pendente} /> : null}
              </div>
            </button>
          ))}
        </div>
      ) : null}

      {pecuaristas ? (
        <Button
          className={styles.novoPecuaristaButton}
          variant="brand"
          render={<Link href="/pecuaristas/novo?returnTo=/negocios/novo" />}
        >
          Cadastrar pecuarista
        </Button>
      ) : null}
    </div>
  );
}
