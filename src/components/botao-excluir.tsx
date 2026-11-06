"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { useAviso } from "@/components/aviso";
import { mensagemDeErro } from "@/lib/offline/rede";
import { useOnlineStatus } from "@/lib/offline/use-online-status";
import { cn } from "@/lib/utils";

/**
 * Botão de exclusão do topo das telas de detalhe (ao lado do olho da comissão). Pede
 * confirmação, chama a API e volta para `destino`; se a API recusar (ex.: 409 por haver
 * negócios), mostra o motivo num pop-up de aviso. Só funciona com internet: a exclusão
 * não entra na fila offline.
 */
export function BotaoExcluir({
  descricao,
  excluir,
  destino,
  bloqueio,
  className,
}: {
  /** Completa "Excluir …", ex.: `a fazenda "Santa Rita"`. */
  descricao: string;
  excluir: () => Promise<unknown>;
  destino: string;
  /** Motivo para o botão ficar desativado (ex.: registro ainda não sincronizado). */
  bloqueio?: string | null;
  className?: string;
}) {
  const router = useRouter();
  const avisar = useAviso();
  const online = useOnlineStatus();
  const [excluindo, setExcluindo] = React.useState(false);
  const motivo = bloqueio ?? (online ? null : "Disponível apenas com internet");
  const rotulo = excluindo ? "Excluindo..." : `Excluir ${descricao}`;

  async function handleClick() {
    if (motivo || excluindo) return;
    if (!window.confirm(`Excluir ${descricao}? Esta ação não pode ser desfeita.`)) return;
    setExcluindo(true);
    try {
      await excluir();
      router.push(destino);
    } catch (err) {
      avisar(mensagemDeErro(err, "Erro ao excluir."), "aviso");
      setExcluindo(false);
    }
  }

  return (
    <button
      type="button"
      className={cn("botao-excluir", className)}
      aria-label={rotulo}
      title={motivo ?? rotulo}
      // aria-disabled (e não disabled) para o motivo continuar visível no title.
      aria-disabled={Boolean(motivo) || excluindo}
      onClick={handleClick}
    >
      <Trash2 size={20} aria-hidden />
    </button>
  );
}
