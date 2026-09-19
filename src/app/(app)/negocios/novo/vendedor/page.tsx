"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { User, Warehouse } from "lucide-react";
import { BackLink } from "@/components/back-link";
import { ProgressSteps } from "@/components/progress-steps";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { fetchVendedores } from "@/lib/api/vendedores";
import type { Vendedor } from "@/lib/api/types";
import { FISICO_JURIDICO_LABELS } from "@/lib/labels";
import { ApiError } from "@/lib/api-client";
import { useNegocioFlow } from "@/lib/flows/negocio-flow";
import styles from "./page.module.css";

export default function NovoNegocioVendedorPage() {
  const router = useRouter();
  const { data, update } = useNegocioFlow();
  const [vendedores, setVendedores] = React.useState<Vendedor[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!data.fazendaId) {
      router.replace("/negocios/novo");
      return;
    }
    fetchVendedores()
      .then(setVendedores)
      .catch((err: unknown) => {
        setError(err instanceof ApiError || err instanceof Error ? err.message : "Erro ao carregar.");
      });
  }, [data.fazendaId, router]);

  if (!data.fazendaId) return null;

  const daFazenda = vendedores?.filter((v) => v.fazenda_id === data.fazendaId);

  function selecionar(vendedor: Vendedor) {
    update({ vendedorId: vendedor.vendedor_id, marchante: vendedor.nome_vendedor });
    router.push("/negocios/novo/informacoes");
  }

  return (
    <div className={cn(styles.page, "pt-safe")}>
      <BackLink href="/negocios/novo" />
      <h1 className={styles.title}>Cadastrar Novo Negócio</h1>
      <ProgressSteps current={2} total={4} />

      <div className={cn(styles.fazendaCard, "glass-dark")}>
        <span className={styles.fazendaIcon}>
          <Warehouse size={18} />
        </span>
        <p className={styles.fazendaNome}>{data.fazendaNome}</p>
      </div>

      <p className={styles.subtitle}>Vendedores cadastrados</p>

      {vendedores === null && !error ? (
        <div className={cn(styles.state, "glass-panel")}>Carregando vendedores...</div>
      ) : null}

      {error ? <div className={cn(styles.state, styles.stateError, "glass-panel")}>{error}</div> : null}

      {daFazenda && daFazenda.length === 0 ? (
        <div className={cn(styles.state, "glass-panel")}>
          Nenhum vendedor cadastrado para esta fazenda ainda.
          <div>
            <Button
              className={styles.novoVendedorButton}
              variant="brand"
              render={
                <Link
                  href={`/vendedores/novo?fazenda_id=${data.fazendaId}&returnTo=/negocios/novo/vendedor`}
                />
              }
            >
              Cadastrar vendedor
            </Button>
          </div>
        </div>
      ) : null}

      {daFazenda && daFazenda.length > 0 ? (
        <div className={styles.list}>
          {daFazenda.map((vendedor) => (
            <button
              key={vendedor.vendedor_id}
              type="button"
              onClick={() => selecionar(vendedor)}
              className={cn(styles.card, "glass-dark")}
            >
              <span className={styles.cardIcon}>
                <User size={18} />
              </span>
              <div className={styles.cardInfo}>
                <p className={styles.cardName}>{vendedor.nome_vendedor}</p>
                <p className={styles.cardMeta}> Pessoa: {FISICO_JURIDICO_LABELS[vendedor.fisico_juridico]}</p>
                  
                  <p className={styles.cardMeta}> CPF/CNPJ: {vendedor.cpf_cnpj}</p>
              </div>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
