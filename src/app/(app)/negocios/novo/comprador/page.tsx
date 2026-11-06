"use client";

import { formatFazenda } from "@/lib/format";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2, Search, User, Warehouse } from "lucide-react";
import { BackLink } from "@/components/back-link";
import { ProgressSteps } from "@/components/progress-steps";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { fetchCompradores } from "@/lib/api/compradores";
import { fetchPecuaristas } from "@/lib/api/pecuaristas";
import type { Comprador, Pecuarista, TipoComprador } from "@/lib/api/types";
import { ApiError } from "@/lib/api-client";
import { TIPO_COMPRADOR_LABELS } from "@/lib/labels";
import { PASSOS_NOVO_NEGOCIO, useNegocioFlow } from "@/lib/flows/negocio-flow";
import { PendenteBadge } from "@/components/offline/pendente-badge";
import {
  mesclarPendentes,
  useCompradoresPendentes,
  usePecuaristasPendentes,
  type InfoPendente,
} from "@/lib/offline/pendentes";
import styles from "./page.module.css";

/** Item do seletor: frigorífico ou pecuarista, no mesmo formato. */
type Opcao = {
  tipo: TipoComprador;
  id: number;
  nome: string;
  detalhe: string;
  pendente?: InfoPendente;
};

const deFrigorifico = (c: Comprador & { pendente?: InfoPendente }): Opcao => ({
  tipo: "frigorifico",
  id: c.comprador_id,
  nome: c.nome_empresa,
  detalhe: [c.municipio, c.inscricao_estadual && `I.E.: ${c.inscricao_estadual}`].filter(Boolean).join(" · "),
  pendente: c.pendente,
});

const dePecuarista = (p: Pecuarista & { pendente?: InfoPendente }): Opcao => ({
  tipo: "pecuarista",
  id: p.pecuarista_id,
  nome: p.nome_pecuarista,
  detalhe: p.cpf_cnpj ? `CPF/CNPJ: ${p.cpf_cnpj}` : "",
  pendente: p.pendente,
});

/**
 * Comprador do negócio: um único seletor, com busca, de frigoríficos e pecuaristas (cada
 * um com o rótulo da origem). Inclui os cadastros feitos offline ainda não sincronizados.
 * O pecuarista que vende não pode ser o comprador: aparece desabilitado.
 */
export default function NovoNegocioCompradorPage() {
  const router = useRouter();
  const { data, update } = useNegocioFlow();
  const [compradoresServidor, setCompradores] = React.useState<Comprador[] | null>(null);
  const [pecuaristasServidor, setPecuaristas] = React.useState<Pecuarista[] | null>(null);
  const compradoresPendentes = useCompradoresPendentes();
  const pecuaristasPendentes = usePecuaristasPendentes();
  const [error, setError] = React.useState<string | null>(null);
  const [busca, setBusca] = React.useState("");

  React.useEffect(() => {
    if (!data.pecuaristaId || !data.fazendaId) {
      router.replace(data.pecuaristaId ? "/negocios/novo/fazenda" : "/negocios/novo");
      return;
    }
    fetchCompradores()
      .then(setCompradores)
      .catch((err: unknown) => {
        setError(err instanceof ApiError || err instanceof Error ? err.message : "Erro ao carregar.");
      });
    // Sem a lista de pecuaristas, a tela continua só com os frigoríficos.
    fetchPecuaristas()
      .then(setPecuaristas)
      .catch(() => setPecuaristas([]));
  }, [data.pecuaristaId, data.fazendaId, router]);

  const opcoes = React.useMemo<Opcao[] | null>(() => {
    const frigorificos = mesclarPendentes(compradoresServidor, compradoresPendentes);
    if (!frigorificos) return null;
    const pecuaristas = mesclarPendentes(pecuaristasServidor, pecuaristasPendentes) ?? [];
    return [...frigorificos.map(deFrigorifico), ...pecuaristas.map(dePecuarista)].sort((a, b) =>
      a.nome.localeCompare(b.nome, "pt-BR")
    );
  }, [compradoresServidor, compradoresPendentes, pecuaristasServidor, pecuaristasPendentes]);

  const termo = busca.trim().toLowerCase();
  const visiveis = opcoes?.filter(
    (o) => !termo || o.nome.toLowerCase().includes(termo) || o.detalhe.toLowerCase().includes(termo)
  );

  if (!data.fazendaId) return null;

  const ehVendedor = (o: Opcao) => o.tipo === "pecuarista" && o.id === data.pecuaristaId;

  function selecionar(opcao: Opcao) {
    if (ehVendedor(opcao)) return;
    update({ compradorId: opcao.id, compradorNome: opcao.nome, compradorTipo: opcao.tipo });
    router.push("/negocios/novo/modalidade");
  }

  return (
    <div className="page-container page-wide pt-safe">
      <BackLink href="/negocios/novo/fazenda" />
      <h1 className={cn("page-title", styles.title)}>Cadastrar Novo Negócio</h1>
      <ProgressSteps current={3} total={PASSOS_NOVO_NEGOCIO} />

      <div className="summary-card glass-dark">
        <span className="card-icon-on-dark">
          <Warehouse size={18} />
        </span>
        <p className={styles.fazendaNome}>{formatFazenda(data.fazendaNome)}</p>
      </div>

      <p className="section-title">Selecione o comprador</p>

      <label className={cn(styles.busca, "glass-panel")}>
        <Search size={16} aria-hidden />
        <input
          type="search"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar frigorífico ou pecuarista..."
          aria-label="Buscar comprador"
        />
      </label>

      {opcoes === null && !error ? <div className="state-box glass-panel">Carregando compradores...</div> : null}

      {error && !opcoes ? <div className="state-box state-error glass-panel">{error}</div> : null}

      {visiveis && visiveis.length === 0 ? (
        <div className="state-box glass-panel">
          {termo ? "Nenhum comprador encontrado." : "Nenhum comprador cadastrado ainda."}
        </div>
      ) : null}

      {visiveis && visiveis.length > 0 ? (
        <div className="card-list">
          {visiveis.map((opcao) => {
            const vendedor = ehVendedor(opcao);
            const Icone = opcao.tipo === "frigorifico" ? Building2 : User;
            return (
              <button
                key={`${opcao.tipo}-${opcao.id}`}
                type="button"
                onClick={() => selecionar(opcao)}
                disabled={vendedor}
                className={cn("list-card", styles.card, "glass-dark", vendedor && styles.cardDesabilitado)}
              >
                <span className="card-icon-on-dark">
                  <Icone size={18} />
                </span>
                <div className="card-info">
                  <p className={styles.cardName}>{opcao.nome}</p>
                  {opcao.detalhe ? <p className="card-meta-on-dark">{opcao.detalhe}</p> : null}
                  {vendedor ? <p className="card-meta-on-dark">É o vendedor deste negócio</p> : null}
                  {opcao.pendente ? <PendenteBadge pendente={opcao.pendente} /> : null}
                </div>
                <span className={styles.rotulo}>{TIPO_COMPRADOR_LABELS[opcao.tipo]}</span>
              </button>
            );
          })}
        </div>
      ) : null}

      {opcoes ? (
        <Button
          className={styles.novoPecuaristaButton}
          variant="brand"
          render={<Link href="/compradores/novo?returnTo=/negocios/novo/comprador" />}
        >
          Cadastrar novo frigorífico
        </Button>
      ) : null}
    </div>
  );
}
