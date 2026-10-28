"use client";

import * as React from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { User } from "lucide-react";
import { AdicionarFazenda, type FazendaEscolhida } from "@/components/adicionar-fazenda";
import { BackLink } from "@/components/back-link";
import { adicionarFazenda, fetchPecuarista } from "@/lib/api/pecuaristas";
import type { Pecuarista } from "@/lib/api/types";
import { ApiError } from "@/lib/api-client";
import { ehIdTemporario } from "@/lib/offline/fila";
import { mensagemDeErro } from "@/lib/offline/rede";

/**
 * "Adicionar fazenda" de um pecuarista já cadastrado: cria uma fazenda nova já vinculada
 * a ele, ou vincula uma existente. Precisa de conexão (a fazenda nova nasce no servidor).
 */
export default function AdicionarFazendaPecuaristaPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const voltarPara = searchParams.get("returnTo") ?? `/pecuaristas/${params.id}`;
  const [pecuarista, setPecuarista] = React.useState<Pecuarista | null>(null);
  const [loadError, setLoadError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    fetchPecuarista(params.id)
      .then((dados) => {
        if (!cancelled) setPecuarista(dados);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setLoadError(err instanceof ApiError || err instanceof Error ? mensagemDeErro(err) : "Erro ao carregar.");
      });
    return () => {
      cancelled = true;
    };
  }, [params.id]);

  async function adicionar(escolha: FazendaEscolhida) {
    if (escolha.tipo === "existente" && ehIdTemporario(escolha.fazenda.fazenda_id)) {
      throw new Error("Esta fazenda ainda não foi sincronizada. Tente de novo depois da sincronização.");
    }
    await adicionarFazenda(
      params.id,
      escolha.tipo === "nova" ? escolha.dados : { fazenda_id: escolha.fazenda.fazenda_id }
    );
    router.push(voltarPara);
  }

  return (
    <div className="page-container page-narrow pt-safe">
      <BackLink href={voltarPara} />
      <h1 className="page-title">Adicionar Fazenda</h1>

      {!pecuarista && !loadError ? <div className="state-box glass-panel">Carregando pecuarista...</div> : null}
      {loadError ? <div className="state-box state-error glass-panel">{loadError}</div> : null}

      {pecuarista ? (
        <>
          <div className="summary-card glass-dark">
            <span className="card-icon-on-dark">
              <User size={18} />
            </span>
            <p>
              <b>{pecuarista.nome_pecuarista}</b>
            </p>
          </div>
          <AdicionarFazenda
            ignorar={(pecuarista.pecuarista_fazenda ?? []).map((v) => v.fazenda_id)}
            onAdd={async (escolha) => {
              try {
                await adicionar(escolha);
              } catch (err) {
                throw new Error(mensagemDeErro(err));
              }
            }}
          />
        </>
      ) : null}
    </div>
  );
}
