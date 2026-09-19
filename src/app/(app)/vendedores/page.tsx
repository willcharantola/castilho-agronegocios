"use client";

import * as React from "react";
import Link from "next/link";
import { Plus, Search, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Fab } from "@/components/fab";
import { cn } from "@/lib/utils";
import { fetchVendedores } from "@/lib/api/vendedores";
import { fetchFazendas } from "@/lib/api/fazendas";
import type { Vendedor } from "@/lib/api/types";
import { FISICO_JURIDICO_LABELS } from "@/lib/labels";
import { ApiError } from "@/lib/api-client";
import styles from "./page.module.css";

export default function VendedoresPage() {
  const [vendedores, setVendedores] = React.useState<Vendedor[] | null>(null);
  const [fazendasPorId, setFazendasPorId] = React.useState<Record<number, string>>({});
  const [error, setError] = React.useState<string | null>(null);
  const [reloadKey, setReloadKey] = React.useState(0);
  const [busca, setBusca] = React.useState("");

  React.useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVendedores(null);
    setError(null);

    Promise.all([fetchVendedores(), fetchFazendas()])
      .then(([vendedoresData, fazendasData]) => {
        if (cancelled) return;
        setVendedores(vendedoresData);
        setFazendasPorId(Object.fromEntries(fazendasData.map((f) => [f.fazenda_id, f.nome_fazenda])));
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof ApiError || err instanceof Error ? err.message : "Erro ao carregar.");
      });

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const buscaLower = busca.trim().toLowerCase();
  const filtrados = vendedores?.filter((v) => {
    if (buscaLower === "") return true;
    const fazendaNome = fazendasPorId[v.fazenda_id] ?? "";
    return (
      v.nome_vendedor.toLowerCase().includes(buscaLower) ||
      fazendaNome.toLowerCase().includes(buscaLower)
    );
  });

  return (
    <div className={cn(styles.page, "pt-safe")}>
      <h1 className={styles.title}>Vendedores Cadastrados</h1>

      <div className={styles.searchWrap}>
        <Search className={styles.searchIcon} size={18} />
        <input
          className={cn(styles.searchInput, "glass-panel")}
          placeholder="Buscar vendedor..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
      </div>

      {vendedores === null && !error ? (
        <div className={cn(styles.state, "glass-panel")}>Carregando vendedores...</div>
      ) : null}

      {error ? (
        <div className={cn(styles.state, styles.stateError, "glass-panel")}>
          {error}
          <div>
            <Button className={styles.retryButton} variant="brand" onClick={() => setReloadKey((k) => k + 1)}>
              Tentar novamente
            </Button>
          </div>
        </div>
      ) : null}

      {filtrados && filtrados.length === 0 ? (
        <div className={cn(styles.state, "glass-panel")}>
          {vendedores && vendedores.length > 0
            ? "Nenhum vendedor encontrado para essa busca."
            : "Nenhum vendedor cadastrado ainda."}
        </div>
      ) : null}

      {filtrados && filtrados.length > 0 ? (
        <div className={styles.list}>
          {filtrados.map((vendedor) => (
            <Link
              key={vendedor.vendedor_id}
              href={`/vendedores/${vendedor.vendedor_id}`}
              className={cn(styles.card, "glass-dark")}
            >
              <div className={styles.cardHeader}>
                <span className={styles.cardIcon}>
                  <User size={18} />
                </span>
                <div className={styles.cardInfo}>
                  <p className={styles.cardName}>{vendedor.nome_vendedor}</p>
                  <p className={styles.cardMeta}> Pessoa: {FISICO_JURIDICO_LABELS[vendedor.fisico_juridico]} 
                  <p className={styles.cardMeta}></p>CPF/CNPJ: {vendedor.cpf_cnpj}  </p>
                  <p className={styles.cardMeta}> Fazenda: {fazendasPorId[vendedor.fazenda_id] ?? `#${vendedor.fazenda_id}`} </p>
                </div>
              </div>
              <div className={styles.cardFooter}>
                <span>Banco: {vendedor.banco}</span>
                <span>Agência: {vendedor.agencia}</span>
                <span>Conta: {vendedor.conta}</span>
                  <span>Chave pix: {vendedor.chave_pix}</span>
              </div>
            </Link>
          ))}
        </div>
      ) : null}

      <Fab icon={Plus} label="Cadastrar vendedor" href="/vendedores/novo" />
    </div>
  );
}
