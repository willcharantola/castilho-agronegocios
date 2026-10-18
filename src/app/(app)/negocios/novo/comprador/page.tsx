"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2, Warehouse } from "lucide-react";
import { BackLink } from "@/components/back-link";
import { ProgressSteps } from "@/components/progress-steps";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { fetchCompradores } from "@/lib/api/compradores";
import type { Comprador } from "@/lib/api/types";
import { ApiError } from "@/lib/api-client";
import { useNegocioFlow } from "@/lib/flows/negocio-flow";
import { PendenteBadge } from "@/components/offline/pendente-badge";
import { mesclarPendentes, useCompradoresPendentes, type ComPendencia } from "@/lib/offline/pendentes";
import styles from "./page.module.css";

export default function NovoNegocioCompradorPage() {
  const router = useRouter();
  const { data, update } = useNegocioFlow();
  const [compradoresServidor, setCompradores] = React.useState<Comprador[] | null>(null);
  // Inclui compradores cadastrados offline ainda não sincronizados (id negativo).
  const compradoresPendentes = useCompradoresPendentes();
  const compradores = React.useMemo(
    () => mesclarPendentes(compradoresServidor, compradoresPendentes),
    [compradoresServidor, compradoresPendentes]
  );
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!data.fazendaId) {
      router.replace("/negocios/novo");
      return;
    }
    fetchCompradores()
      .then(setCompradores)
      .catch((err: unknown) => {
        setError(err instanceof ApiError || err instanceof Error ? err.message : "Erro ao carregar.");
      });
  }, [data.fazendaId, router]);

  if (!data.fazendaId) return null;

  function selecionar(comprador: Comprador) {
    update({ compradorId: comprador.comprador_id, compradorNome: comprador.nome_empresa });
    router.push("/negocios/novo/modalidade");
  }

  return (
    <div className="page-container page-wide pt-safe">
      <BackLink href="/negocios/novo/pecuarista" />
      <h1 className={cn("page-title", styles.title)}>Cadastrar Novo Negócio</h1>
      <ProgressSteps current={3} total={6} />

      <div className="summary-card glass-dark">
        <span className="card-icon-on-dark">
          <Warehouse size={18} />
        </span>
        <p className={styles.fazendaNome}>{data.fazendaNome}</p>
      </div>

      <p className="section-title">Selecione o comprador</p>

      {compradores === null && !error ? (
        <div className="state-box glass-panel">Carregando compradores...</div>
      ) : null}

      {error && !compradores ? <div className="state-box state-error glass-panel">{error}</div> : null}

      {compradores && compradores.length === 0 ? (
        <div className="state-box glass-panel">Nenhum comprador cadastrado ainda.</div>
      ) : null}

      {compradores && compradores.length > 0 ? (
        <div className="card-list">
          {compradores.map((comprador: ComPendencia<Comprador>) => (
            <button
              key={comprador.comprador_id}
              type="button"
              onClick={() => selecionar(comprador)}
              className={cn("list-card", styles.card, "glass-dark")}
            >
              <span className="card-icon-on-dark">
                <Building2 size={18} />
              </span>
              <div className="card-info">
                <p className={styles.cardName}>{comprador.nome_empresa}</p>
                <p className="card-meta-on-dark">  {comprador.municipio}</p>
                <p className="card-meta-on-dark">Contato: {comprador.pessoa_contato}
                </p>
                {comprador.pendente ? <PendenteBadge pendente={comprador.pendente} /> : null}
              </div>
            </button>
          ))}
        </div>
      ) : null}

      {compradores ? (
        <Button
          className={styles.novoPecuaristaButton}
          variant="brand"
          render={<Link href="/compradores/novo?returnTo=/negocios/novo/comprador" />}
        >
          Cadastrar comprador
        </Button>
      ) : null}
    </div>
  );
}
