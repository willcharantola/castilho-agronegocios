"use client";

import * as React from "react";
import Link from "next/link";
import { Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fetchMinhasPesagens } from "@/lib/api/negocios";
import type { ItemMinhasPesagens } from "@/lib/api/types";
import { formatDate, formatFazenda } from "@/lib/format";
import { MODALIDADE_LABELS, TIPO_GADO_LABELS } from "@/lib/labels";
import { useVersaoSincronizacao } from "@/lib/offline/fila";
import { mensagemDeErro } from "@/lib/offline/rede";
import { cn } from "@/lib/utils";
import styles from "./pesagens.module.css";

/**
 * "Minhas pesagens": negócios liberados ("Público") para o usuário responsável. A API só
 * devolve a visão reduzida (sem comprador, valores nem comissão).
 */
export default function MinhasPesagensPage() {
  const [itens, setItens] = React.useState<ItemMinhasPesagens[] | null>(null);
  const [erro, setErro] = React.useState<string | null>(null);
  const [recarregar, setRecarregar] = React.useState(0);
  const versaoSincronizacao = useVersaoSincronizacao();

  React.useEffect(() => {
    let cancelado = false;
    fetchMinhasPesagens()
      .then((dados) => {
        if (cancelado) return;
        setItens(dados);
        setErro(null);
      })
      .catch((err: unknown) => {
        if (!cancelado) setErro(mensagemDeErro(err, "Erro ao carregar as pesagens."));
      });
    return () => {
      cancelado = true;
    };
  }, [recarregar, versaoSincronizacao]);

  return (
    <div className={cn("page-container page-wide", styles.page, "pt-safe")}>
      <h1 className="page-title">Minhas pesagens</h1>

      {itens === null && !erro ? <div className="state-box glass-panel">Carregando pesagens...</div> : null}

      {erro && !itens ? (
        <div className="state-box state-error glass-panel">
          {erro}
          <div>
            <Button className="retry-button" variant="brand" onClick={() => setRecarregar((k) => k + 1)}>
              Tentar novamente
            </Button>
          </div>
        </div>
      ) : null}

      {itens && itens.length === 0 ? (
        <div className="state-box glass-panel">Nenhum negócio liberado para você.</div>
      ) : null}

      {itens && itens.length > 0 ? (
        <div className="card-list">
          {itens.map((item) => (
            <Link key={item.negocio_id} href={`/pesagens/${item.negocio_id}`} className="list-card glass-panel">
              <span className="card-icon">
                <Scale size={18} />
              </span>
              <div className="card-info">
                <p className="card-name">{formatFazenda(item.nome_fazenda)}</p>
                <p className="card-meta">Pecuarista: {item.nome_pecuarista}</p>
                <p className="card-meta">Data: {formatDate(item.data_negocio)}</p>
                <p className="card-meta">
                  {MODALIDADE_LABELS[item.modalidade]} · {TIPO_GADO_LABELS[item.tipo_gado]}
                </p>
                <p className="card-meta">
                  {item.modalidade === "cabeca"
                    ? `${item.qtd_animais} cabeça(s), sem pesagem individual`
                    : `${item.gados_pesados} cabeça(s) pesada(s)`}
                </p>
              </div>
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
