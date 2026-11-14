"use client";

import * as React from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import type { EntidadeOffline } from "@/lib/offline/db";
import { usePendentes, type RegistroSalvo } from "@/lib/offline/fila";
import { contarDependentes, descartar, tentarNovamente } from "@/lib/offline/sync";
import { useOnlineStatus } from "@/lib/offline/use-online-status";
import { formatDate, formatFazenda } from "@/lib/format";
import { cn } from "@/lib/utils";
import styles from "./notificacoes.module.css";

const NOME_ENTIDADE: Record<EntidadeOffline, string> = {
  fazenda: "Fazenda",
  pecuarista: "Pecuarista",
  comprador: "Comprador",
  negocio: "Negócio",
  negocio_atualizacao: "Alteração de negócio",
  lote: "Lote",
  lote_atualizacao: "Alteração de lote",
  gado: "Gado",
  lote_exclusao: "Exclusão de lote",
  conclusao: "Conclusão de negócio",
};

function descrever(r: RegistroSalvo): string {
  const p = r.payload;
  const e = r.exibicao ?? {};
  const detalhe =
    (typeof p.nome_fazenda === "string" ? formatFazenda(p.nome_fazenda) : undefined) ??
    (p.nome_pecuarista as string | undefined) ??
    (p.nome_empresa as string | undefined) ??
    (p.nome_lote as string | undefined) ??
    (r.entidade === "gado" && typeof p.peso_total === "number" ? `${p.peso_total} kg` : undefined) ??
    (r.entidade === "negocio"
      ? `${formatFazenda(e.fazendaNome as string)} · ${formatDate(p.data_negocio as string)}`
      : undefined);
  return detalhe ? `${NOME_ENTIDADE[r.entidade]}: ${detalhe}` : NOME_ENTIDADE[r.entidade];
}

async function confirmarDescarte(r: RegistroSalvo) {
  const dependentes = await contarDependentes(r.id);
  const aviso = dependentes
    ? `\n\n${dependentes} outro(s) cadastro(s) que dependem dele (ex.: gados do negócio) também serão descartados.`
    : "";
  if (window.confirm(`Descartar "${descrever(r)}"? Ele não será enviado ao servidor.${aviso}`)) {
    await descartar(r.id);
  }
}

/**
 * Sino de notificações (ao lado do logo na home): os cadastros que a API recusou ou que
 * ficaram incompletos ("revisao") só aparecem quando o usuário abre o sino, com o motivo,
 * "Tentar de novo" e "Descartar". O número no sino é a quantidade desses cadastros.
 */
export function Notificacoes({ className }: { className?: string }) {
  const online = useOnlineStatus();
  const registros = usePendentes();
  const [aberto, setAberto] = React.useState(false);

  // "revisao": item antigo que ficou incompleto após a mudança do modelo de dados.
  const comErro = registros.filter((r) => r.status === "erro" || r.status === "revisao");
  const rotulo = comErro.length > 0 ? `Notificações (${comErro.length})` : "Notificações";

  return (
    <>
      <button
        type="button"
        className={cn(styles.sino, className)}
        aria-label={rotulo}
        title={rotulo}
        onClick={() => setAberto(true)}
      >
        <Bell size={22} aria-hidden />
        {comErro.length > 0 ? (
          <span className={styles.contador} aria-hidden>
            {comErro.length > 9 ? "9+" : comErro.length}
          </span>
        ) : null}
      </button>

      <Dialog open={aberto} onOpenChange={setAberto} title="Notificações">
        {comErro.length === 0 ? (
          <p className={styles.vazio}>Nenhuma notificação.</p>
        ) : (
          <>
            <p className={styles.resumo}>
              {comErro.length} cadastro(s) não puderam ser sincronizados. Veja o motivo e tente de novo ou
              descarte.
            </p>
            <ul className={styles.lista}>
              {comErro.map((r) => (
                <li key={r.id} className={styles.item}>
                  <p className={styles.titulo}>{descrever(r)}</p>
                  <p className={styles.motivo}>{r.erroMensagem}</p>
                  <div className={styles.acoes}>
                    {/* Incompleto: reenviar daria o mesmo erro — só corrigir ou descartar. */}
                    {r.status === "erro" ? (
                      <Button
                        type="button"
                        variant="brand"
                        className={styles.botao}
                        disabled={!online}
                        title={online ? undefined : "Disponível apenas com internet"}
                        onClick={() => void tentarNovamente(r.id)}
                      >
                        Tentar de novo
                      </Button>
                    ) : null}
                    <Button
                      type="button"
                      variant="ghost"
                      className={cn(styles.botao, styles.botaoDescartar)}
                      onClick={() => void confirmarDescarte(r)}
                    >
                      Descartar
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </Dialog>
    </>
  );
}
