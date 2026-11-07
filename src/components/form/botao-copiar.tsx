"use client";

import { Copy } from "lucide-react";
import { useAviso } from "@/components/aviso";
import styles from "./botao-copiar.module.css";

/** Área de transferência; sem a API moderna (http fora do localhost), usa o execCommand antigo. */
async function copiarTexto(texto: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(texto);
    return;
  }
  const area = document.createElement("textarea");
  area.value = texto;
  area.setAttribute("readonly", "");
  area.style.cssText = "position:fixed;top:0;left:-9999px;opacity:0;";
  document.body.appendChild(area);
  area.select();
  const copiou = document.execCommand("copy");
  area.remove();
  if (!copiou) throw new Error("copy");
}

/**
 * Quadrado branco com o ícone de copiar, ao lado de um campo: copia o que está no campo
 * (lido pelo id, então serve para campos com máscara ou não) e mostra o aviso.
 */
export function BotaoCopiar({ alvo, rotulo }: { alvo: string; rotulo: string }) {
  const avisar = useAviso();

  async function copiar() {
    const campo = document.getElementById(alvo) as HTMLInputElement | null;
    const texto = campo?.value.trim() ?? "";
    if (!texto) {
      avisar("O campo está vazio: não há conteúdo para copiar.", "aviso");
      return;
    }
    try {
      await copiarTexto(texto);
      avisar("Conteúdo copiado.");
    } catch {
      avisar("Não foi possível copiar o conteúdo.", "aviso");
    }
  }

  return (
    <button type="button" className={styles.botao} onClick={copiar} aria-label={`Copiar ${rotulo}`} title="Copiar">
      <Copy size={18} />
    </button>
  );
}

/** Campo + botão de copiar na mesma linha; sem `alvo`, só o campo. */
export function ComCopiar({
  alvo,
  rotulo,
  children,
}: {
  alvo?: string;
  rotulo: string;
  children: React.ReactNode;
}) {
  if (!alvo) return <>{children}</>;
  return (
    <div className={styles.linha}>
      {children}
      <BotaoCopiar alvo={alvo} rotulo={rotulo} />
    </div>
  );
}
