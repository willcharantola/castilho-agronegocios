"use client";

import * as React from "react";
import { CloudOff, RefreshCw, TriangleAlert, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { EntidadeOffline } from "@/lib/offline/db";
import { usePendentes, type RegistroSalvo } from "@/lib/offline/fila";
import { contarDependentes, descartar, sincronizar, tentarNovamente } from "@/lib/offline/sync";
import { useOnlineStatus } from "@/lib/offline/use-online-status";
import { formatDate } from "@/lib/format";
import styles from "./offline.module.css";

const NOME_ENTIDADE: Record<EntidadeOffline, string> = {
  fazenda: "Fazenda",
  vendedor: "Vendedor",
  comprador: "Comprador",
  negocio: "Negócio",
  negocio_atualizacao: "Quantidade/valor por cabeça",
  gado: "Gado",
  conclusao: "Conclusão de negócio",
};

function descrever(r: RegistroSalvo): string {
  const p = r.payload;
  const e = r.exibicao ?? {};
  const detalhe =
    (p.nome_fazenda as string | undefined) ??
    (p.nome_vendedor as string | undefined) ??
    (p.nome_empresa as string | undefined) ??
    (p.denominacao as string | undefined) ??
    (r.entidade === "negocio"
      ? `${e.fazendaNome as string} · ${formatDate(p.data_negocio as string)}`
      : undefined);
  return detalhe ? `${NOME_ENTIDADE[r.entidade]}: ${detalhe}` : NOME_ENTIDADE[r.entidade];
}

/**
 * Dispara a sincronização ao abrir o app, ao voltar a conexão e ao voltar o app para
 * o primeiro plano. No iOS (Safari não tem Background Sync) é isso que garante o envio:
 * nada sincroniza com o app fechado — só ao reabri-lo com internet, ou pelo botão.
 */
function useSincronizacaoAutomatica() {
  React.useEffect(() => {
    const tentar = () => {
      if (navigator.onLine) void sincronizar();
    };
    const aoVoltarAoApp = () => {
      if (document.visibilityState === "visible") tentar();
    };
    tentar();
    window.addEventListener("online", tentar);
    document.addEventListener("visibilitychange", aoVoltarAoApp);
    return () => {
      window.removeEventListener("online", tentar);
      document.removeEventListener("visibilitychange", aoVoltarAoApp);
    };
  }, []);
}

/** Barra fixa no topo: conexão, itens na fila, "Sincronizar agora" e itens com erro. */
export function SyncStatus() {
  useSincronizacaoAutomatica();
  const online = useOnlineStatus();
  const registros = usePendentes();
  const [sincronizando, setSincronizando] = React.useState(false);
  const [verErros, setVerErros] = React.useState(false);

  const comErro = registros.filter((r) => r.status === "erro");
  const aguardando = registros.length - comErro.length;

  if (online && registros.length === 0) return null;

  async function sincronizarAgora() {
    setSincronizando(true);
    try {
      await sincronizar();
    } finally {
      setSincronizando(false);
    }
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

  let texto: string;
  if (aguardando > 0) {
    texto = `${online ? "" : "Sem conexão. "}${aguardando} cadastro(s) salvo(s) no aparelho aguardando sincronização.`;
  } else if (!online) {
    texto = "Sem conexão. Cadastros feitos agora ficam salvos no aparelho.";
  } else {
    texto = "Há cadastros que não puderam ser enviados.";
  }

  return (
    <div className={styles.bar} role="status">
      <div className={styles.barRow}>
        {online ? <CloudOff size={16} aria-hidden /> : <WifiOff size={16} aria-hidden />}
        <p className={styles.barText}>{texto}</p>
        {online && aguardando > 0 ? (
          <Button
            type="button"
            variant="brand"
            className={styles.barButton}
            onClick={sincronizarAgora}
            disabled={sincronizando}
          >
            <RefreshCw size={14} aria-hidden className={sincronizando ? styles.girando : undefined} />
            {sincronizando ? "Sincronizando..." : "Sincronizar agora"}
          </Button>
        ) : null}
      </div>

      {comErro.length > 0 ? (
        <>
          <button type="button" className={styles.erroToggle} onClick={() => setVerErros((v) => !v)}>
            <TriangleAlert size={14} aria-hidden />
            {comErro.length} cadastro(s) recusado(s) pelo servidor — {verErros ? "ocultar" : "ver motivo"}
          </button>
          {verErros ? (
            <ul className={styles.erroLista}>
              {comErro.map((r) => (
                <li key={r.id} className={styles.erroItem}>
                  <p className={styles.erroTitulo}>{descrever(r)}</p>
                  <p className={styles.erroMotivo}>{r.erroMensagem}</p>
                  <div className={styles.erroAcoes}>
                    <Button
                      type="button"
                      variant="brand"
                      className={styles.barButton}
                      disabled={!online}
                      onClick={() => void tentarNovamente(r.id)}
                    >
                      Tentar de novo
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      className={styles.barButton}
                      onClick={() => void confirmarDescarte(r)}
                    >
                      Descartar
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
