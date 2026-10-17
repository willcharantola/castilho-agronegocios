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
import type { Pecuarista } from "@/lib/api/types";
import { FISICO_JURIDICO_LABELS } from "@/lib/labels";
import { ApiError } from "@/lib/api-client";
import { useNegocioFlow } from "@/lib/flows/negocio-flow";
import { PendenteBadge } from "@/components/offline/pendente-badge";
import { mesclarPendentes, usePecuaristasPendentes, type ComPendencia } from "@/lib/offline/pendentes";
import styles from "./page.module.css";

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

  React.useEffect(() => {
    if (!data.fazendaId) {
      router.replace("/negocios/novo");
      return;
    }
    fetchPecuaristas()
      .then(setPecuaristas)
      .catch((err: unknown) => {
        setError(err instanceof ApiError || err instanceof Error ? err.message : "Erro ao carregar.");
      });
  }, [data.fazendaId, router]);

  if (!data.fazendaId) return null;

  const daFazenda = pecuaristas?.filter((v) => v.pecuarista_fazenda?.some((a) => a.fazenda_id === data.fazendaId));

  function selecionar(pecuarista: Pecuarista) {
    update({ pecuaristaId: pecuarista.pecuarista_id, pecuaristaNome: pecuarista.nome_pecuarista });
    router.push("/negocios/novo/comprador");
  }

  return (
    <div className={cn(styles.page, "pt-safe")}>
      <BackLink href="/negocios/novo" />
      <h1 className={styles.title}>Cadastrar Novo Negócio</h1>
      <ProgressSteps current={2} total={6} />

      <div className={cn(styles.fazendaCard, "glass-dark")}>
        <span className={styles.fazendaIcon}>
          <Warehouse size={18} />
        </span>
        <p className={styles.fazendaNome}>{data.fazendaNome}</p>
      </div>

      <p className={styles.subtitle}>Pecuaristas cadastrados</p>

      {pecuaristas === null && !error ? (
        <div className={cn(styles.state, "glass-panel")}>Carregando pecuaristas...</div>
      ) : null}

      {error && !pecuaristas ? <div className={cn(styles.state, styles.stateError, "glass-panel")}>{error}</div> : null}

      {daFazenda && daFazenda.length === 0 ? (
        <div className={cn(styles.state, "glass-panel")}>
          Nenhum pecuarista cadastrado para esta fazenda ainda.
          <div>
            <Button
              className={styles.novoPecuaristaButton}
              variant="brand"
              render={
                <Link
                  href={`/pecuaristas/novo?fazenda_id=${data.fazendaId}&returnTo=/negocios/novo/pecuarista`}
                />
              }
            >
              Cadastrar pecuarista
            </Button>
          </div>
        </div>
      ) : null}

      {daFazenda && daFazenda.length > 0 ? (
        <div className={styles.list}>
          {daFazenda.map((pecuarista: ComPendencia<Pecuarista>) => (
            <button
              key={pecuarista.pecuarista_id}
              type="button"
              onClick={() => selecionar(pecuarista)}
              className={cn(styles.card, "glass-dark")}
            >
              <span className={styles.cardIcon}>
                <User size={18} />
              </span>
              <div className={styles.cardInfo}>
                <p className={styles.cardName}>{pecuarista.nome_pecuarista}</p>
                <p className={styles.cardMeta}> Pessoa: {FISICO_JURIDICO_LABELS[pecuarista.fisico_juridico]}</p>
                  
                  <p className={styles.cardMeta}> CPF/CNPJ: {pecuarista.cpf_cnpj}</p>
                {pecuarista.pendente ? <PendenteBadge pendente={pecuarista.pendente} /> : null}
              </div>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
