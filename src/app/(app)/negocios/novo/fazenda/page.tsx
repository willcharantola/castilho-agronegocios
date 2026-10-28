"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { User, Warehouse } from "lucide-react";
import { BackLink } from "@/components/back-link";
import { ProgressSteps } from "@/components/progress-steps";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { fetchPecuaristas } from "@/lib/api/pecuaristas";
import type { Fazenda, Pecuarista } from "@/lib/api/types";
import { ApiError } from "@/lib/api-client";
import { useNegocioFlow } from "@/lib/flows/negocio-flow";
import { ehIdTemporario } from "@/lib/offline/fila";
import { PendenteBadge } from "@/components/offline/pendente-badge";
import { mesclarPendentes, usePecuaristasPendentes, type ComPendencia } from "@/lib/offline/pendentes";
import styles from "./page.module.css";

/**
 * Passo 2: só as fazendas vinculadas ao pecuarista escolhido (o banco recusa um negócio
 * com fazenda de outro pecuarista). Os vínculos vêm da lista de pecuaristas, que fica
 * salva no aparelho — a tela funciona offline.
 */
export default function NovoNegocioFazendaPage() {
  const router = useRouter();
  const { data, update } = useNegocioFlow();
  const [pecuaristasServidor, setPecuaristas] = React.useState<Pecuarista[] | null>(null);
  const pecuaristasPendentes = usePecuaristasPendentes();
  const pecuaristas = React.useMemo(
    () => mesclarPendentes(pecuaristasServidor, pecuaristasPendentes),
    [pecuaristasServidor, pecuaristasPendentes]
  );
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!data.pecuaristaId) {
      router.replace("/negocios/novo");
      return;
    }
    fetchPecuaristas()
      .then(setPecuaristas)
      .catch((err: unknown) => {
        setError(err instanceof ApiError || err instanceof Error ? err.message : "Erro ao carregar.");
      });
  }, [data.pecuaristaId, router]);

  if (!data.pecuaristaId) return null;

  const pecuarista = pecuaristas?.find((p) => p.pecuarista_id === data.pecuaristaId);
  const fazendas: ComPendencia<Fazenda>[] | undefined = pecuaristas
    ? (pecuarista?.pecuarista_fazenda ?? []).map((v) => v.fazenda as ComPendencia<Fazenda>)
    : undefined;

  function selecionar(fazenda: Fazenda) {
    update({ fazendaId: fazenda.fazenda_id, fazendaNome: fazenda.nome_fazenda, negocioId: null });
    router.push("/negocios/novo/comprador");
  }

  return (
    <div className="page-container page-wide pt-safe">
      <BackLink href="/negocios/novo" />
      <h1 className={cn("page-title", styles.title)}>Cadastrar Novo Negócio</h1>
      <ProgressSteps current={2} total={7} />

      <div className="summary-card glass-dark">
        <span className="card-icon-on-dark">
          <User size={18} />
        </span>
        <p className={styles.fazendaNome}>{data.pecuaristaNome}</p>
      </div>

      <p className="section-title">Fazendas do pecuarista</p>

      {pecuaristas === null && !error ? <div className="state-box glass-panel">Carregando fazendas...</div> : null}

      {error && !pecuaristas ? <div className="state-box state-error glass-panel">{error}</div> : null}

      {fazendas && fazendas.length === 0 ? (
        <div className="state-box glass-panel">
          Nenhuma fazenda vinculada a este pecuarista.
          {/* Pecuarista ainda só no aparelho não tem tela de edição. */}
          {!ehIdTemporario(data.pecuaristaId) ? (
            <div>
              <Button
                className={styles.novaFazendaButton}
                variant="brand"
                render={<Link href={`/pecuaristas/${data.pecuaristaId}/fazendas/nova?returnTo=/negocios/novo/fazenda`} />}
              >
                Adicionar fazenda
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}

      {fazendas && fazendas.length > 0 ? (
        <div className="card-list">
          {fazendas.map((fazenda) => (
            <button
              key={fazenda.fazenda_id}
              type="button"
              onClick={() => selecionar(fazenda)}
              className={cn("list-card", styles.card, "glass-panel")}
            >
              <span className="card-icon">
                {fazenda.marca_url ? (
                  <img src={fazenda.marca_url} alt={fazenda.nome_fazenda} className={styles.cardImage} />
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
