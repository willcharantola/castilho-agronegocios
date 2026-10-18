"use client";

import * as React from "react";
import Link from "next/link";
import { Plus, Search, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Fab } from "@/components/fab";
import { cn } from "@/lib/utils";
import { fetchPecuaristas } from "@/lib/api/pecuaristas";
import type { Pecuarista } from "@/lib/api/types";
import { FISICO_JURIDICO_LABELS } from "@/lib/labels";
import { ApiError } from "@/lib/api-client";
import { PendenteBadge } from "@/components/offline/pendente-badge";
import { useVersaoSincronizacao } from "@/lib/offline/fila";
import { mesclarPendentes, usePecuaristasPendentes } from "@/lib/offline/pendentes";
import styles from "./page.module.css";

function nomesDasFazendas(pecuarista: Pecuarista) {
  return (pecuarista.pecuarista_fazenda ?? []).map((a) => a.fazenda.nome_fazenda).join(", ");
}

export default function PecuaristasPage() {
  const [pecuaristasServidor, setPecuaristas] = React.useState<Pecuarista[] | null>(null);
  // Cadastros feitos offline aparecem no topo, marcados como pendentes de sincronização.
  const pecuaristasPendentes = usePecuaristasPendentes();
  const pecuaristas = React.useMemo(
    () => mesclarPendentes(pecuaristasServidor, pecuaristasPendentes),
    [pecuaristasServidor, pecuaristasPendentes]
  );
  const versaoSincronizacao = useVersaoSincronizacao();
  const [error, setError] = React.useState<string | null>(null);
  const [reloadKey, setReloadKey] = React.useState(0);
  const [busca, setBusca] = React.useState("");

  React.useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPecuaristas(null);
    setError(null);

    fetchPecuaristas()
      .then((pecuaristasData) => {
        if (cancelled) return;
        setPecuaristas(pecuaristasData);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof ApiError || err instanceof Error ? err.message : "Erro ao carregar.");
      });

    return () => {
      cancelled = true;
    };
  }, [reloadKey, versaoSincronizacao]);

  const buscaLower = busca.trim().toLowerCase();
  const filtrados = pecuaristas?.filter((v) => {
    if (buscaLower === "") return true;
    return (
      v.nome_pecuarista.toLowerCase().includes(buscaLower) ||
      nomesDasFazendas(v).toLowerCase().includes(buscaLower)
    );
  });

  return (
    <div className={cn("page-container page-wide", styles.page, "pt-safe")}>
      <h1 className="page-title">Pecuaristas Cadastrados</h1>

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

      {error && !pecuaristas ? (
        <div className="state-box state-error glass-panel">
          {error}
          <div>
            <Button className="retry-button" variant="brand" onClick={() => setReloadKey((k) => k + 1)}>
              Tentar novamente
            </Button>
          </div>
        </div>
      ) : null}

      {filtrados && filtrados.length === 0 ? (
        <div className="state-box glass-panel">
          {pecuaristas && pecuaristas.length > 0
            ? "Nenhum pecuarista encontrado para essa busca."
            : "Nenhum pecuarista cadastrado ainda."}
        </div>
      ) : null}

      {filtrados && filtrados.length > 0 ? (
        <div className="card-list">
          {filtrados.map((pecuarista) => (
            <Link
              key={pecuarista.pecuarista_id}
              href={`/pecuaristas/${pecuarista.pecuarista_id}`}
              // Pendente: ainda não existe no servidor, então não há tela de edição para abrir.
              aria-disabled={pecuarista.pendente ? true : undefined}
              onClick={pecuarista.pendente ? (e) => e.preventDefault() : undefined}
              className={cn(styles.card, "glass-dark")}
            >
              <div className="card-header">
                <span className="card-icon-on-dark">
                  <User size={18} />
                </span>
                <div className="card-info">
                  <p className={styles.cardName}>{pecuarista.nome_pecuarista}</p>
                  <p className="card-meta-on-dark"> Pessoa: {FISICO_JURIDICO_LABELS[pecuarista.fisico_juridico]} 
                  <p className="card-meta-on-dark"></p>CPF/CNPJ: {pecuarista.cpf_cnpj}  </p>
                  <p className="card-meta-on-dark"> Fazendas: {nomesDasFazendas(pecuarista) || "—"} </p>
                  {pecuarista.pendente ? <PendenteBadge pendente={pecuarista.pendente} /> : null}
                </div>
              </div>
              <div className={styles.cardFooter}>
                <span>Banco: {pecuarista.banco}</span>
                <span>Agência: {pecuarista.agencia}</span>
                <span>Conta: {pecuarista.conta}</span>
                  <span>Chave pix: {pecuarista.chave_pix}</span>
              </div>
            </Link>
          ))}
        </div>
      ) : null}

      <Fab icon={Plus} label="Cadastrar pecuarista" href="/pecuaristas/novo" />
    </div>
  );
}
