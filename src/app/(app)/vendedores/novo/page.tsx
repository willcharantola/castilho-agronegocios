"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, Warehouse } from "lucide-react";
import { BackLink } from "@/components/back-link";
import { cn } from "@/lib/utils";
import { fetchFazendas } from "@/lib/api/fazendas";
import type { Fazenda } from "@/lib/api/types";
import { ApiError } from "@/lib/api-client";
import { useVendedorFlow } from "@/lib/flows/vendedor-flow";
import styles from "./page.module.css";

export default function NovoVendedorFazendaPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { update } = useVendedorFlow();
  const [fazendas, setFazendas] = React.useState<Fazenda[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [busca, setBusca] = React.useState("");

  const fazendaIdParam = searchParams.get("fazenda_id");
  const returnToParam = searchParams.get("returnTo");

  React.useEffect(() => {
    fetchFazendas()
      .then((list) => {
        setFazendas(list);
        if (fazendaIdParam) {
          const preselecionada = list.find((f) => f.fazenda_id === Number(fazendaIdParam));
          if (preselecionada) {
            update({
              fazendaId: preselecionada.fazenda_id,
              fazendaNome: preselecionada.nome_fazenda,
              returnTo: returnToParam,
            });
            router.replace("/vendedores/novo/dados");
          }
        }
      })
      .catch((err: unknown) => {
        setError(err instanceof ApiError || err instanceof Error ? err.message : "Erro ao carregar.");
      });
    // Roda só uma vez ao montar — os params vêm da URL de entrada.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function selecionar(fazenda: Fazenda) {
    update({ fazendaId: fazenda.fazenda_id, fazendaNome: fazenda.nome_fazenda, returnTo: returnToParam });
    router.push("/vendedores/novo/dados");
  }

  const buscaLower = busca.trim().toLowerCase();
  const filtradas = fazendas?.filter(
    (f) => buscaLower === "" || f.nome_fazenda.toLowerCase().includes(buscaLower)
  );

  return (
    <div className={cn(styles.page, "pt-safe")}>
      <BackLink href="/vendedores" />
      <h1 className={styles.title}>Cadastrar Novo Vendedor</h1>
      <p className={styles.subtitle}>Selecione a fazenda a qual o vendedor pertence</p>

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
            : "Nenhuma fazenda cadastrada ainda. Cadastre uma fazenda antes de adicionar um vendedor."}
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
