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
import styles from "./page.module.css";

export default function NovoNegocioCompradorPage() {
  const router = useRouter();
  const { data, update } = useNegocioFlow();
  const [compradores, setCompradores] = React.useState<Comprador[] | null>(null);
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
    router.push("/negocios/novo/informacoes");
  }

  return (
    <div className={cn(styles.page, "pt-safe")}>
      <BackLink href="/negocios/novo/vendedor" />
      <h1 className={styles.title}>Cadastrar Novo Negócio</h1>
      <ProgressSteps current={3} total={5} />

      <div className={cn(styles.fazendaCard, "glass-dark")}>
        <span className={styles.fazendaIcon}>
          <Warehouse size={18} />
        </span>
        <p className={styles.fazendaNome}>{data.fazendaNome}</p>
      </div>

      <p className={styles.subtitle}>Selecione o comprador</p>

      {compradores === null && !error ? (
        <div className={cn(styles.state, "glass-panel")}>Carregando compradores...</div>
      ) : null}

      {error ? <div className={cn(styles.state, styles.stateError, "glass-panel")}>{error}</div> : null}

      {compradores && compradores.length === 0 ? (
        <div className={cn(styles.state, "glass-panel")}>Nenhum comprador cadastrado ainda.</div>
      ) : null}

      {compradores && compradores.length > 0 ? (
        <div className={styles.list}>
          {compradores.map((comprador) => (
            <button
              key={comprador.comprador_id}
              type="button"
              onClick={() => selecionar(comprador)}
              className={cn(styles.card, "glass-dark")}
            >
              <span className={styles.cardIcon}>
                <Building2 size={18} />
              </span>
              <div className={styles.cardInfo}>
                <p className={styles.cardName}>{comprador.nome_empresa}</p>
                <p className={styles.cardMeta}>CNPJ: {comprador.cnpj}</p>
                <p className={styles.cardMeta}>
                  {comprador.municipio} · Contato: {comprador.pessoa_contato}
                </p>
              </div>
            </button>
          ))}
        </div>
      ) : null}

      {compradores ? (
        <Button
          className={styles.novoVendedorButton}
          variant="brand"
          render={<Link href="/compradores/novo?returnTo=/negocios/novo/comprador" />}
        >
          Cadastrar comprador
        </Button>
      ) : null}
    </div>
  );
}
